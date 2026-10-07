'use strict';
var ansi = require('./ansi.js');
function isWide(cp) {
  return (cp >= 0x1100 && cp <= 0x115f) || (cp >= 0x2e80 && cp <= 0xa4cf) ||
         (cp >= 0xac00 && cp <= 0xd7a3) || (cp >= 0xf900 && cp <= 0xfaff) ||
         (cp >= 0xfe30 && cp <= 0xfe4f) || (cp >= 0xff00 && cp <= 0xff60) ||
         (cp >= 0xffe0 && cp <= 0xffe6) || (cp >= 0x20000 && cp <= 0x3fffd);
}
function cw(cp) { return (cp >= 0x1f300 && cp <= 0x1faff) ? 2 : (isWide(cp) ? 2 : 1); }
function strWidth(s) {
  var w = 0;
  for (var i = 0; i < s.length; i++) {
    var cp = s.codePointAt(i);
    if (cp > 0xffff) i++;
    w += cw(cp);
  }
  return w;
}
function Screen(out) { this.out = out; this.w = 0; this.h = 0; this.buf = []; this.prev = []; }
Screen.prototype.resize = function (w, h) {
  if (w === this.w && h === this.h) return;
  this.w = w; this.h = h;
  var n = w * h; this.buf = new Array(n); this.prev = new Array(n);
  for (var i = 0; i < n; i++) {
    this.buf[i] = { c: ' ', fg: null, bg: null, b: false, skip: false };
    this.prev[i] = { c: '\u0000', fg: null, bg: null, b: false };
  }
};
Screen.prototype.clear = function (fg, bg) {
  for (var i = 0; i < this.buf.length; i++) {
    var c = this.buf[i]; c.c = ' '; c.fg = fg || null; c.bg = bg || null; c.b = false; c.skip = false;
  }
};
Screen.prototype.put = function (x, y, ch, fg, bg, bold) {
  if (x < 0 || y < 0 || x >= this.w || y >= this.h) return;
  var c = this.buf[y * this.w + x];
  c.c = ch; c.fg = fg || null; c.bg = bg || null; c.b = !!bold; c.skip = false;
};
Screen.prototype.text = function (x, y, str, fg, bg, bold) {
  var cx = x;
  for (var k = 0; k < String(str).length; k++) {
    var cp = String(str).codePointAt(k);
    if (cp > 0xffff) k++;
    var w = cw(cp);
    this.put(cx, y, String.fromCodePoint(cp), fg, bg, bold);
    if (w === 2 && cx + 1 < this.w) {
      var c = this.buf[y * this.w + cx + 1];
      c.c = ''; c.skip = true; c.fg = fg || null; c.bg = bg || null;
    }
    cx += w;
  }
  return cx;
};
Screen.prototype.fill = function (x, y, w, h, ch, fg, bg) {
  for (var yy = 0; yy < h; yy++) for (var xx = 0; xx < w; xx++) this.put(x + xx, y + yy, ch, fg, bg, false);
};
Screen.prototype.hline = function (x, y, len, ch, fg, bg) { for (var i = 0; i < len; i++) this.put(x + i, y, ch, fg, bg, false); };
Screen.prototype.vline = function (x, y, len, ch, fg, bg) { for (var i = 0; i < len; i++) this.put(x, y + i, ch, fg, bg, false); };
Screen.prototype.box = function (x, y, w, h, fg, bg) {
  if (w < 2 || h < 2) return;
  this.put(x, y, '\u250c', fg, bg); this.put(x + w - 1, y, '\u2510', fg, bg);
  this.put(x, y + h - 1, '\u2514', fg, bg); this.put(x + w - 1, y + h - 1, '\u2518', fg, bg);
  this.hline(x + 1, y, w - 2, '\u2500', fg, bg); this.hline(x + 1, y + h - 1, w - 2, '\u2500', fg, bg);
  this.vline(x, y + 1, h - 2, '\u2502', fg, bg); this.vline(x + w - 1, y + 1, h - 2, '\u2502', fg, bg);
};
Screen.prototype.bar = function (x, y, w, pct, fgA, fgB, bgc) {
  var filled = Math.max(0, Math.min(w, Math.round(w * pct)));
  for (var i = 0; i < w; i++) {
    var col = i < filled ? mix(fgA, fgB, filled <= 1 ? 0 : i / (filled - 1)) : bgc;
    this.put(x + i, y, i < filled ? '\u2501' : '\u2500', col, null, false);
  }
};
function mix(a, b, t) {
  t = Math.max(0, Math.min(1, t));
  return [Math.round(a[0] + (b[0] - a[0]) * t), Math.round(a[1] + (b[1] - a[1]) * t), Math.round(a[2] + (b[2] - a[2]) * t)];
}
Screen.prototype.render = function () {
  var o = '', cf = null, cb = null, cbold = null, cxp = -1, cyp = -1, i, y, x;
  for (y = 0; y < this.h; y++) {
    for (x = 0; x < this.w; x++) {
      i = y * this.w + x;
      var c = this.buf[i], p = this.prev[i];
      if (c.skip) { p.c = '\u0001'; p.fg = null; p.bg = null; p.b = false; continue; }
      if (c.c === p.c && c.fg === p.fg && c.bg === p.bg && c.b === p.b) continue;
      if (y !== cyp || x !== cxp) { o += '\u001b[' + (y + 1) + ';' + (x + 1) + 'H'; cxp = x; cyp = y; }
      if (c.fg !== cf || c.bg !== cb || c.b !== cbold) {
        o += '\u001b[0m';
        if (c.b) o += '\u001b[1m';
        o += ansi.fg(c.fg) + ansi.bg(c.bg);
        cf = c.fg; cb = c.bg; cbold = c.b;
      }
      o += c.c;
      var w = c.c ? cw(c.c.codePointAt(0)) : 1;
      cxp += w;
      p.c = c.c; p.fg = c.fg; p.bg = c.bg; p.b = c.b;
    }
  }
  if (o) this.out.write(o);
};
module.exports = { Screen: Screen, strWidth: strWidth, cw: cw };
