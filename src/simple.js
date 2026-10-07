'use strict';
var ansi = require('./ansi.js');
var scr = require('./screen.js');
var fs = require('fs');
var os = require('os');
var path = require('path');
var cp = require('child_process');
var readline = require('readline');
var vsc = require('./vscode.js');

var VERSION = '1.7.0';
var RED = [255,77,77], RED_D = [150,36,36], TEXT = [217,222,234], MUTED = [124,134,153];
var USER = [255,223,128], THINK = [170,178,194], WHITE = [255,255,255];
var NOCOL = !!process.env.NO_COLOR;
var PADX = 2;
function col(c,s){ return NOCOL ? s : (ansi.fg(c)+s+'\u001b[0m'); }
function colB(c,s){ return NOCOL ? s : ('\u001b[1m'+ansi.fg(c)+s+'\u001b[0m'); }
function mix(a,b,t){ t=Math.max(0,Math.min(1,t)); return [Math.round(a[0]+(b[0]-a[0])*t),Math.round(a[1]+(b[1]-a[1])*t),Math.round(a[2]+(b[2]-a[2])*t)]; }
function grp(n){ var s=String(n),o='',c=0; for(var i=s.length-1;i>=0;i--){ o=s[i]+o; if(++c%3===0&&i>0) o=','+o; } return o; }
function hex8(){ var s='',h='0123456789abcdef'; for(var i=0;i<8;i++) s+=h[Math.floor(Math.random()*16)]; return s; }
function gitBranch(){ try{ var s=cp.execSync('git rev-parse --abbrev-ref HEAD',{cwd:process.cwd(),stdio:['ignore','pipe','ignore'],timeout:1500}).toString().trim(); return s||'\u2014'; }catch(e){ return '\u2014'; } }
function padW(s,n){ var w=scr.strWidth(s); if(w>=n) return s; return s+new Array(n-w+1).join(' '); }
function truncW(s,n){ var o='',w=0; for(var i=0;i<s.length;i++){ var c=s.codePointAt(i),k=scr.cw(c); if(w+k>n) break; o+=String.fromCodePoint(c); w+=k; } return o; }
function padL(n){ return new Array(n+1).join(' '); }
function wrapText(s, width){
  var res=[], line='', w=0, parts=String(s).replace(/\r/g,'').split('\n');
  for (var p=0;p<parts.length;p++){
    var t=parts[p]; line=''; w=0;
    if (!t.length){ res.push(''); continue; }
    for (var i=0;i<t.length;i++){
      var c=t.codePointAt(i), k=scr.cw(c), ch=String.fromCodePoint(c);
      if (w+k>width){ res.push(line); line=''; w=0; }
      line+=ch; w+=k;
    }
    res.push(line);
  }
  return res;
}
function stripAnsi(s){
  return String(s)
    .replace(/\u001b\][^\u0007\u001b]*(\u0007|\u001b\\)/g, '')
    .replace(/\u001b\[[0-9;?]*[ -\/]*[@-~]/g, '')
    .replace(/\u001b[()][A-Za-z0-9]/g, '')
    .replace(/\u001b[=>]/g, '')
    .replace(/\r/g, '');
}
function insertText(txt){
  var s = stripAnsi(txt).replace(/\n/g, ' ');
  buf = buf.slice(0,cur) + s + buf.slice(cur);
  cur += s.length;
}
function clip(){
  try { return cp.execSync('powershell -NoProfile -Command Get-Clipboard', { timeout: 2500, windowsHide: true }).toString(); }
  catch(e){ return ''; }
}

var LOBSTER = [
' \u2022\u25cf\u25cf:.        .:\u25cf\u25cf\u2022',
':\u25cf\u25cf\u25cf\u25cf:        :\u25cf\u25cf\u25cf\u25cf:',
'.\u25cf\u25cf\u25cf\u25cf:.:\u2022\u25cf\u25cf\u2022:.:\u25cf\u25cf\u25cf\u25cf.',
' .\u25cf\u25cf\u25cf: \u2022\u25cf\u25cf\u25cf\u25cf\u2022 :\u25cf\u25cf\u25cf.',
' ..:\u2022\u2022\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u2022\u2022:..',
'.::\u2022\u2022\u2022\u2022\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf\u2022\u2022\u2022\u2022::.',
' . .:  \u2022\u25cf\u25cf\u25cf\u25cf\u2022  :. .',
'    .  :\u25cf\u25cf\u25cf\u25cf:  .',
'      .\u25cf\u25cf\u25cf\u25cf\u25cf\u25cf.',
'       :\u2022\u2022\u2022\u2022:'
];
var TITLE = [
'\u2588\u2580\u2580\u2580\u2588 \u2588\u2580\u2580\u2580\u2588 \u2588\u2580\u2580\u2580\u2580 \u2588\u2584  \u2588 \u2588\u2580\u2580\u2580\u2580 \u2588     \u2588\u2580\u2580\u2580\u2588 \u2588   \u2588',
'\u2588   \u2588 \u2588\u2580\u2580\u2580\u2580 \u2588\u2580\u2580\u2580  \u2588 \u2580\u2584\u2588 \u2588     \u2588     \u2588\u2580\u2580\u2580\u2588 \u2588\u2584\u2580\u2584\u2588',
'\u2580\u2580\u2580\u2580\u2580 \u2580     \u2580\u2580\u2580\u2580\u2580 \u2580   \u2580 \u2580\u2580\u2580\u2580\u2580 \u2580\u2580\u2580\u2580\u2580 \u2580   \u2580 \u2580   \u2580'
];
function blockW(a){ var m=0,i; for(i=0;i<a.length;i++) if(a[i].length>m) m=a[i].length; return m; }
var LOBW = blockW(LOBSTER), TITW = blockW(TITLE);
function shineColor(x,total,t){ var b=mix(RED_D,RED,total>1?x/(total-1):0); var d=Math.abs(((x+t)%36)-18)/18; return mix(b,[255,140,140],Math.max(0,1-d)*0.85); }
function Grid(w,h){ this.w=w; this.h=h; this.c=new Array(w*h); }
Grid.prototype.set=function(x,y,ch,co){ if(x<0||y<0||x>=this.w||y>=this.h||ch===' ')return; this.c[y*this.w+x]={ch:ch,co:co}; };
Grid.prototype.str=function(x,y,s,co){ for(var i=0;i<s.length;i++) this.set(x+i,y,s.charAt(i),co); };
Grid.prototype.line=function(y){ var last=-1,x; for(x=0;x<this.w;x++) if(this.c[y*this.w+x]) last=x; if(last<0) return ''; var o='',cf=null; for(x=0;x<=last;x++){ var q=this.c[y*this.w+x],ch=q?q.ch:' ',co=q?q.co:MUTED; if(co!==cf){ o+=ansi.fg(co); cf=co; } o+=ch; } return o+'\u001b[0m'; };

var STR = {
 zh: { hint1:'\u63d0\u793a\uff1a/ \u547d\u4ee4 \u00b7 @ \u6587\u4ef6 \u00b7 \u76f4\u63a5\u8f93\u5165\u5373\u53d1\u7ed9 OpenClaw',
       hint2:'Ctrl+P \u5c55\u5f00 \u00b7 Ctrl+R \u641c\u5386\u53f2 \u00b7 Ctrl+L \u6e05\u5c4f \u00b7 Ctrl+C \u9000\u51fa',
       ctx:'\u4e0a\u4e0b\u6587', tps:'TPS', cache:'\u7f13\u5b58', cost:'\u8d39\u7528', tokens:'token',
       items:'\u9879', pick:'\u9009\u62e9\u5f00\u5c4f\u52a8\u753b', wake:'\u70b9\u51fb\u5c0f\u9f99\u867e\u5524\u9192', search:'\u641c\u7d22\u5386\u53f2',
       thinking:'\u6b63\u5728\u5904\u7406\u2026', conn:'\u5df2\u8fde\u63a5 OpenClaw', err:'\u8fde\u63a5\u5931\u8d25',
       thinkFold:'思考过程（Ctrl+P 展开）', thinkHead:'▾ 思考过程', done:'完成', out:'输出中…',
       anims:['\u9010\u884c\u6d6e\u73b0','\u626b\u63cf\u64e6\u9664','\u547c\u5438\u8109\u51b2'] },
 en: { hint1:'Hint: / commands \u00b7 @ files \u00b7 type to send to OpenClaw',
       hint2:'Ctrl+P expand \u00b7 Ctrl+R search \u00b7 Ctrl+L clear \u00b7 Ctrl+C quit',
       ctx:'ctx', tps:'TPS', cache:'cache', cost:'cost', tokens:'tokens',
       items:'items', pick:'pick boot animation', wake:'click the lobster to wake', search:'search history',
       thinking:'working\u2026', conn:'connected to OpenClaw', err:'connection failed',
       thinkFold:'thinking (Ctrl+P expand)', thinkHead:'▾ thinking', done:'done', out:'streaming…',
       anims:['reveal','wipe','pulse'] }
};
var CMDS = [
 { c:'/new', zh:'\u65b0\u5f00\u4f1a\u8bdd', en:'new session' },
 { c:'/clear', zh:'\u6e05\u5c4f', en:'clear screen' },
 { c:'/session', zh:'\u67e5\u770b/\u5207\u6362\u4f1a\u8bdd key', en:'show/set session key' },
 { c:'/model', zh:'\u67e5\u770b/\u5207\u6362\u6a21\u578b', en:'model hot-swap' },
 { c:'/status', zh:'\u8fd0\u884c\u72b6\u6001', en:'status' },
 { c:'/lang', zh:'\u5207\u6362\u4e2d/\u82f1\u754c\u9762', en:'switch zh/en UI' },
 { c:'/export', zh:'\u5bfc\u51fa\u4f1a\u8bdd', en:'export session' },
 { c:'/vscode', zh:'VS Code \u8054\u52a8 on/off', en:'VS Code bridge on/off' },
 { c:'/push', zh:'\u63a8\u9001\u6587\u672c\u5230 VS Code \u5f53\u524d\u6587\u4ef6', en:'push text to VS Code file' },
 { c:'/help', zh:'\u663e\u793a\u5e2e\u52a9', en:'help' },
 { c:'/quit', zh:'\u9000\u51fa', en:'quit' }
];
function t(k){ return STR[S.lang][k]; }
function cmdDesc(o){ return S.lang==='zh'?o.zh:o.en; }
function openclawCli(){
  var cands = [
    path.join(os.homedir(),'AppData','Roaming','npm','node_modules','openclaw','openclaw.mjs'),
    '/usr/local/lib/node_modules/openclaw/openclaw.mjs',
    path.join(os.homedir(),'.npm-global','lib','node_modules','openclaw','openclaw.mjs')
  ];
  for (var i=0;i<cands.length;i++){ try { if (fs.existsSync(cands[i])) return cands[i]; } catch(e){} }
  return null;
}
/* 定位本机 OpenClaw 配置（可分享版）
 * 查找顺序：OPENCLAW_CONFIG_PATH > OPENCLAW_STATE_DIR > ~/.opc-tui.json 里的 configPath/stateDir
 *           > ~/.openclaw > %APPDATA%\openclaw */
function openclawConfigPath(){
  if (process.env.OPENCLAW_CONFIG_PATH) { return process.env.OPENCLAW_CONFIG_PATH; }
  var dirs = [];
  if (process.env.OPENCLAW_STATE_DIR) { dirs.push(process.env.OPENCLAW_STATE_DIR); }
  try {
    var local = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.opc-tui.json'), 'utf8'));
    if (local && local.configPath) { return local.configPath; }
    if (local && local.stateDir) { dirs.unshift(local.stateDir); }
  } catch(e){}
  dirs.push(path.join(os.homedir(), '.openclaw'));
  dirs.push(path.join(os.homedir(), 'AppData', 'Roaming', 'openclaw'));
  for (var i=0;i<dirs.length;i++){
    var p = path.join(dirs[i], 'openclaw.json');
    try { if (fs.existsSync(p)) { return p; } } catch(e){}
  }
  return path.join(os.homedir(), '.openclaw', 'openclaw.json');
}
function ctxWindowGuess(){
  try {
    var f = openclawConfigPath();
    var d = JSON.parse(fs.readFileSync(f, 'utf8'));
    var prim = ((((d.agents||{}).defaults||{}).model||{}).primary) || '';
    var i0 = prim.indexOf('/');
    if (i0 < 0) return 32768;
    var prov = prim.slice(0,i0), mid = prim.slice(i0+1);
    var list = ((((d.models||{}).providers||{})[prov]||{}).models) || [];
    for (var i=0;i<list.length;i++){
      var m = list[i] || {};
      if ((m.id===mid || m.name===mid || m.model===mid) && m.contextWindow) return m.contextWindow;
    }
  } catch(e){}
  return 32768;
}

var S = { lang:'zh', model:'deepseek-v4-pro', mode:'max', tokens:0, cost:0.00, cache:87,
  ctxPct:0, ctxTokens:0, ctxWindow:ctxWindowGuess(), tps:0, git:gitBranch(), session:hex8(),
  agent:'main', cwd:process.cwd(),
  sessionKey: process.env.OPC_SESSION_KEY || 'agent:main:main', anim:2, splash:false, frozen:false,
  conn:'?', t0:0, think:'', collapseThink:false, cmds:null, liveIn:0, liveOut:0,
  reason:'', answerText:'', autoThink:true, streamWait:false, streamRun:null, waitT0:0,
  toolName:'', toolPhase:'', toolOk:true, doneIcon:'', doneText:'',
  sendMode:(process.env.OPC_SEND !== 'chat'), thinkModel:process.env.OPC_THINK_MODEL || process.env.OPC_MODEL || 'deepseek/deepseek-v4-flash', ansItem:'', thinkN:0, assN:0, model0:'', modelLock:false,
  vscode:(process.env.OPC_VSCODE === '1'), vsSess:null, vsSent:0, vsPending:'', vsNotice:false };

var buf='', cur=0, hist=[], hi=-1, prevPop=0, menuSel=0, bannerOn=true, animT=0, nlCount=0, bannerBase=0, bannerH=0;
var mode='input', searchQ='', searchHit=-1, files=[], wakeT=0, busy=false, spin=0, answerBuf='', busyTimer=null, pasteMode=false, pasteBuf='';
var prevRegionH = 0, prevIdx = 0, cprPending = false, lastCols = 0, liveTimer = null, resizeTimer = null, suspend = false;
var mouseOn = false, curRow = 0, popupTopAbs = 0, popupWinStart = 0, popupLen = 0, popWasOpen = false;
function setMouse(on){
  if (on === mouseOn) return;
  mouseOn = on;
  try { out(on ? '\u001b[?1000h\u001b[?1006h\u001b[?1003h' : '\u001b[?1003l\u001b[?1006l\u001b[?1000l'); } catch(e){}
}
function mdInline(s){
  s = String(s);
  var re = /(\*\*[^*]+\*\*)|(\x60[^\x60]+\x60)|(\[[^\]]+\]\([^)]+\))|(https?:\/\/[^\s)\]]+)|(\/[A-Za-z][A-Za-z0-9._-]{1,})|([A-Za-z]:\\\\[^\s]+)/g;
  var o = '', last = 0, m;
  while ((m = re.exec(s))){
    o += col(TEXT, s.slice(last, m.index));
    if (m[1]) o += styled(WHITE, m[1].slice(2,-2), false, true);
    else if (m[2]) o += styled(CODE_C, m[2].slice(1,-1), false, false);
    else if (m[3]){ var t = m[3].match(/^\[([^\]]+)\]\(([^)]+)\)$/); o += styled(LINK_C, t[1], true, false); }
    else if (m[4]) o += styled(LINK_C, m[4], true, false);
    else if (m[5]) o += styled(CMD_C, m[5], false, true);
    else if (m[6]) o += styled(PATH_C, m[6], false, false);
    last = re.lastIndex;
  }
  o += col(TEXT, s.slice(last));
  return o;
}
function mdLine(s){
  s = String(s);
  var h = s.match(/^(#{1,6})\s+(.*)$/);
  if (h) return styled(WHITE, h[2], false, true);
  if (/^\s*([-*_])\1{2,}\s*$/.test(s)) return col(MUTED, '\u2500'.repeat(Math.min(boxW(), 60)));
  var b = s.match(/^(\s*)[-*+]\s+(.*)$/);
  if (b) return col(MUTED, b[1] + '\u2022 ') + mdInline(b[2]);
  var n = s.match(/^(\s*)(\d+)[.)]\s+(.*)$/);
  if (n) return col(MUTED, n[1] + n[2] + '. ') + mdInline(n[3]);
  var q = s.match(/^\s*>\s?(.*)$/);
  if (q) return col(MUTED, '\u2502 ' + q[1]);
  return mdInline(s);
}
var HIST = [];
function pushHist(t, c){ HIST.push({ t:String(t), c:c }); if (HIST.length > 80) HIST.shift(); }
var DBG = path.join(os.tmpdir(), 'opc-tui-debug.log');
function dbg(o){ try { fs.appendFileSync(DBG, new Date().toISOString()+'  '+o+'\n'); } catch(e){} }
function out(s){ var q=String(s), m=q.match(/\n/g); if(m) nlCount+=m.length; process.stdout.write(q); }
var MAXW = parseInt(process.env.OPC_MAX_WIDTH || '0', 10) || 0;
function colsW(){ return process.stdout.columns || 80; }
function termW(){ var avail = Math.max(34, colsW() - PADX*2); if (MAXW && avail > MAXW) avail = MAXW; return avail; }
function boxW(){ return termW(); }
var LINK_C=[86,156,214], CMD_C=[255,200,120], CODE_C=[150,220,150], PATH_C=[170,200,255];
function styled(c, s, ul, b){
  if (NOCOL) return s;
  return (b?'\u001b[1m':'') + (ul?'\u001b[4m':'') + ansi.fg(c) + s + '\u001b[0m';
}
function sepLine(){ return padL(PADX) + col(MUTED, '\u2500'.repeat(boxW())); }
function hiLine(s){
  s = String(s);
  var re = /(https?:\/\/[^\s)\]]+)|(\x60[^\x60]+\x60)|(\/[A-Za-z][A-Za-z0-9._-]{1,})|([A-Za-z]:\\\\[^\s]+)/g;
  var o = '', last = 0, m;
  while ((m = re.exec(s))){
    o += col(TEXT, s.slice(last, m.index));
    if (m[1]) o += styled(LINK_C, m[1], true, false);
    else if (m[2]) o += styled(CODE_C, m[2], false, false);
    else if (m[3]) o += styled(CMD_C, m[3], false, true);
    else if (m[4]) o += styled(PATH_C, m[4], false, false);
    last = re.lastIndex;
  }
  o += col(TEXT, s.slice(last));
  return o;
}
function fileList(){ try{ return fs.readdirSync(S.cwd).filter(function(f){ return f.charAt(0)!=='.'; }).slice(0,40); }catch(e){ return []; } }

function statusRow(){
  var W = boxW();
  var filled = Math.round(10 * Math.min(1, S.ctxPct/100));
  var defs = [
    { p: S.model, c: col(TEXT,S.model) },
    { p: t('tps')+' '+S.tps.toFixed(1), c: col(MUTED,t('tps'))+' '+col(TEXT,S.tps.toFixed(1)) },
    { p: t('cache')+' '+S.cache+'%', c: col(MUTED,t('cache'))+' '+col(TEXT,S.cache+'%') }
  ];
  var sepP='  \u00b7  ', sepC=col(MUTED,'  \u00b7  '), plain='', colored='';
  for (var i=0;i<defs.length;i++){
    var add=(i?sepP:'')+defs[i].p;
    if (scr.strWidth(plain+add) > W) break;
    plain+=add; colored+=(i?sepC:'')+defs[i].c;
  }
  return padL(PADX) + colored + padL(Math.max(0, W - scr.strWidth(plain)));
}
function barLine(){
  var W = boxW();
  var total = S.ctxWindow || 32768, used = S.ctxTokens || 0;
  var pct = Math.max(0, Math.min(1, used/total));
  var txt = grp(used) + '/' + grp(total), tw = scr.strWidth(txt);
  var filled = Math.round(W * pct);
  var cFill = mix([255,205,205], [190,16,16], pct);
  var cells = [], keys = [];
  for (var i=0;i<W;i++){ cells.push(i<filled ? '\u2588' : '\u2591'); keys.push(i<filled ? 'f' : 'e'); }
  var start = Math.max(0, W - tw - 1);
  for (var j=0;j<tw;j++){ cells[start+j] = txt.charAt(j); keys[start+j] = 't'; }
  var s='', cur='';
  for (i=0;i<W;i++){
    if (keys[i]!==cur){
      cur = keys[i];
      s += ansi.fg(cur==='t' ? WHITE : (cur==='f' ? cFill : [60,66,80]));
    }
    s += cells[i];
  }
  return padL(PADX) + s + '\u001b[0m';
}
function boxLines(){
  var W = boxW(), inner = W - 2, avail = inner - 4, start = 0;
  while (scr.strWidth(buf.slice(start)) > avail) start++;
  var shown = buf.slice(start), curVis = Math.max(0, cur - start), textCol, body;
  if (mode === 'search'){
    var q = '(' + t('search') + ') ' + searchQ + (searchHit>=0 ? '  \u2190 ' + truncW(hist[hist.length-1-searchHit]||'', 30) : '');
    textCol = PADX + 4 + scr.strWidth('(' + t('search') + ') ' + searchQ);
    body = ' ' + col(RED,'\u276f') + ' ' + col(TEXT,q) + ' '.repeat(Math.max(0, avail - scr.strWidth(q))) + ' ';
  } else {
    textCol = PADX + 4 + scr.strWidth(shown.slice(0, curVis));
    body = ' ' + col(RED,'\u276f') + ' ' + col(TEXT,shown) + ' '.repeat(Math.max(0, avail - scr.strWidth(shown))) + ' ';
  }
  return {
    top: padL(PADX) + col(MUTED,'\u256d' + '\u2500'.repeat(inner) + '\u256e'),
    mid: padL(PADX) + col(MUTED,'\u2502') + body + col(MUTED,'\u2502'),
    bot: padL(PADX) + col(MUTED,'\u2570' + '\u2500'.repeat(inner) + '\u256f'),
    col: textCol
  };
}
function warnLines(){
  if (GW && GW.state.connected) return [];
  var v = process.env.OPENCLAW_SHELL;
  if (!v) return [];
  var W = boxW();
  var msg = (S.lang==='zh')
    ? '\u26a0 \u68c0\u6d4b\u5230 OPENCLAW_SHELL=' + v + ' \u2014 \u6b64\u7ec8\u7aef\u65e0\u6cd5\u76f4\u8fde OpenClaw\u3002\u8bf7\u4ece\u300c\u5f00\u59cb\u83dc\u5355 \u2192 cmd\u300d\u81ea\u5df1\u6253\u5f00\u7a97\u53e3\uff0c\u518d\u8dd1 opc-tui'
    : '\u26a0 OPENCLAW_SHELL=' + v + ' detected \u2014 cannot reach OpenClaw from this terminal. Open your own cmd and run opc-tui';
  var wl = wrapText(msg, W), L = [];
  for (var i=0;i<wl.length;i++) L.push(padL(PADX) + col(RED, wl[i]));
  return L;
}
function thinkStyle(s){ return NOCOL ? s : ('\u001b[2m\u001b[3m'+ansi.fg(THINK)+s+'\u001b[0m'); }
var ICON = NOCOL ? {
  think:['|','/','-','\\'], thinkMs:80,
  tool:['+','x','*','o'], toolMs:100,
  ans:['>','-'], ansMs:400,
  ok:'+', bad:'x', head:'>'
} : {
  think:['⠋','⠙','⠹','⠸','⠼','⠴','⠦','⠧','⠇','⠏'], thinkMs:80,
  tool:['⠿','⠷','⠯','⠏','⠟','⠻','⠾'], toolMs:100,
  ans:['✎','✏'], ansMs:400,
  ok:'✓', bad:'✗', head:'▸'
};
function spinAt(set, ms){ if (!set || !set.length) return ''; return set[Math.floor(Date.now()/ms) % set.length]; }
function toolIcon(){
  if (!S.toolName) return '';
  if (S.toolPhase === 'end') return S.toolOk ? ICON.ok : ICON.bad;
  return spinAt(ICON.tool, ICON.toolMs);
}
// Reasoning stream: live lines while it streams, one summary line once collapsed.
function thinkLines(){
  var W = boxW(), L = [], i;
  var hasReason = !!S.reason;
  if (hasReason && S.collapseThink){
    L.push(padL(PADX) + col(MUTED, ICON.head + ' ' + t('thinkFold')));
    if (S.toolName) L.push(padL(PADX) + col(MUTED, toolIcon() + ' ' + S.toolName));
    if (S.think) L.push(padL(PADX) + col(MUTED, '   ' + S.think));
    if (!busy && S.doneIcon) L.push(padL(PADX) + col(MUTED, S.doneIcon + ' ' + (S.doneText || t('done'))));
    return L;
  }
  if (busy){
    var head = spinAt(ICON.think, ICON.thinkMs) + ' ' + t('thinking') + '  ' + ((Date.now()-S.t0)/1000).toFixed(1) + 's';
    L.push(padL(PADX) + col(THINK, head));
    L.push(padL(PADX) + col(MUTED, '   · ' + (S.lang==='zh'?'实时消耗 · ':'live · ')
      + 'in ' + grp(S.liveIn||0) + ' · out ' + grp(S.liveOut||0)
      + ' · 总 ' + grp(S.tokens) + ' · 上下文 ' + Math.round(S.ctxPct) + '%'));
  }
  if (hasReason){
    L.push(padL(PADX) + col(MUTED, t('thinkHead')));
    var tw = wrapText(S.reason, W - 2);
    for (i=0;i<tw.length;i++){
      L.push(padL(PADX) + col(MUTED, (i===0?'▌ ':'│ ')) + thinkStyle(tw[i]));
    }
  }
  if (S.toolName) L.push(padL(PADX) + col(MUTED, toolIcon() + ' ' + S.toolName));
  if (S.think) L.push(padL(PADX) + col(MUTED, '   ' + S.think));
  if (!busy && S.doneIcon) L.push(padL(PADX) + col(MUTED, S.doneIcon + ' ' + (S.doneText || t('done'))));
  return L;
}
function answerLines(){
  var W = boxW(), L = [];
  if (answerBuf){
    L.push(padL(PADX) + col(MUTED, spinAt(ICON.ans, ICON.ansMs) + ' ' + t('out')));
    var wl = wrapText(answerBuf, W);
    for (var i=0;i<wl.length;i++) L.push(padL(PADX) + mdLine(wl[i]));
  }
  return L;
}
function menuList(){
  if (buf.charAt(0)==='/'){
    var src = (S.cmds && S.cmds.length) ? S.cmds : null;
    if (src) return src.filter(function(x){ var a=(x.textAliases&&x.textAliases[0])||('/'+x.name); return a.indexOf(buf)===0; })
                     .map(function(x){ var a=(x.textAliases&&x.textAliases[0])||('/'+x.name); return { c:a, zh:x.description||'', en:x.description||'' }; });
    return CMDS.filter(function(o){ return o.c.indexOf(buf)===0; });
  }
  if (buf.charAt(0)==='@') return fileList().filter(function(f){ return f.toLowerCase().indexOf(buf.slice(1).toLowerCase())>=0; }).map(function(f){ return { c:'@'+f, zh:'\u6587\u4ef6', en:'file' }; });
  return [];
}
function popupLines(){
  var list = menuList();
  if (!list.length) return [];
  var W = boxW(), inner = W-2, L=[];
  var head='\u2500 '+(menuSel+1)+'/'+list.length+' '+t('items')+' ';
  L.push(padL(PADX)+col(MUTED,'\u250c'+head+'\u2500'.repeat(Math.max(0,inner-scr.strWidth(head)))+'\u2510'));
  var MAX=Math.min(8, list.length);
  var start=Math.max(0, Math.min(menuSel-MAX+1, list.length-MAX));
  if (start<0) start=0;
  popupWinStart = start; popupLen = list.length;
  var show=list.slice(start, start+MAX);
  var dw=Math.max(4, inner-21);
  for (var i=0;i<show.length;i++){
    var sel=((start+i)===menuSel);
    var name=padW(truncW(show[i].c,14),14), desc=padW(truncW(cmdDesc(show[i]), dw), dw);
    var body;
    if (sel){
      body = '\u001b[48;2;64;64;78m' + ' ' + styled(WHITE,'\u276f',false,true) + ' ' + styled(WHITE,name,false,true) + '  ' + styled(MUTED,desc) + ' ' + '\u001b[0m';
    } else {
      body = ' ' + '  ' + ' ' + col(TEXT,name) + '  ' + col(MUTED,desc) + ' ';
    }
    L.push(padL(PADX)+col(MUTED,'\u2502')+body+col(MUTED,'\u2502'));
  }
  L.push(padL(PADX)+col(MUTED,'\u2514'+'\u2500'.repeat(inner)+'\u2518'));
  return L;
}
function regionLines(){
  var wn=warnLines(), tl=thinkLines(), al=answerLines(), pop=popupLines(), bx=boxLines();
  var pre = wn.concat(tl).concat(al).concat(pop);
  var tail = [bx.top,bx.mid,bx.bot,barLine(),statusRow()];
  var maxRows = Math.max(6, (process.stdout.rows||30) - 2);
  while (pre.length + tail.length > maxRows && pre.length) pre.shift();
  return { lines: pre.concat(tail), head: pre.length, col: bx.col };
}
function printHistory(){
  var rows = process.stdout.rows || 30;
  var W = boxW();
  var regionH = regionLines().lines.length;
  var avail = Math.max(3, rows - regionH - 1);
  var printed = [];
  for (var i = HIST.length-1; i >= 0 && printed.length < avail; i--){
    var wl = wrapText(HIST[i].t, W);
    for (var j = wl.length-1; j >= 0 && printed.length < avail; j--) printed.unshift({ s: wl[j], c: HIST[i].c });
  }
  for (var k=0;k<printed.length;k++) out(padL(PADX) + col(printed[k].c, printed[k].s) + '\n');
}
function repaintAll(){
  out('\u001b[2J\u001b[H');
  prevPop = 0; prevRegionH = 0;
  printHistory();
  render();
}
function hardReflow(){
  suspend = true;
  try {
    out('\u001b[2J\u001b[H');
    prevPop = 0; prevIdx = 0; prevRegionH = 0; nlCount = 0;
    var bpad = new Array(4+1).join(' ');
    if (bannerOn && !S.frozen){
      var rows = buildBanner(termW(), animT, S.anim);
      out('\n\n');
      for (var i=0;i<rows.length;i++) out(bpad + rows[i] + '\n');
      out('\n\n');
      bannerBase = rows.length + 4; bannerH = rows.length;
    } else {
      bannerBase = 0;
    }
    printHistory();
    dbg('hardReflow reason=' + (S.reason||'').length + ' fold=' + !!S.collapseThink);
  } catch(e){ dbg('hardReflow ERR ' + (e && e.message)); }
  suspend = false;
  render();
}
// Width-aware re-layout after a terminal resize: wipe the visible screen
// (scrollback is left alone), redraw banner + history + live region at the new W.
function relayout(){
  suspend = true;
  try {
    out('\u001b[2J\u001b[3J\u001b[H');
    prevPop = 0; prevIdx = 0; prevRegionH = 0; nlCount = 0; cprPending = false; popWasOpen = false;
    lastCols = colsW();
    var bpad = new Array(4+1).join(' ');
    // A resize is a fresh layout: bring the banner (lobster logo + title) back even if
    // it had already scrolled off, then rebuild history and the live region below it.
    bannerOn = true; S.frozen = false;
    var rows = buildBanner(termW(), animT, S.anim);
    if ((process.stdout.rows || 30) - rows.length >= 6){
      out('\n\n');
      for (var i=0;i<rows.length;i++) out(bpad + rows[i] + '\n');
      out('\n\n');
      bannerBase = rows.length + 4; bannerH = rows.length;
      nlCount = 0;
    } else {
      bannerBase = 0;
    }
    printHistory();
    suspend = false;
    render();
    dbg('relayout cols=' + colsW() + ' rows=' + (process.stdout.rows || 0) + ' W=' + boxW());
  } catch(e){ dbg('relayout ERR ' + (e && e.message)); }
  suspend = false;
}
// How far the cursor may move up before clearing: never more than the offset that
// was recorded when the region was actually painted (prevIdx). A stale prevPop can
// therefore no longer reach above the region into already-committed answers.
function upLines(){
  var n = Math.min(prevPop, prevIdx);
  if (n < 0) n = 0;
  if (n !== prevPop) dbg('anchor fix ' + prevPop + ' -> ' + n + ' (idx=' + prevIdx + ')');
  return n;
}
function render(){
  if (suspend) return;
  var r = regionLines(), lines = r.lines, o='';
  if (prevPop > lines.length-1) prevPop = lines.length-1;
  if (prevPop>0) o += '\u001b['+prevPop+'A';
  o += '\r\u001b[J';
  for (var i=0;i<lines.length;i++){
    o += lines[i];
    if (i < lines.length-1) o += '\n';
  }
  var contentIdx = r.head + 1;
  var up = (lines.length-1) - contentIdx;
  if (up>0) o += '\u001b['+up+'A';
  o += '\r';
  if (r.col>0) o += '\u001b['+r.col+'C';
  prevRegionH = lines.length;
  prevPop = contentIdx; prevIdx = contentIdx;
  out(o);
  var popOpen = popupLines().length > 0;
  setMouse(popOpen);
  if (popOpen && !popWasOpen && Date.now() - lastCpr > 400){
    popWasOpen = true; lastCpr = Date.now(); cprArmed = Date.now();
    out('\u001b[6n');
  }
  if (!popOpen) popWasOpen = false;
}
function clearLive(){
  var n = upLines();
  if (n > 0) out('\u001b['+n+'A');
  out('\r\u001b[J');
  prevPop = 0; prevIdx = 0; prevRegionH = 0;
}
function block(text){
  pushHist(text, TEXT);
  clearLive();
  var W = boxW(), wl = wrapText(text, W);
  for (var i=0;i<wl.length;i++) out(padL(PADX) + col(TEXT, wl[i]) + '\n');
  out('\n');
  render();
}
function blockC(text, c){
  pushHist(text, c);
  clearLive();
  var W = boxW(), wl = wrapText(text, W);
  for (var i=0;i<wl.length;i++) out(padL(PADX) + col(c, wl[i]) + '\n');
  out('\n');
  render();
}
function livePoll(){
  if (suspend || !GW || !GW.state.connected) return;
  GW.request('sessions.list', {}).then(function(r){
    var arr = r.sessions || [], en = null;
    for (var i=0;i<arr.length;i++){ if (arr[i].key === S.sessionKey){ en = arr[i]; break; } }
    if (!en) return;
    if (typeof en.totalTokens === 'number') S.tokens = en.totalTokens;
    if (typeof en.inputTokens === 'number'){ S.ctxTokens = en.inputTokens; S.liveIn = en.inputTokens; }
    if (typeof en.outputTokens === 'number') S.liveOut = en.outputTokens;
    if (typeof en.estimatedCostUsd === 'number') S.cost = en.estimatedCostUsd;
    S.ctxPct = Math.min(100, 100*(S.ctxTokens/(S.ctxWindow||32768)));
    if (busy) render();
  }).catch(function(){});
}
function startBusy(){
  busy = true; spin = 0;
  if (busyTimer) clearInterval(busyTimer);
  if (liveTimer) clearInterval(liveTimer);
  liveTimer = setInterval(function(){ if (!busy){ clearInterval(liveTimer); liveTimer=null; return; } if (S.sendMode && S.streamWait && (Date.now()-S.waitT0) > 300000){ finishTurn(); return; } livePoll(); }, 900);
  busyTimer = setInterval(function(){ if(!busy){ clearInterval(busyTimer); busyTimer=null; return; } spin++; render(); }, 80);
}
function stopBusy(){ busy=false; if(busyTimer){ clearInterval(busyTimer); busyTimer=null; } if(liveTimer){ clearInterval(liveTimer); liveTimer=null; } }
var GW = null, GW_ERR = null, GW_SID = null;
function readGwCfg(){
  try {
    var f = openclawConfigPath();
    var d = JSON.parse(fs.readFileSync(f, 'utf8'));
    var g = d.gateway || {};
    var tok = (g.auth && (g.auth.token || g.auth.password)) || null;
    if (!tok) return null;
    return { port: g.port || 18789, token: tok };
  } catch(e){ return null; }
}
async function gwInit(){
  try {
    var cfg = readGwCfg();
    if (!cfg){ GW_ERR = 'no gateway token'; S.conn='x'; dbg('gwInit no cfg'); return; }
    var mod = await import('./gw.mjs');
    GW = mod.createGw({
      url: 'ws://127.0.0.1:' + cfg.port,
      token: cfg.token,
      onHello: function(){
        S.conn='ok'; dbg('gw hello ok'); refreshSession();
        try { GW.request('commands.list', {}).then(function(r){ S.cmds = r.commands || []; dbg('cmds '+S.cmds.length); render(); }); } catch(e){}
        render();
      },
      onError: function(m){ S.conn='x'; GW_ERR=m; S.think=m; dbg('gw err '+m); render(); },
      onEvent: onGwEvent
    });
    dbg('gwInit started');
  } catch(e){ GW_ERR = String(e && e.message || e); S.conn='x'; dbg('gwInit ERR '+GW_ERR); }
}
var lastPoll = '';
async function refreshSession(){
  if (!GW || !GW.state.connected) return;
  try {
    var r = await GW.request('sessions.list', {});
    var arr = r.sessions || r.items || [];
    var e = null;
    for (var i=0;i<arr.length;i++){ if (arr[i].key === S.sessionKey){ e = arr[i]; break; } }
    if (!e) return;
    GW_SID = e.sessionId;
    if (e.model && !S.modelLock) S.model = e.model;
    if (e.model && !S.model0) S.model0 = e.model;
    if (typeof e.totalTokens === 'number') S.tokens = e.totalTokens;
    if (typeof e.inputTokens === 'number') S.ctxTokens = e.inputTokens;
    if (typeof e.contextTokens === 'number' && e.contextTokens > 0) S.ctxWindow = e.contextTokens;
    if (typeof e.estimatedCostUsd === 'number') S.cost = e.estimatedCostUsd;
    S.ctxPct = Math.min(100, 100 * (S.ctxTokens / (S.ctxWindow||32768)));
    var sig = [S.model,S.tokens,S.ctxTokens,S.ctxWindow,S.cost,GW_SID,S.conn].join('|');
    if (sig !== lastPoll){ lastPoll = sig; render(); }
  } catch(e){}
}
function onGwEvent(ev){
  try {
    var p = ev && ev.payload;
    if (!p) return;
    if (ev.event !== 'agent' && ev.event !== 'chat') return;
    var sk = p.sessionKey || '';
    var mine = false;
    if (S.streamRun && p.runId === S.streamRun) mine = true;
    else if (sk && sk === S.sessionKey) mine = true;
    if (!mine){
      // openclaw.chat runs its own agent session (agent:openclaw:*), so adopt that run.
      if (S.streamWait && !S.streamRun && p.stream === 'lifecycle' && p.data && p.data.phase === 'start'
          && typeof p.runId === 'string' && p.runId.indexOf('openclaw-turn-') === 0
          && sk.indexOf('agent:openclaw:') === 0 && (Date.now() - S.waitT0) < 90000){
        S.streamRun = p.runId; mine = true; dbg('adopt run ' + p.runId + ' sk=' + sk);
      } else return;
    }
    var d = p.data || {};
    if (mine && !S.streamRun && typeof p.runId === 'string' && p.runId) S.streamRun = p.runId;
    if (ev.event === 'chat'){
      if (typeof p.deltaText === 'string' && p.deltaText){
        var dt = p.deltaText;
        if (!S.answerText || dt.indexOf(S.answerText) === 0) S.answerText = dt;
        else S.answerText = S.answerText + dt;
        answerBuf = S.answerText;
        vsDelta(S.answerText);
        if (S.reason && S.autoThink) S.collapseThink = true;
        render();
      }
      if (p.state === 'final' && S.sendMode && mine) finishTurn();
      return;
    }
    if (p.stream === 'thinking'){
      var rt;
      if (typeof d.text === 'string' && d.text){
        if (!S.reason || d.text.indexOf(S.reason) === 0) rt = d.text;
        else rt = S.reason + (typeof d.delta === 'string' ? d.delta : d.text);
      } else rt = S.reason + (typeof d.delta === 'string' ? d.delta : '');
      if (rt && rt !== S.reason){
        S.reason = rt; S.thinkN++;
        if (S.autoThink) S.collapseThink = false;
        render();
      }
      return;
    }
    if (p.stream === 'assistant'){
      var at;
      if (typeof d.itemId === 'string' && d.itemId && d.itemId !== S.ansItem){ S.ansItem = d.itemId; S.answerText = ''; }
      if (typeof d.text === 'string' && d.text){
        if (!S.answerText || d.text.indexOf(S.answerText) === 0) at = d.text;
        else at = S.answerText + (typeof d.delta === 'string' ? d.delta : d.text);
      } else at = S.answerText + (typeof d.delta === 'string' ? d.delta : '');
      if (at && at !== S.answerText){
        S.answerText = at; answerBuf = at; S.assN++;
        vsDelta(at);
        if (S.reason && S.autoThink && !S.collapseThink){ S.collapseThink = true; hardReflow(); } else render();
      }
      return;
    }
    if (p.stream === 'usage'){
      if (typeof d.outputTokens === 'number') S.liveOut = d.outputTokens;
      if (busy) render();
      return;
    }
    if (p.stream === 'item' && d){
      var nm = d.title || d.name || d.kind || '';
      S.toolName = nm; S.toolPhase = d.phase || '';
      S.toolOk = d.phase === 'end' ? !/fail|error|cancel|abort/i.test(String(d.status || '')) : true;
      S.think = '';
      render();
      return;
    }
    if (p.stream === 'lifecycle'){
      if (d.phase === 'end'){
        if (S.reason && S.autoThink) S.collapseThink = true;
        if (S.sendMode && mine) finishTurn();
      }
      return;
    }
  } catch(e){ dbg('onGwEvent ERR ' + (e && e.message)); }
}
function finishTurn(){
  if (!busy) return;
  var reply = S.answerText || '';
  stopBusy();
  S.streamRun = null; S.streamWait = false;
  if (S.reason) S.collapseThink = true;
  dbg('turn done replyLen=' + reply.length + ' thinkLen=' + (S.reason || '').length + ' thinkEvents=' + S.thinkN + ' assEvents=' + S.assN + ' send=' + !!S.sendMode);
  commit(reply || '—', true);
  refreshSession();
}
// Optional transport: sessions.send runs on OUR session key and honours a per-session
// model override, so a reasoning model actually streams thinking. Opt-in only.
function sendSession(text){
  var t0d = Date.now();
  S.streamWait = true; S.streamRun = null; S.waitT0 = Date.now(); S.ansItem = '';
  S.thinkN = 0; S.assN = 0;
  var seq = Promise.resolve();
  if (S.thinkModel && S.thinkModel !== S.model){
    seq = GW.request('sessions.patch', { key: S.sessionKey, model: S.thinkModel })
      .then(function(){ S.model = S.thinkModel; S.modelLock = true; blockC('· ' + (S.lang==='zh' ? '本会话模型 → ' : 'session model → ') + S.thinkModel, MUTED); })
      .catch(function(e){ dbg('patch ERR ' + (e && e.message)); });
  }
  seq.then(function(){
      return GW.request('sessions.create', { key: S.sessionKey });
    })
    .then(function(cr){
      if (cr && cr.sessionId) GW_SID = cr.sessionId;
      if (cr && cr.key && cr.key !== S.sessionKey) S.sessionKey = cr.key;
      dbg('session ready key=' + S.sessionKey + ' sid=' + GW_SID);
      return GW.request('sessions.send', { key: S.sessionKey, message: text });
    })
    .then(function(r){ dbg('session send runId=' + ((r && r.runId) || '-') + ' ms=' + (Date.now() - t0d)); })
    .catch(function(err){
      var m = String(err && err.message || err);
      dbg('session send ERR ' + m);
      S.sendMode = false;
      blockC('· ' + (S.lang==='zh' ? 'session-send 失败，回退 openclaw.chat：' : 'session-send failed, fallback to openclaw.chat: ') + m, MUTED);
      sendGw(text, true);
    });
}
function sendGw(text, mayRetry){
  var t0d = Date.now();
  S.streamWait = true; S.streamRun = null; S.waitT0 = Date.now();
  GW.request('openclaw.chat', { sessionId: GW_SID, message: text }).then(function(r){
    stopBusy();
    S.streamWait = false;
    var reply = (r && (r.reply || r.final || r.text)) || '';
    if (!reply && S.answerText) reply = S.answerText;
    dbg('direct ok ms='+(Date.now()-t0d)+' replyLen='+reply.length+' run='+(S.streamRun||'-')+' thinkLen='+(S.reason||'').length);
    S.tps = reply.length ? (reply.length/4)/Math.max(0.2,(Date.now()-t0d)/1000) : 0;
    if (S.reason) S.collapseThink = true;
    commit(reply || '—', true);
    refreshSession();
  }).catch(function(err){
    var m = String(err && err.message || err);
    S.streamWait = false;
    if (mayRetry && /another caller|unavailable|not available/i.test(m)){
      dbg('session not ours -> creating own session');
      GW.request('sessions.create', {}).then(function(cr){
        S.sessionKey = cr.key || S.sessionKey;
        GW_SID = cr.sessionId || GW_SID;
        dbg('adopted '+S.sessionKey+' '+GW_SID);
        S.think = '';
        sendGw(text, false);
      }).catch(function(e2){ stopBusy(); var m2=String(e2&&e2.message||e2); S.think=m2; commit('✗ '+m2, false); });
      return;
    }
    stopBusy();
    dbg('direct ERR '+m);
    S.think = m;
    commit('✗ ' + m, false);
  });
}
var streamTimer = null, streamBuf = '', streamTarget = '', streamOk = true;
function startStream(text, ok){
  stopBusy();
  streamTarget = String(text); streamBuf = ''; streamOk = ok;
  if (streamTimer) clearInterval(streamTimer);
  streamTimer = setInterval(function(){
    if (streamBuf.length >= streamTarget.length){
      clearInterval(streamTimer); streamTimer = null;
      var full = streamTarget; streamBuf = ''; streamTarget = ''; answerBuf = '';
      commit(full, streamOk);
      return;
    }
    streamBuf += streamTarget.charAt(streamBuf.length);
    answerBuf = streamBuf;
    render();
  }, 14);
}
// ---- VS Code bridge (opc-tui -> OocTui). Self-contained; never throws. ----
function vsNoticeOnce(msg){
  if (S.vsNotice) return;
  S.vsNotice = true;
  blockC('\u00b7 VS Code: ' + msg, MUTED);
}
function vsEnsure(){
  if (S.vsSess) return;
  var info = vsc.discover();
  if (!info){ vsNoticeOnce(vsc.humanError('no_discovery_file')); return; }
  var sess = new vsc.StreamSession(info);
  S.vsSess = sess;
  sess.start(false).then(function(ok){
    if (!ok){
      S.vsSess = null;
      S.vsNotice = false;
      vsNoticeOnce(vsc.humanError(sess.error));
      return;
    }
    var pend = S.vsPending || '';
    S.vsPending = '';
    if (pend){ sess.write(pend); S.vsSent = pend.length; }
  });
}
function vsDelta(full){
  if (!S.vscode) return;
  var s = String(full || '');
  if (s.length < S.vsSent){ vsEnd(); }
  if (s.length <= S.vsSent) return;
  var add = s.slice(S.vsSent);
  S.vsSent = s.length;
  if (!S.vsSess || !S.vsSess.ready){ S.vsPending = (S.vsPending || '') + add; vsEnsure(); return; }
  if (!S.vsSess.write(add)){
    var e = S.vsSess.error;
    S.vsSess = null;
    S.vsNotice = false;
    vsNoticeOnce(vsc.humanError(e));
  }
}
function vsEnd(){
  if (S.vsSess){ S.vsSess.end(); S.vsSess = null; }
  S.vsSent = 0; S.vsPending = '';
}
function commit(txt, ok){
  vsEnd();
  var n = upLines();
  answerBuf=''; S.answerText=''; S.streamRun=null; S.streamWait=false;
  if (ok) { S.doneIcon = ICON.ok; S.doneText = ''; } else { S.doneIcon = ''; }
  pushHist(txt, ok?WHITE:RED);
  if (n>0) out('\u001b['+n+'A');
  out('\r\u001b[J'); prevPop=0; prevIdx=0;
  var W = boxW(), wl = wrapText(txt, W);
  for (var i=0;i<wl.length;i++) out(padL(PADX) + (ok ? mdLine(wl[i]) : col(RED, wl[i])) + '\n');
  out('\n' + sepLine() + '\n');
  render();
}
function ask(text){
  answerBuf=''; S.answerText=''; S.think=''; S.reason=''; S.collapseThink=false; S.autoThink=true; S.streamWait=false; S.streamRun=null;
  S.toolName=''; S.toolPhase=''; S.toolOk=true; S.doneIcon=''; S.doneText=''; S.ansItem=''; S.thinkN=0; S.assN=0;
  S.t0 = Date.now(); startBusy(); render();
  if (GW && GW.state.connected && (GW_SID || S.sendMode)){ if (S.sendMode) sendSession(text); else sendGw(text, true); return; }
  var tmp = path.join(os.tmpdir(), 'opc-tui-msg-'+Date.now()+'.txt');
  try { fs.writeFileSync(tmp, text, 'utf8'); } catch(e){ stopBusy(); blockC('write temp failed: '+e.message, RED); return; }
  var args = ['agent', '--session-key', S.sessionKey, '--message-file', tmp, '--json'];
  var child, rawOut='', rawErr='', t0=Date.now();
  S.t0 = t0; S.think = '';
  var cli = openclawCli();
  dbg('ask key='+S.sessionKey+' cwd='+S.cwd+' env_SHELL='+(process.env.OPENCLAW_SHELL||'-')+' cli='+(cli||'null')+' msg='+String(text).slice(0,60));
  try {
    if (cli) child = cp.spawn(process.execPath, [cli].concat(args), { windowsHide: true });
    else child = cp.spawn('openclaw', args, { shell: true, windowsHide: true });
  }
  catch(e){ stopBusy(); blockC('spawn failed: '+e.message, RED); return; }
  child.stdout.on('data', function(d){ rawOut += stripAnsi(String(d)); });
  child.stderr.on('data', function(d){ var s=stripAnsi(String(d)); if(s.trim()){ rawErr += s; S.think = rawErr.trim(); render(); } });
  child.on('error', function(e){ stopBusy(); blockC(t('err')+': '+e.message, RED); S.conn='x'; });
  child.on('close', function(code){
    stopBusy();
    dbg('close code='+code+' outLen='+rawOut.length+' errLen='+rawErr.length+' cli='+(cli||'FALLBACK-SHELL'));
    dbg('RAWOUT='+rawOut.slice(0,1500).replace(/\n/g,'\\n'));
    if (rawErr) dbg('RAWERR='+rawErr.slice(0,900).replace(/\n/g,'\\n'));
    var env=null;
    try { env = JSON.parse(rawOut.trim()); } catch(e){ env = null; }
    var ok = env ? (env.status==='ok') : (code===0);
    var txt;
    if (env){
      txt = env.final || (env.payloads && env.payloads[0] && env.payloads[0].text) || '';
      if (env.usage){
        S.tokens += (env.usage.total||0);
        if (typeof env.usage.input === 'number') S.ctxTokens = env.usage.input;
        var el = Math.max(0.2, (Date.now()-t0)/1000);
        S.tps = (env.usage.output||0)/el;
      }
      if (typeof env.costUsd === 'number') S.cost = env.costUsd;
      if (env.model) S.model = env.model;
      if (!ok && env.error && env.error.message) txt = env.error.message;
    } else {
      txt = rawOut.trim() || rawErr.trim();
    }
    S.ctxPct = Math.min(100, 100 * (S.ctxTokens / (S.ctxWindow||32768)));
    S.conn = ok ? 'ok' : 'x';
    if (!ok && !S.think) S.think = rawErr.trim();
    if (!ok && /exec marker|inter-session attribution/i.test(txt + rawErr)){
      txt = (S.lang==='zh')
        ? '\u2717 \u65e0\u6cd5\u76f4\u8fde OpenClaw\uff1a\u6b64\u7ec8\u7aef\u5e26 OPENCLAW_SHELL=exec \u6807\u8bb0\uff08\u5c5e\u4e8e agent \u7684 exec \u5b50\u8fdb\u7a0b\uff09\u3002\n  \u8bf7\u6309 Win+R \u8f93\u5165 cmd \u56de\u8f66\uff08\u81ea\u5df1\u5f00\u7684\u7a97\u53e3\uff09\uff0c\u518d\u8dd1 opc-tui\u3002'
        : '\u2717 Cannot reach OpenClaw: this terminal carries OPENCLAW_SHELL=exec (agent exec subprocess).\n  Press Win+R, type cmd, then run opc-tui.';
    }
    if (!ok && rawErr.trim() && txt.indexOf(rawErr.trim()) < 0) txt += (txt?'\n':'') + rawErr.trim();
    if (!txt && !ok) txt = t('err') + ' (exit ' + code + ')';
    dbg('commit ok='+ok+' txtLen='+txt.length);
    try { fs.unlinkSync(tmp); } catch(e){}
    commit(txt, ok);
  });
}
function runCmd(raw){
  var c = raw.trim().split(/\s+/)[0];
  if (c==='/quit'){ quit(); return; }
  if (c==='/clear'){ out('\u001b[2J\u001b[3J\u001b[H'); prevPop=0; bannerOn=true; nlCount=0; S.frozen=false;
    var bpad=new Array(4+1).join(' ');
    var rows=buildBanner(termW(),animT,S.anim); out('\n\n');
    for(var i=0;i<rows.length;i++) out(bpad+rows[i]+'\n');
    out('\n\n'); bannerBase=rows.length+4; render(); return; }
  if (c==='/lang'){ S.lang = S.lang==='zh'?'en':'zh'; blockC('UI: '+(S.lang==='zh'?'\u4e2d\u6587':'English'), MUTED); return; }
  if (c==='/model'){
    var mp = raw.trim().split(/\s+/);
    if (!mp[1]){ blockC('model  ' + S.model + (S.sendMode ? '  \u00b7  session-send' : '  \u00b7  openclaw.chat'), MUTED); return; }
    if (!GW || !GW.state.connected){ blockC('gateway offline', RED); return; }
    var want = mp[1] === 'reset' ? (S.model0 || S.model) : mp[1];
    GW.request('sessions.patch', { key: S.sessionKey, model: want }).then(function(){
      S.model = want; S.thinkModel = want; S.modelLock = true;
      blockC('\u00b7 ' + (S.lang==='zh' ? '\u672c\u4f1a\u8bdd\u6a21\u578b \u2192 ' : 'session model \u2192 ') + want, MUTED);
    }).catch(function(e){ blockC('\u2717 ' + String(e && e.message || e), RED); });
    return;
  }
  if (c==='/session'){
    var parts = raw.trim().split(/\s+/);
    if (parts[1]){ S.sessionKey = parts[1]; GW_SID = null; blockC('session key \u2192 '+S.sessionKey, MUTED); }
    else blockC('session key  '+S.sessionKey+'\nagent        '+S.agent+'\nsession id   '+S.session, MUTED);
    return;
  }
  if (c==='/export'){ var f=path.join(S.cwd,'session-'+S.session+'.txt'); try{ fs.writeFileSync(f,'session '+S.session+'\nkey '+S.sessionKey+'\n'); blockC('\u5df2\u5bfc\u51fa \u2192 '+f, MUTED); }catch(e){ blockC('\u5bfc\u51fa\u5931\u8d25', RED); } return; }
  if (c==='/vscode'){
    var vp = raw.trim().split(/\s+/);
    var sub = (vp[1] || '').toLowerCase();
    if (sub === 'on'){ S.vscode = true; S.vsNotice = false; blockC('\u00b7 VS Code \u8054\u52a8: ON', MUTED); vsEnsure(); return; }
    if (sub === 'off'){ S.vscode = false; vsEnd(); blockC('\u00b7 VS Code \u8054\u52a8: OFF', MUTED); return; }
    vsc.probe().then(function(r){
      if (r.ok){
        var st = r.status || {};
        blockC('\u00b7 VS Code: ' + (S.vscode ? 'ON' : 'OFF') + '  ' + vsc.discoverFile() + '\n  ' + (st.file || '(no editor)') + '  v' + (st.version === undefined ? '-' : st.version), MUTED);
      } else {
        blockC('\u00b7 VS Code: ' + (S.vscode ? 'ON' : 'OFF') + '  ' + vsc.humanError(r.error), MUTED);
      }
    });
    return;
  }
  if (c==='/push'){
    var ptxt = raw.replace(/^\s*\/push\s*/, '');
    if (!ptxt){ blockC('\u7528\u6cd5: /push \u4f60\u8981\u63a8\u9001\u7684\u6587\u672c', MUTED); return; }
    vsc.pushText(ptxt, { clear: false, chunk: 16, delay: 16 }).then(function(r){
      if (r.ok) blockC('\u00b7 \u5df2\u63a8\u9001 ' + r.chars + ' \u5b57\u5230 VS Code (v' + r.version + ')', MUTED);
      else blockC('\u00b7 \u63a8\u9001\u5931\u8d25: ' + vsc.humanError(r.error), MUTED);
    });
    return;
  }
  ask(raw);
}
function quit(){
  bannerOn=false;
  try { out('\u001b]0;\u0007\u001b[0m\u001b[?7h\u001b[?25h\u001b[?2004l'); } catch(e){}
  try { if (busyTimer) clearInterval(busyTimer); } catch(e){}
  process.exit(0);
}
function submit(){
  var raw=buf, v=raw.trim();
  clearLive(); buf=''; cur=0; menuSel=0;
  if (!v){ render(); return; }
  hist.push(raw); hi=hist.length; S.frozen=true;
  out(padL(PADX) + col(RED,'\u276f') + ' ' + colB(USER, v) + '\n');
  if (v.charAt(0)==='/') runCmd(v);
  else ask(v);
}
var inHold = '';
var cprArmed = 0, lastCpr = 0;
function feed(data){
  var s = inHold + String(data);
  inHold = '';
  var m = s.match(/\u001b(\[[0-9;?<]*)?$/);
  if (m){ inHold = m[0]; s = s.slice(0, s.length - m[0].length); }
  if (s.length && /^\[?\d{1,3};\d{1,3}R$/.test(s.trim())) return;
  if (s.length) onKey(s);
}
function onKey(s){
  var cpr = String(s).match(/\u001b\[(\d+);(\d+)R/);
  if (cpr){
    curRow = parseInt(cpr[1], 10);
    cprArmed = 0;
    s = String(s).replace(cpr[0], '');
    if (cprPending){
      cprPending = false;
      var top = Math.max(1, curRow - (prevIdx || 0));
      out('\u001b[' + top + ';1H\u001b[J');
      prevPop = 0; prevRegionH = 0;
      render(); paintBanner();
    }
    if (!s.length) return;
  }
  var i=0;
  while (i<s.length){
    if (pasteMode){
      var pt=s.slice(i), pe=pt.indexOf('\u001b[201~');
      if (pe<0){ pasteBuf+=pt; i=s.length; break; }
      pasteBuf+=pt.slice(0,pe); insertText(pasteBuf); pasteBuf=''; pasteMode=false;
      i+=pe+6; continue;
    }
    if (s.startsWith('\u001b[200~', i)){ pasteMode=true; i+=6; continue; }
    var ch=s[i];
    if (ch==='\u001b'){
      var rest=s.slice(i+1);
      if (rest[0]==='['){
        var c=rest[1];
        if (c==='<'){
          var me = rest.match(/^\[<(\d+);(\d+);(\d+)([Mm])/);
          if (me){
            var mb = parseInt(me[1],10), mmy = parseInt(me[3],10);
            dbg('MOUSE b='+mb+' y='+mmy+' curRow='+curRow+' popupLen='+popupLen+' winStart='+popupWinStart+' sel='+menuSel);
            var lst = menuList();
            if (lst.length){
              if (mb === 64){ menuSel = Math.max(0, menuSel-1); render(); }
              else if (mb === 65){ menuSel = Math.min(lst.length-1, menuSel+1); render(); }
              else if (curRow){
                var itemTop = curRow - popupLen;
                var idx = mmy - itemTop;
                if (idx >= 0 && idx < Math.min(8, lst.length)){
                  menuSel = popupWinStart + idx;
                  if (mb === 0 && me[4] === 'M'){
                    buf = lst[Math.min(menuSel, lst.length-1)].c; cur = buf.length; menuSel = 0;
                  }
                  render();
                }
              }
            }
            i += me[0].length + 1; continue;
          }
        }
        if (c==='D'){ if (S.splash) S.anim=(S.anim+2)%3; else if (cur>0) cur--; }
        else if (c==='C'){ if (S.splash) S.anim=(S.anim+1)%3; else if (cur<buf.length) cur++; }
        else if (c==='A'){ var nA=menuList().length; if (nA) menuSel=Math.max(0,menuSel-1); else if (hi>0){ hi--; buf=hist[hi]; cur=buf.length; } }
        else if (c==='B'){ var nB=menuList().length; if (nB) menuSel=Math.min(nB-1,menuSel+1); else if (hi<hist.length-1){ hi++; buf=hist[hi]; cur=buf.length; } }
        else if (c==='H') cur=0; else if (c==='F') cur=buf.length;
        i+=('ABCDHF'.indexOf(c)>=0)?3:2; continue;
      }
      if (mode === 'search'){ mode='input'; searchQ=''; searchHit=-1; render(); i++; continue; }
      if (buf.charAt(0)==='/'||buf.charAt(0)==='@'){ buf=''; cur=0; menuSel=0; render(); }
      i++; continue;
    }
    if (ch==='\u0003'){ if (buf.length){ buf=''; cur=0; menuSel=0; render(); } else quit(); i++; continue; }
    if (ch==='\u0004'){ if (!buf.length) quit(); i++; continue; }
    if (ch==='\u0016'){ insertText(clip()); menuSel=0; i++; continue; }
    if (ch==='\u0015'){ buf=buf.slice(cur); cur=0; menuSel=0; i++; continue; }
    if (ch==='\u0001'){ cur=0; i++; continue; }
    if (ch==='\u0005'){ cur=buf.length; i++; continue; }
    if (ch==='\u0017'){ var bw=buf.slice(0,cur).replace(/[^\s]*\s*$/, ''); cur=bw.length; buf=bw+buf.slice(cur); menuSel=0; i++; continue; }
    if (ch==='\u0012'){ mode='search'; searchQ=''; searchHit=-1; render(); i++; continue; }
    if (ch==='\u000c'){ runCmd('/clear'); i++; continue; }
    if (ch==='\u0010'){ S.autoThink=false; if (S.reason){ S.collapseThink=!S.collapseThink; hardReflow(); } else render(); i++; continue; }
    if (ch==='\t'){
      var tl = menuList();
      if (tl.length){
        var pick = tl[Math.min(menuSel, tl.length-1)];
        buf = pick.c; cur = buf.length; menuSel = 0;
        render();
      }
      i++; continue;
    }
    if (mode==='search'){
      if (ch==='\r'){ var m=matchHist(); if(m!=null){ buf=m; cur=buf.length; } mode='input'; render(); i++; continue; }
      if (ch==='\u007f'){ searchQ=searchQ.slice(0,-1); render(); i++; continue; }
      if (ch>=' '){ searchQ+=ch; render(); i++; continue; }
      i++; continue;
    }
    if (ch==='\r'||ch==='\n'){ submit(); i++; continue; }
    if (ch==='\u007f'||ch==='\b'){ if(cur>0){ buf=buf.slice(0,cur-1)+buf.slice(cur); cur--; } i++; continue; }
    var cdx=s.codePointAt(i), ln=cdx>0xffff?2:1;
    if (cdx>=32){
      buf=buf.slice(0,cur)+s.substr(i,ln)+buf.slice(cur); cur+=ln; menuSel=0;
    }
    i+=ln;
  }
  render();
}
function matchHist(){ for (var i=hist.length-1;i>=0;i--){ if (hist[i].indexOf(searchQ)>=0) return hist[i]; } return null; }
function startTask(){
  if (!S.splash) return;
  S.splash=false;
  out('\u001b[2J\u001b[3J\u001b[H');
  var bpad=new Array(4+1).join(' ');
  var rows=buildBanner(termW(),animT,S.anim);
  out('\n\n');
  for(var i=0;i<rows.length;i++) out(bpad+rows[i]+'\n');
  out('\n\n'); nlCount=0; bannerBase=rows.length+4;
  prevPop=0; render();
}
function buildBanner(w,tick,style){
  var side=(w >= LOBW+TITW+12), bh=1+TITLE.length+1+1, g, tx, ty, i, c;
  function paintLob(g2, ox){
    var reveal=Math.min(1,(tick%60)/28), wipe=Math.min(LOBW,((tick*1.6)%(LOBW+8)));
    for (i=0;i<LOBSTER.length;i++){
      if (style===0 && i>reveal*LOBSTER.length) continue;
      var Ln=LOBSTER[i];
      for (c=0;c<Ln.length;c++){ var ch=Ln.charAt(c); if(ch===' ') continue;
        if (style===1 && c>wipe) continue;
        var cc=(style===2)? mix(RED_D,RED,0.55+0.45*Math.sin(tick/7+i*0.6)) : mix(RED_D,RED,i/9);
        g2.set(ox+c,i,ch,cc);
      }
    }
  }
  if (side){
    var x0=Math.max(1,Math.floor((w-(LOBW+4+TITW))/2));
    var h=Math.max(LOBSTER.length,bh);
    g=new Grid(w,h); tx=x0+LOBW+4; ty=Math.floor((h-bh)/2);
    paintLob(g,x0);
    g.str(tx,ty,'OPC-TUI v'+VERSION,MUTED);
    for (i=0;i<TITLE.length;i++){ var T=TITLE[i]; for (c=0;c<T.length;c++){ var c2=T.charAt(c); if(c2!==' ') g.set(tx+c,ty+1+i,c2,shineColor(c,TITW,tick*2)); } }
    g.str(tx,ty+1+TITLE.length, S.model+' \u00b7 '+S.mode, TEXT);
    g.str(tx,ty+2+TITLE.length, S.sessionKey+'  \u00b7  '+t('conn'), MUTED);
    g.str(tx,ty+3+TITLE.length, t('hint1'), MUTED);
    g.str(tx,ty+4+TITLE.length, t('hint2'), MUTED);
  } else {
    var h2=LOBSTER.length+2+bh; g=new Grid(w,h2);
    var lx=Math.max(0,Math.floor((w-LOBW)/2)); tx=Math.max(0,Math.floor((w-TITW)/2));
    paintLob(g,lx);
    ty=LOBSTER.length+2;
    g.str(tx,ty,'OPC-TUI v'+VERSION,MUTED);
    for (i=0;i<TITLE.length;i++){ var T2=TITLE[i]; for (c=0;c<T2.length;c++){ var c4=T2.charAt(c); if(c4!==' ') g.set(tx+c,ty+1+i,c4,shineColor(c,TITW,tick*2)); } }
    g.str(tx,ty+1+TITLE.length, S.model+' \u00b7 '+S.mode, TEXT);
    g.str(tx,ty+2+TITLE.length, S.sessionKey, MUTED);
    g.str(tx,ty+3+TITLE.length, t('hint1'), MUTED);
    g.str(tx,ty+4+TITLE.length, t('hint2'), MUTED);
  }
  var rows=[]; for (i=0;i<g.h;i++) rows.push(g.line(i));
  return rows;
}
function paintBanner(){
  if (!bannerOn||S.frozen||suspend) return;
  var rows=buildBanner(termW(),animT,2);
  var term=process.stdout.rows||30;
  var shift=Math.max(0,(bannerBase+nlCount)-term);
  var home=(1+2)-shift;
  if (home+rows.length<1){ bannerOn=false; return; }
  if (home<1) return;
  var o='\u001b7', bpad=new Array(4+1).join(' ');
  for (var i=0;i<rows.length;i++) o+='\u001b['+(home+i)+';1H\u001b[2K'+bpad+rows[i];
  o+='\u001b8';
  out(o);
}
function pickLine(){
  var parts=['1 '+t('anims')[0], '2 '+t('anims')[1], '3 '+t('anims')[2]], s=padL(PADX)+col(MUTED,t('pick')+': ')+col(RED,'\u25c0 ');
  for (var i=0;i<parts.length;i++) s += (i===S.anim ? colB(RED,'['+parts[i]+']') : ' '+col(MUTED,parts[i])+' ') + ' ';
  return s + col(RED,'\u25b6') + col(MUTED,'   Enter \u5f00\u59cb   \u00b7   '+t('wake'));
}
function paintPicker(){
  if (!S.splash || !bannerH || suspend) return;
  out('\u001b7\u001b['+(bannerH+2)+';1H\u001b[2K'+pickLine()+'\u001b8');
}
function startAnim(){ setInterval(function(){ if(!bannerOn||S.frozen) return; animT++; paintBanner(); paintPicker(); }, 90); }
// Single entry point for terminal resizes: silence every timer-driven write
// immediately, then do ONE authoritative full repaint once the size settles.
function onResize(){
  suspend = true;
  lastCols = process.stdout.columns || 80;
  if (resizeTimer) clearTimeout(resizeTimer);
  resizeTimer = setTimeout(function(){ resizeTimer = null; relayout(); }, 180);
}
function run(){
  ansi.detectTruecolor();
  gwInit();
  setInterval(function(){ refreshSession(); }, 2500);
  out('\u001b]0;\u25c6\ud83e\udd9e OPC-TUI\u0007');
  out('\u001b[?7l\u001b[2J\u001b[3J\u001b[H\u001b[?25l\u001b[?2004h');
  lastCols = process.stdout.columns || 80;
  var bpad=new Array(4+1).join(' ');
  var rows=buildBanner(termW(),animT,2);
  out('\n\n');
  for (var i=0;i<rows.length;i++) out(bpad+rows[i]+'\n');
  bannerH = rows.length;
  out('\n\n');
  nlCount=0; bannerBase=rows.length+4;
  out('\u001b[?25h');
  prevPop=0; render();
  startAnim();
  process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding('utf8');
  process.stdin.on('data', function(s){ try{ feed(s); }catch(e){ if (process.env.OPC_DEBUG) process.stderr.write('ERR '+e.message+'\n'); } });
  process.stdout.on('resize', onResize);
  process.on('SIGINT', function(){ quit(); });
  process.on('uncaughtException', function(e){ dbg('UNCAUGHT '+(e&&e.stack||e)); });
  process.on('unhandledRejection', function(e){ dbg('UNHANDLED '+(e&&e.stack||e)); });
}
module.exports = { run: run };
