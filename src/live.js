'use strict';
/* opc-tui: live Gateway bridge — 配置发现 + 连接（与 simple.js 同源逻辑） */
var fs = require('fs'), os = require('os'), path = require('path');

function openclawConfigPath(){
  if (process.env.OPENCLAW_CONFIG_PATH) return process.env.OPENCLAW_CONFIG_PATH;
  var dirs = [];
  if (process.env.OPENCLAW_STATE_DIR) dirs.push(process.env.OPENCLAW_STATE_DIR);
  try {
    var local = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.opc-tui.json'), 'utf8'));
    if (local && local.configPath) return local.configPath;
    if (local && local.stateDir) dirs.unshift(local.stateDir);
  } catch(e){}
  dirs.push(path.join(os.homedir(), '.openclaw'));
  dirs.push(path.join(os.homedir(), 'AppData', 'Roaming', 'openclaw'));
  for (var i=0;i<dirs.length;i++){
    var p = path.join(dirs[i], 'openclaw.json');
    try { if (fs.existsSync(p)) return p; } catch(e){}
  }
  return path.join(os.homedir(), '.openclaw', 'openclaw.json');
}

function readGwCfg(){
  try {
    var f = openclawConfigPath();
    var d = JSON.parse(fs.readFileSync(f, 'utf8'));
    var g = d.gateway || {};
    var tok = (g.auth && (g.auth.token || g.auth.password)) || null;
    if (!tok) return null;
    return { port: g.port || 18789, token: tok, config: f };
  } catch(e){ return null; }
}

/* 连接并在 hello 握手完成后 resolve，避免“还没连上就发请求” */
function connect(opts){
  opts = opts || {};
  return new Promise(function(resolve, reject){
    var cfg = readGwCfg();
    if (!cfg){ reject(new Error('no gateway token - openclaw.json not found')); return; }
    import('./gw.mjs').then(function(mod){
      var settled = false;
      var to = setTimeout(function(){ if (!settled){ settled = true; reject(new Error('gateway connect timeout')); } }, 12000);
      var gw = mod.createGw({
        url: 'ws://127.0.0.1:' + cfg.port,
        token: cfg.token,
        onHello: function(h){
          if (opts.onHello) opts.onHello(h);
          if (!settled){ settled = true; clearTimeout(to); resolve({ gw: gw, cfg: cfg, hello: h }); }
        },
        onError: function(m){ if (opts.onError) opts.onError(m); },
        onEvent: function(ev){ if (opts.onEvent) opts.onEvent(ev); }
      });
    }).catch(reject);
  });
}

module.exports = { openclawConfigPath: openclawConfigPath, readGwCfg: readGwCfg, connect: connect };
