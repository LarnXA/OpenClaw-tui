'use strict';

/*
 * opc-tui <-> OocTui (VS Code extension) bridge
 *
 * 目标：把 opc-tui 生成的内容实时流式推进 VS Code 当前打开的文件。
 * 本文件完全独立，不改动 opc-tui 的渲染/宽度逻辑；所有失败都只返回错误串，绝不抛异常。
 *
 * 连接信息发现：读 %TEMP%\ooc-tui.json（VS Code 扩展 OocTui 激活后写入）
 *   { "host":"127.0.0.1", "port":39789, "token":"...", "pid":..., "updatedAt":... }
 * 可用环境变量 OPC_VSCODE_FILE 覆盖该路径。
 *
 * 只连接 127.0.0.1。无第三方依赖。
 */

var fs = require('fs');
var os = require('os');
var path = require('path');
var http = require('http');
var crypto = require('crypto');

var WS_GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
var HOST = '127.0.0.1';
var CONNECT_TIMEOUT = 2500;
var MAX_CONNECT_ATTEMPTS = 2;   // 重连上限：首次 + 最多 1 次重试，之后放弃（绝不无限重试）

function discoverFile() {
  return process.env.OPC_VSCODE_FILE || path.join(os.tmpdir(), 'ooc-tui.json');
}

// 读取发现文件；不可用返回 null（永不抛）
function discover() {
  try {
    var f = discoverFile();
    if (!fs.existsSync(f)) return null;
    var d = JSON.parse(fs.readFileSync(f, 'utf8'));
    if (!d || typeof d.port !== 'number' || d.port <= 0 || typeof d.token !== 'string' || !d.token) return null;
    return { host: HOST, port: d.port, token: d.token, pid: d.pid, file: f, raw: d };
  } catch (e) {
    return null;
  }
}

function httpGet(info, pathname) {
  return new Promise(function (resolve) {
    var done = false;
    function fin(v) { if (!done) { done = true; resolve(v); } }
    var req;
    try {
      req = http.request({
        host: HOST, port: info.port, path: pathname, method: 'GET',
        headers: { 'Authorization': 'Bearer ' + info.token }
      }, function (res) {
        var ch = [];
        res.on('data', function (c) { ch.push(c); });
        res.on('end', function () {
          var txt = Buffer.concat(ch).toString('utf8');
          var j = null;
          try { j = JSON.parse(txt); } catch (e) {}
          fin({ status: res.statusCode, json: j, text: txt });
        });
      });
    } catch (e) { fin({ status: 0, error: String(e && e.message || e) }); return; }
    req.on('error', function (e) { fin({ status: 0, error: e.code || String(e && e.message || e) }); });
    req.setTimeout(CONNECT_TIMEOUT, function () { try { req.destroy(); } catch (e) {} fin({ status: 0, error: 'timeout' }); });
    req.end();
  });
}

// 探测：返回人类可读状态串（永不抛）
function probe() {
  return new Promise(function (resolve) {
    var info = discover();
    if (!info) { resolve({ ok: false, error: 'no_discovery_file', detail: '未找到 ' + discoverFile() }); return; }
    httpGet(info, '/status').then(function (r) {
      if (r.status === 401) { resolve({ ok: false, error: 'unauthorized', detail: 'token 已失效，请在 VS Code 运行 “OocTui: 显示连接信息” 刷新' }); return; }
      if (r.status !== 200) { resolve({ ok: false, error: r.error || ('http_' + r.status), detail: r.error || ('HTTP ' + r.status) }); return; }
      resolve({ ok: true, info: info, status: r.json });
    });
  });
}

// ------------------------------------------------------------ WebSocket

function connect(info) {
  return new Promise(function (resolve) {
    var key = crypto.randomBytes(16).toString('base64');
    var req;
    try {
      req = http.request({
        host: HOST, port: info.port,
        path: '/stream?token=' + encodeURIComponent(info.token),
        headers: {
          'Connection': 'Upgrade', 'Upgrade': 'websocket',
          'Sec-WebSocket-Key': key, 'Sec-WebSocket-Version': '13'
        }
      });
    } catch (e) { resolve({ error: String(e && e.message || e) }); return; }
    req.on('upgrade', function (res, socket) {
      var expect = crypto.createHash('sha1').update(key + WS_GUID).digest('base64');
      if (res.headers['sec-websocket-accept'] !== expect) { try { socket.destroy(); } catch (e) {} resolve({ error: 'bad_accept' }); return; }
      socket.setNoDelay(true);
      resolve({ socket: socket });
    });
    req.on('response', function (res) {
      resolve({ error: res.statusCode === 401 ? 'unauthorized' : ('http_' + res.statusCode) });
    });
    req.on('error', function (e) { resolve({ error: e.code || String(e && e.message || e) }); });
    req.setTimeout(CONNECT_TIMEOUT, function () { try { req.destroy(); } catch (e) {} resolve({ error: 'timeout' }); });
    req.end();
  });
}

// 带重连上限的连接
function connectWithRetry(info) {
  var attempt = 0;
  function step() {
    attempt++;
    return connect(info).then(function (c) {
      if (c.socket) return c;
      if (attempt >= MAX_CONNECT_ATTEMPTS) return c;
      return new Promise(function (r) { setTimeout(r, 200); }).then(step);
    });
  }
  return step();
}

function sendText(socket, str) {
  var payload = Buffer.from(str, 'utf8');
  var len = payload.length;
  var mask = crypto.randomBytes(4);
  var h;
  if (len < 126) { h = Buffer.alloc(2); h[0] = 0x81; h[1] = 0x80 | len; }
  else if (len < 65536) { h = Buffer.alloc(4); h[0] = 0x81; h[1] = 0x80 | 126; h.writeUInt16BE(len, 2); }
  else { h = Buffer.alloc(10); h[0] = 0x81; h[1] = 0x80 | 127; h.writeBigUInt64BE(BigInt(len), 2); }
  var m = Buffer.allocUnsafe(len);
  for (var i = 0; i < len; i++) m[i] = payload[i] ^ mask[i % 4];
  socket.write(Buffer.concat([h, mask, m]));
}

function makeReader(socket) {
  var buf = Buffer.alloc(0);
  var listeners = [];
  function emit(m) { for (var i = 0; i < listeners.length; i++) { try { listeners[i](m); } catch (e) {} } }
  socket.on('data', function (chunk) {
    buf = Buffer.concat([buf, chunk]);
    for (;;) {
      if (buf.length < 2) break;
      var b1 = buf[1];
      var op = buf[0] & 0x0f;
      var len = b1 & 0x7f;
      var off = 2;
      if (len === 126) { if (buf.length < 4) break; len = buf.readUInt16BE(2); off = 4; }
      else if (len === 127) { if (buf.length < 10) break; len = Number(buf.readBigUInt64BE(2)); off = 10; }
      if ((b1 & 0x80) !== 0) { if (buf.length < off + 4) break; off += 4; }
      if (buf.length < off + len) break;
      var d = buf.subarray(off, off + len);
      buf = buf.subarray(off + len);
      if (op === 0x1) { var m = null; try { m = JSON.parse(d.toString('utf8')); } catch (e) {} if (m) emit(m); }
      else if (op === 0x8) { emit({ type: '__close' }); return; }
    }
  });
  socket.on('close', function () { emit({ type: '__close' }); });
  socket.on('error', function (e) { emit({ type: '__error', error: e.message }); });
  return {
    on: function (fn) { listeners.push(fn); },
    wait: function (type, ms) {
      return new Promise(function (resolve) {
        var timer = setTimeout(function () { off2(); resolve(null); }, ms || 8000);
        function off2() { clearTimeout(timer); var i = listeners.indexOf(fn); if (i > -1) listeners.splice(i, 1); }
        function fn(m) {
          if (m.type === type) { off2(); resolve(m); }
          else if (m.type === '__error') { off2(); resolve(null); }
        }
        listeners.push(fn);
      });
    }
  };
}

// 一次性推送：begin(可选 clear) -> 逐块 delta -> end
// 返回 { ok, error, version, chars }
function pushText(text, opts) {
  opts = opts || {};
  var chunk = opts.chunk > 0 ? opts.chunk : 24;
  var delay = opts.delay >= 0 ? opts.delay : 18;
  var s = String(text === undefined || text === null ? '' : text);
  return new Promise(function (resolve) {
    var info = discover();
    if (!info) { resolve({ ok: false, error: 'no_discovery_file' }); return; }
    connectWithRetry(info).then(function (c) {
      if (!c.socket) { resolve({ ok: false, error: c.error || 'connect_failed' }); return; }
      var socket = c.socket;
      var rd = makeReader(socket);
      sendText(socket, JSON.stringify({ type: 'begin', clear: !!opts.clear }));
      rd.wait('begin-ack', 4000).then(function (ack) {
        if (!ack) { try { socket.destroy(); } catch (e) {} resolve({ ok: false, error: 'no_begin_ack' }); return; }
        var parts = [];
        for (var i = 0; i < s.length; i += chunk) parts.push(s.slice(i, i + chunk));
        var idx = 0;
        function step() {
          if (idx >= parts.length) {
            sendText(socket, JSON.stringify({ type: 'end' }));
            rd.wait('end', 6000).then(function (end) {
              try { socket.destroy(); } catch (e) {}
              if (!end || end.ok === false) { resolve({ ok: false, error: 'no_end_ack' }); return; }
              resolve({ ok: true, version: end.version, chars: s.length, pos: end.pos });
            });
            return;
          }
          sendText(socket, JSON.stringify({ type: 'delta', text: parts[idx] }));
          idx++;
          if (delay > 0) setTimeout(step, delay); else setImmediate(step);
        }
        step();
      });
    });
  });
}

// 会话式流：turn 里持续写入（不等待 ack，TCP 保序）
function StreamSession(info) {
  this.info = info;
  this.socket = null;
  this.error = '';
  this.ready = false;
  this.sent = 0;
  this.ended = false;
}
StreamSession.prototype.start = function (clear) {
  var self = this;
  return connectWithRetry(this.info).then(function (c) {
    if (!c.socket) { self.error = c.error || 'connect_failed'; return false; }
    self.socket = c.socket;
    self.ready = true;
    makeReader(self.socket);
    sendText(self.socket, JSON.stringify({ type: 'begin', clear: !!clear }));
    return true;
  });
};
StreamSession.prototype.write = function (text) {
  if (this.ended || !this.socket) return false;
  var s = String(text === undefined || text === null ? '' : text);
  if (!s) return true;
  try { sendText(this.socket, JSON.stringify({ type: 'delta', text: s })); this.sent += s.length; return true; }
  catch (e) { this.error = String(e && e.message || e); return false; }
};
StreamSession.prototype.end = function () {
  if (this.ended) return false;
  this.ended = true;
  if (!this.socket) return false;
  try { sendText(this.socket, JSON.stringify({ type: 'end' })); } catch (e) {}
  var sk = this.socket;
  setTimeout(function () { try { sk.destroy(); } catch (e) {} }, 150);
  return true;
};

// 把错误码翻译成人话
function humanError(code) {
  if (!code) return '未知错误';
  if (code === 'no_discovery_file') return '未找到连接信息文件（VS Code 里没装/没启用 OocTui 扩展？）';
  if (code === 'unauthorized') return 'token 失效，请在 VS Code 运行 “OocTui: 显示连接信息” 后重试';
  if (code === 'ECONNREFUSED') return 'VS Code 未运行或 OocTui 服务未监听';
  if (code === 'timeout') return '连接超时';
  return String(code);
}

module.exports = {
  discoverFile: discoverFile,
  discover: discover,
  probe: probe,
  pushText: pushText,
  StreamSession: StreamSession,
  humanError: humanError
};
