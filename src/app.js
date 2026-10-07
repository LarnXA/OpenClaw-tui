'use strict';
var ansi = require('./ansi.js');
var scr = require('./screen.js');
var Screen = scr.Screen, strWidth = scr.strWidth;
var sprite = require('./sprite.js');
var live = require('./live.js');

var VERSION = require('../package.json').version;
var C = {
  bg:[8,9,13], panel:[13,15,21], panel2:[22,25,34], border:[30,36,50], line:[22,27,38],
  text:[217,222,234], soft:[174,182,198], muted:[124,134,153], dim:[74,83,104],
  brand:[255,77,77], brand2:[153,27,27], brand3:[255,138,138],
  cyan:[0,229,204], ok:[61,220,132], warn:[245,197,66], err:[240,104,95], info:[125,161,222]
};
var SPIN = ['\u280b','\u2819','\u2839','\u2838','\u283c','\u2834','\u2826','\u2827','\u2807','\u280f'];
var FONT = {
  'O':[' \u2588\u2588\u2588 ','\u2588   \u2588','\u2588   \u2588','\u2588   \u2588',' \u2588\u2588\u2588 '],
  'P':['\u2588\u2588\u2588\u2588 ','\u2588   \u2588','\u2588\u2588\u2588\u2588 ','\u2588    ','\u2588    '],
  'E':['\u2588\u2588\u2588\u2588\u2588','\u2588    ','\u2588\u2588\u2588\u2588 ','\u2588    ','\u2588\u2588\u2588\u2588\u2588'],
  'N':['\u2588   \u2588','\u2588\u2588  \u2588','\u2588 \u2588 \u2588','\u2588  \u2588\u2588','\u2588   \u2588'],
  'C':[' \u2588\u2588\u2588\u2588','\u2588    ','\u2588    ','\u2588    ',' \u2588\u2588\u2588\u2588'],
  'L':['\u2588    ','\u2588    ','\u2588    ','\u2588    ','\u2588\u2588\u2588\u2588\u2588'],
  'A':[' \u2588\u2588\u2588 ','\u2588   \u2588','\u2588\u2588\u2588\u2588\u2588','\u2588   \u2588','\u2588   \u2588'],
  'W':['\u2588   \u2588','\u2588   \u2588','\u2588 \u2588 \u2588','\u2588\u2588 \u2588\u2588','\u2588   \u2588'],
  ' ':['     ','     ','     ','     ','     ']
};
var TABS = ['\u4f1a\u8bdd','\u9762\u677f','\u4e0a\u4e0b\u6587','\u547d\u4ee4','\u8bbe\u7f6e'];
var CMDS = [
  ['/help','\u663e\u793a\u5e2e\u52a9'], ['/new','\u65b0\u5efa\u4f1a\u8bdd'], ['/model','\u67e5\u770b / \u5207\u6362\u6a21\u578b'],
  ['/status','\u7f51\u5173\u4e0e\u8fd0\u884c\u72b6\u6001'], ['/agents','\u5217\u51fa agent'], ['/sessions','\u4f1a\u8bdd\u603b\u89c8'],
  ['/context','\u4e0a\u4e0b\u6587\u52a0\u8f7d\u6458\u8981'], ['/clear','\u6e05\u7a7a\u5f53\u524d\u89c6\u56fe'],
  ['/compact','\u538b\u7f29\u4e0a\u4e0b\u6587'], ['/resume','\u65f6\u95f4\u56de\u6eaf / \u6062\u590d'],
  ['/theme','\u5207\u6362\u6d45\u8272 / \u6df1\u8272'], ['/settings','\u6253\u5f00\u8bbe\u7f6e'],
  ['/balance','\u7528\u91cf\u4e0e\u4f59\u989d'], ['/update','\u68c0\u67e5\u66f4\u65b0'], ['/quit','\u9000\u51fa']
];
var SETTINGS = [
  ['token \u603b\u91cf', true], ['git \u5206\u652f', true], ['\u6a21\u5f0f', true],
  ['\u6d3b\u52a8\u6458\u8981', true], ['\u8f93\u5165\u7f13\u5b58', true], ['\u541e\u5410 TPS', true]
];
function mix(a,b,t){ t=Math.max(0,Math.min(1,t)); return [Math.round(a[0]+(b[0]-a[0])*t),Math.round(a[1]+(b[1]-a[1])*t),Math.round(a[2]+(b[2]-a[2])*t)]; }
function pad2(n){ return (n<10?'0':'')+n; }
function grp(n){ var s=String(n), o='', c=0; for(var i=s.length-1;i>=0;i--){ o=s[i]+o; if(++c%3===0&&i>0) o=','+o; } return o; }
function hex8(){ var s='',h='0123456789abcdef'; for(var i=0;i<8;i++) s+=h[Math.floor(Math.random()*16)]; return s; }
function gitBranch(){ try{ var cp=require('child_process'); var s=cp.execSync('git rev-parse --abbrev-ref HEAD',{cwd:process.cwd(),stdio:['ignore','pipe','ignore'],timeout:1500}).toString().trim(); return s||'\u2014'; }catch(e){ return '\u2014'; } }

function App(){
  this.out=process.stdout;
  this.sc=new Screen(this.out);
  this.st={ view:'splash', ctx:0, ctxTokens:0, ctxWindow:0, cost:0, conn:'?', tps:0, tokens:0, cache:87, model:'deepseek-v4-pro',
    mode:'max', effort:'Max effort', agent:'main', session:hex8(), cwd:process.cwd(),
    git:gitBranch(), startedAt:Date.now(), input:'', cur:0, hist:[], hi:0,
    menu:false, menuSel:0, showRewind:false, showHelp:false, busy:false, stateTxt:'\u5c31\u7eea',
    activity:'\u7a7a\u95f2', phase:0, scroll:1e9, tab:0, sel:[0,0,0,0,0], exited:false, expanded:false };
  this.rows=[];
  this.todos=[];
  this.ctxInfo={ system:12, runtime:3, tools:26 };
  this.timers=[];
  this.gw=null; this.gwErr=null; this.gwSid=null; this.gwPort=null;
  this.sessionKey=process.env.OPC_SESSION_KEY||'agent:main:opc-tui-full';
  this.streamRun=null; this.thinkText=''; this.thinkRowStart=-1; this.thinkRowEnd=-1; this.ansText=''; this.ansRowStart=-1; this.ansRowEnd=-1; this.ansItemId=''; this.toolRows={};
}
App.prototype.row=function(segs){ this.rows.push(segs||[]); };
App.prototype.wrapPush=function(segs,width){
  var line=[], w=0, out=[];
  for(var i=0;i<segs.length;i++){
    var s=segs[i], t=String(s.t), buf='';
    for(var k=0;k<t.length;k++){
      var cp=t.codePointAt(k); if(cp>0xffff)k++;
      var ch=String.fromCodePoint(cp), cw=scr.cw(cp);
      if(w+cw>width){ out.push(line.concat(buf?[{t:buf,fg:s.fg,b:s.b}]:[])); line=[]; buf=''; w=0; }
      buf+=ch; w+=cw;
    }
    if(buf) line.push({t:buf,fg:s.fg,b:s.b});
  }
  out.push(line);
  for(var j=0;j<out.length;j++) this.row(out[j]);
};
App.prototype.session=function(){
  var self=this;
  this.out.write(ansi.U.altOn+ansi.U.curHide+ansi.U.mouseOn+ansi.U.clear+ansi.U.home);
  process.stdin.setRawMode(true); process.stdin.resume(); process.stdin.setEncoding('utf8');
  process.stdout.on('resize', function(){ self.render(); });
  process.stdin.on('data', function(s){ self.onData(s); });
  this.render();
  this.gwStart();
  this.loop=setInterval(function(){ self.st.phase++; self.render(); }, 80);
};
App.prototype.teardown=function(){
  if(this.st.exited) return; this.st.exited=true;
  for(var i=0;i<this.timers.length;i++){ clearTimeout(this.timers[i]); clearInterval(this.timers[i]); }
  if(this.loop) clearInterval(this.loop);
  if(this.liveTimer) clearInterval(this.liveTimer);
  if(this.gw){ try{ this.gw.stop(); }catch(e){} }
  try{ process.stdin.setRawMode(false); }catch(e){}
  process.stdin.pause();
  this.out.write(ansi.U.mouseOff+ansi.U.curShow+ansi.U.reset+ansi.U.altOff);
};
App.prototype.later=function(ms,fn){ var self=this; var id=setTimeout(function(){ if(!self.st.exited) fn(); },ms); this.timers.push(id); return id; };

/* ---------------- render ---------------- */
App.prototype.render=function(){
  var w=this.out.columns||80, h=this.out.rows||24;
  this.sc.resize(w,h); this.sc.clear(null,C.bg);
  if(this.st.view==='splash') this.renderSplash(w,h); else this.renderWork(w,h);
  if(this.st.showRewind) this.renderOverlay(w,h,'rewind');
  if(this.st.showHelp) this.renderOverlay(w,h,'help');
  this.sc.render();
};
App.prototype.drawBigText=function(x,y,txt,shine){
  var letters=[], i, r, c, col;
  for(i=0;i<txt.length;i++) letters.push(FONT[txt[i]]||FONT[' ']);
  var totalW=letters.length*6-1;
  for(r=0;r<5;r++){
    col=0;
    for(i=0;i<letters.length;i++){
      var gl=letters[i][r];
      for(c=0;c<gl.length;c++){
        if(gl[c]!=='\u2588'){ col++; continue; }
        var tt=totalW>1?col/(totalW-1):0;
        var base=mix(C.brand2,C.brand,tt);
        var d=Math.abs(((col+shine)%34)-17)/17;
        var cl=mix(base,[255,226,226],Math.max(0,1-d)*0.9);
        this.sc.put(x+col,y+r,'\u2588',cl,null,false); col++;
      }
      col++;
    }
  }
  return totalW;
};
App.prototype.renderSplash=function(w,h){
  var p=this.st.phase;
  var top=Math.max(1,Math.floor((h-20)/2));
  var lx=Math.max(2,Math.floor((w-52)/2));
  var float=(p%44<22)?0:-1;
  sprite.drawScaled(this.sc,lx,top+Math.max(0,float),52,18,{snap:(p%40<2),blink:(p%28<2)});
  var bw=47, bx=Math.max(1,Math.floor((w-bw)/2));
  this.drawBigText(bx,top+10,'OPENCLAW',p*2);
  var line2=this.center(w,'OpenClaw  Harness   \u00b7   \u7ec8\u7aef\u4ea4\u4e92');
  this.sc.text(line2,top+16,'OpenClaw  Harness   \u00b7   \u7ec8\u7aef\u4ea4\u4e92',C.brand3,null,true);
  var tag='\u8ba9\u667a\u80fd\u62b5\u8fbe\u6bcf\u4e2a\u901a\u9053\uff01';
  if(h>top+18) this.sc.text(this.center(w,tag),top+17,tag,C.text,null,true);
  var meta=this.st.model+'   \u00b7   '+this.st.effort+'   \u00b7   '+this.st.cwd;
  if(h>top+19&&w>=60) this.sc.text(this.center(w,meta),top+19,meta,C.muted);
  var ctxt='\u5df2\u52a0\u8f7d\u4e0a\u4e0b\u6587  \u00b7  \u7cfb\u7edf\u63d0\u793a\u8bcd '+this.ctxInfo.system+' \u6bb5  \u00b7  \u8fd0\u884c\u65f6\u4e0a\u4e0b\u6587 '+this.ctxInfo.runtime+' \u9879  \u00b7  \u5de5\u5177 '+this.ctxInfo.tools;
  if(h>top+20&&w>=70) this.sc.text(this.center(w,ctxt),top+20,ctxt,C.soft);
  if(top+22<h){ var hint='\u63d0\u793a\uff1a\u5e95\u680f\u5b57\u6bb5\u9010\u9879\u5f00\u5173\uff08token \u603b\u91cf / git \u5206\u652f / \u6a21\u5f0f / \u6d3b\u52a8\u6458\u8981\uff09\u2014 \u5728 /settings \u91cc\u914d\u3002/tips \u66f4\u591a\u6280\u5de7';
    if(w>=90) this.sc.text(this.center(w,hint),top+22,hint,C.dim); }
  if(h>3){ var go='\u6309\u4efb\u610f\u952e\u8fdb\u5165  \u00b7  (Ctrl+P \u5c55\u5f00)  \u00b7  v'+VERSION;
    this.sc.text(this.center(w,go),h-2,go,C.soft); }
};
App.prototype.center=function(w,s){ return Math.max(0,Math.floor((w-strWidth(s))/2)); };

App.prototype.renderWork=function(w,h){
  var st=this.st, x, i;
  for(x=0;x<w;x++) this.sc.put(x,0,' ',null,C.panel2);
  this.sc.text(1,0,'\u258c OPENCLAW TUI',C.brand3,null,true);
  var clock=new Date();
  var gc=(st.conn==='ok')?C.ok:((st.conn==='x')?C.err:C.warn); var gtxt=(st.conn==='ok')?'online':((st.conn==='x')?'offline':'connecting'); var rt='gateway \u25cf '+gtxt+'   '+pad2(clock.getHours())+':'+pad2(clock.getMinutes())+':'+pad2(clock.getSeconds())+'  ';
  this.sc.text(Math.max(0,w-strWidth(rt)-1),0,rt,gc);
  var mid='OpenClaw Harness \u00b7 v'+VERSION+'  ';
  if(w>62) this.sc.text(Math.max(18,Math.floor((w-strWidth(mid))/2)),0,mid,C.soft);
  this.sc.hline(0,1,w,'\u2500',C.border);

  var bStat=h-5, bTab=h-4, bIn=h-3, bFoot=h-2, bProg=h-1;
  var top=2, visible=Math.max(1,bStat-top);
  var sidebar=w>=92, sbW=sidebar?30:0, cW=sidebar?(w-sbW-3):(w-2);

  // content
  var maxStart=Math.max(0,this.rows.length-visible);
  this._maxStart=maxStart;
  var start;
  if(st.scroll>=1e8){ start=maxStart; }
  else { st.scroll=Math.max(0,Math.min(maxStart,st.scroll)); start=st.scroll; }
  for(i=0;i<visible;i++){
    var r=this.rows[start+i]; if(!r) continue;
    var cx=1;
    for(var s=0;s<r.length;s++){ if(cx-1>=cW) break; cx=this.sc.text(cx,top+i,r[s].t,r[s].fg,null,r[s].b); }
  }
  if(this.rows.length>visible){
    var frac=maxStart>0?start/maxStart:1;
    this.sc.put(w-1,top+Math.round((1-frac)*(visible-1)),'\u2503',C.brand);
  }
  if(sidebar){
    var sx=w-sbW-1;
    this.sc.vline(sx-1,top,visible,'\u2502',C.border);
    this.drawPane(sx+1,top,sbW-1,visible);
  }
  // status line
  for(x=0;x<w;x++) this.sc.put(x,bStat,' ',null,C.panel);
  var sp=st.busy?SPIN[st.phase%SPIN.length]:'\u25cf';
  this.sc.text(1,bStat,sp,st.busy?C.brand3:C.ok,null,false);
  this.sc.text(3,bStat,st.stateTxt,C.text);
  var act='\u6d3b\u52a8\uff1a'+st.activity;
  this.sc.text(Math.max(10,Math.floor(w/2)-6),bStat,act,C.muted);
  var rt2='ctx '+Math.round(st.ctx)+'%   tps '+st.tps.toFixed(1)+'   ';
  this.sc.text(Math.max(1,w-strWidth(rt2)-1),bStat,rt2,C.muted);
  // tab bar
  this.drawTabBar(0,bTab,w);
  // composer
  this.sc.text(1,bIn,'\u276f',C.cyan,null,true);
  var vis=st.input, maxw=w-6;
  while(strWidth(vis)>maxw) vis=vis.slice(1);
  this.sc.text(3,bIn,vis,C.text);
  if(st.phase%8<5){ var ccx=3+strWidth(vis.slice(0,Math.min(st.cur,vis.length))); if(ccx<w-1) this.sc.put(ccx,bIn,'\u2588',C.cyan); }
  // footer fields (below input)
  this.drawFooter(0,bFoot,w);
  // progress row
  this.sc.bar(2,bProg,Math.max(6,w-34),st.ctx/100,C.brand2,C.brand3,C.line);
  this.sc.text(w-30,bProg,'\u4e0a\u4e0b\u6587 '+Math.round(st.ctx)+'%   TPS '+st.tps.toFixed(0)+'  ',C.muted);
  // menu
  if(st.menu) this.drawMenu(w,h,bIn);
};
App.prototype.drawTabBar=function(x0,y,w){
  for(var x=0;x<w;x++) this.sc.put(x,y,' ',null,C.panel);
  this.sc.text(1,y,'\u25c0',C.dim); this.sc.text(3,y,'\u25b6',C.dim);
  var cx=5;
  for(var i=0;i<TABS.length;i++){
    var active=(i===this.st.tab);
    var label=' '+TABS[i]+' ';
    if(active) for(var f=0;f<strWidth(label)+2;f++) this.sc.put(cx-1+f,y,' ',null,C.panel2);
    this.sc.text(cx,y,label,active?C.brand3:C.muted,null,active);
    cx+=strWidth(label)+2;
    if(cx>w-4) break;
  }
  var tip='\u2190\u2192 \u5207\u9875   \u2191\u2193 \u9009\u62e9   Enter \u786e\u8ba4';
  if(w-cx>strWidth(tip)+2) this.sc.text(w-strWidth(tip)-1,y,tip,C.dim);
};
App.prototype.drawFooter=function(x0,y,w){
  for(var x=0;x<w;x++) this.sc.put(x,y,' ',null,C.panel2);
  var st=this.st, parts=[], on=SETTINGS;
  function f(i){ return on[i]&&on[i][1]; }
  parts.push({t:' \u25c6 ',fg:C.brand3});
  parts.push({t:st.model,fg:C.text,b:true});
  if(f(0)) parts.push({t:'  \u00b7  tokens ',fg:C.dim},{t:grp(st.tokens),fg:C.soft});
  if(f(1)) parts.push({t:'  \u00b7  git ',fg:C.dim},{t:st.git,fg:C.cya||C.soft});
  if(f(2)) parts.push({t:'  \u00b7  \u6a21\u5f0f ',fg:C.dim},{t:st.mode,fg:C.warn});
  if(f(4)) parts.push({t:'  \u00b7  \u8f93\u5165\u7f13\u5b58 ',fg:C.dim},{t:st.cache+'%',fg:C.ok});
  if(f(5)) parts.push({t:'  \u00b7  tps ',fg:C.dim},{t:st.tps.toFixed(1),fg:C.soft});
  if(f(3)) parts.push({t:'  \u00b7  ',fg:C.dim},{t:st.activity,fg:C.muted});
  var cx=1;
  for(var i=0;i<parts.length;i++){ if(cx>=w-1) break; cx=this.sc.text(cx,y,parts[i].t,parts[i].fg,null,parts[i].b); }
};
App.prototype.drawPane=function(x,y,w,h){
  var st=this.st, r=0, i;
  sprite.drawScaled(this.sc,x,y,13,6,{snap:(st.phase%40<2),blink:(st.phase%28<2)});
  r=3;
  var title=TABS[st.tab];
  this.sc.text(x,y+r,'\u25b8 '+title,C.brand3,null,true); r++;
  if(st.tab===0){
    var L=[['agent',st.agent],['session',st.session],['model',st.model],['\u6a21\u5f0f',st.mode],['cwd',st.cwd],
           ['\u8fd0\u884c',pad2(Math.floor((Date.now()-st.startedAt)/60000))+':'+pad2(Math.floor((Date.now()-st.startedAt)/1000)%60)]];
    for(i=0;i<L.length&&r<h;i++){ this.sc.text(x,y+r,L[i][0],C.dim); this.sc.text(x+9,y+r,String(L[i][1]).slice(0,Math.max(4,w-10)),C.soft); r++; }
  } else if(st.tab===1){
    for(i=0;i<this.todos.length&&r<h;i++){
      var it=this.todos[i], sel=(st.sel[1]===i);
      var mark=it.s===1?'[\u2713]':(it.s===0?'[\u25b8]':'[ ]');
      var col=it.s===1?C.ok:(it.s===0?C.brand3:C.dim);
      if(sel) for(var q=0;q<w;q++) this.sc.put(x+q,y+r,' ',null,C.panel);
      this.sc.text(x,y+r,mark,col); this.sc.text(x+4,y+r,it.t,it.s===1?C.dim:C.text,null,sel); r++;
    }
  } else if(st.tab===2){
    this.sc.text(x,y+r,'\u4e0a\u4e0b\u6587\u7a97\u53e3',C.dim); r++;
    this.sc.bar(x,y+r,w-1,st.ctx/100,C.brand2,C.brand3,C.line); r++;
    this.sc.text(x,y+r,Math.round(st.ctx)+'%  / 32768 tokens',C.muted); r++;
    this.sc.text(x,y+r,'\u7cfb\u7edf\u63d0\u793a\u8bcd  '+this.ctxInfo.system+' \u6bb5',C.soft); r++;
    this.sc.text(x,y+r,'\u8fd0\u884c\u65f6\u4e0a\u4e0b\u6587  '+this.ctxInfo.runtime+' \u9879',C.soft); r++;
    this.sc.text(x,y+r,'\u5de5\u5177  '+this.ctxInfo.tools,C.soft); r++;
    this.sc.text(x,y+r,'\u8f93\u5165\u7f13\u5b58  '+st.cache+'%',C.ok); r++;
  } else if(st.tab===3){
    for(i=0;i<CMDS.length&&r<h;i++){
      var sel3=(st.sel[3]===i);
      if(sel3) for(var q3=0;q3<w;q3++) this.sc.put(x+q3,y+r,' ',null,C.panel);
      this.sc.text(x,y+r,CMDS[i][0],sel3?C.brand3:C.soft,null,sel3); r++;
    }
  } else {
    for(i=0;i<SETTINGS.length&&r<h;i++){
      var sel4=(st.sel[4]===i);
      if(sel4) for(var q4=0;q4<w;q4++) this.sc.put(x+q4,y+r,' ',null,C.panel);
      var box=SETTINGS[i][1]?'[\u2713]':'[ ]';
      this.sc.text(x,y+r,box,SETTINGS[i][1]?C.ok:C.dim);
      this.sc.text(x+4,y+r,SETTINGS[i][0],sel4?C.text:C.muted,null,sel4); r++;
    }
  }
};
App.prototype.drawMenu=function(w,h,bIn){
  var list=CMDS.filter(function(c){ return c[0].indexOf(this.st.input)===0; },this);
  if(!list.length) return;
  this.menuList=list;
  var mh=Math.min(list.length,7), mw=Math.min(48,w-4), my=bIn-1-mh, mx=2;
  var top=Math.max(0,Math.min(this.st.menuSel-Math.floor(mh/2),list.length-mh));
  this.menuTop=top;
  this.sc.box(mx,my,mw,mh+2,C.border,C.panel);
  for(var i=0;i<mh;i++){
    var idx=top+i; if(idx>=list.length) break;
    var sel=(idx===this.st.menuSel);
    if(sel) for(var f=0;f<mw-2;f++) this.sc.put(mx+1+f,my+1+i,' ',null,C.panel2);
    this.sc.text(mx+2,my+1+i,list[idx][0],sel?C.brand3:C.soft,sel?C.panel2:null,sel);
    this.sc.text(mx+17,my+1+i,list[idx][1],sel?C.text:C.muted,sel?C.panel2:null);
  }
  if(list.length>mh){
    var frac=list.length>1?(this.st.menuSel/(list.length-1)):1;
    this.sc.put(mx+mw-1,my+1+Math.round(frac*(mh-1)),'\u2503',C.brand);
  }
};
App.prototype.renderOverlay=function(w,h,kind){
  var pw=Math.min(kind==='help'?62:60,w-6), ph=Math.min(kind==='help'?16:11,h-3);
  var px=Math.floor((w-pw)/2), py=Math.floor((h-ph)/2), i;
  this.sc.box(px,py,pw,ph,C.border,C.panel);
  if(kind==='rewind'){
    this.sc.text(px+2,py+1,'\u65f6\u95f4\u56de\u6eaf  REWIND',C.brand3,null,true);
    var it=['刚刚      发送消息','-1 分钟   调用工具','-3 分钟   思考','-8 分钟   会话开始'];
    for(i=0;i<it.length&&i<ph-3;i++) this.sc.text(px+2,py+3+i,it[i],C.soft);
  } else {
    this.sc.text(px+2,py+1,'\u5e2e\u52a9  HELP',C.brand3,null,true);
    var L=['OpenClaw \u4e13\u5c5e TUI \u00b7 Claude Code \u98ce\u683c\u5168\u5c4f\u7ec8\u7aef','',
      '\u5e95\u680f\u5b57\u6bb5\uff1amodel / tokens / git / \u6a21\u5f0f / \u8f93\u5165\u7f13\u5b58 / tps','',
      '/ \u547d\u4ee4\u9762\u677f  \u2191\u2193\u9009\u62e9  Enter \u786e\u8ba4','',
      '\u2190\u2192 \u5207\u6362\u4fa7\u680f\u9875\u7b7e\uff0c\u2191\u2193 \u9009\u62e9\u6761\u76ee','',
      'Esc Esc \u65f6\u95f4\u56de\u6eaf \u00b7 t \u4e3b\u9898 \u00b7 Ctrl+C \u9000\u51fa'];
    for(i=0;i<L.length&&i<ph-3;i++) this.sc.text(px+3,py+3+i,L[i],i===0?C.text:C.soft);
  }
  this.sc.text(px+2,py+ph-1,'[Esc] \u5173\u95ed',C.dim);
};

/* ---------------- input ---------------- */
App.prototype.onMouse=function(seq){
  if(seq.charAt(0)!=='['||seq.charAt(1)!=='<'||seq.charAt(seq.length-1)!=='M') return;
  var parts=seq.slice(2,seq.length-1).split(';');
  if(parts.length<3) return;
  var b=parseInt(parts[0],10);
  if(!(b&64)) return;
  var up=((b&1)===0);
  if(this.st.menu) this.menuMove(up?-1:1);
  else this.scrollBy(up?-3:3);
};
App.prototype.menuMove=function(d){
  if(!this.st.menu) return;
  var n=(this.menuList&&this.menuList.length)||CMDS.length;
  this.st.menuSel=Math.max(0,Math.min(n-1,this.st.menuSel+d));
  this.render();
};
App.prototype.scrollBy=function(d){
  var st=this.st, maxStart=this._maxStart||0;
  var cur=(st.scroll>=1e8)?maxStart:st.scroll;
  st.scroll=Math.max(0,Math.min(maxStart,cur+d));
  if(st.scroll>=maxStart) st.scroll=1e9;
};
App.prototype.onData=function(s){
  var st=this.st, i=0;
  while(i<s.length){
    var ch=s[i];
    if(ch==='\u001b'){
      var rest=s.slice(i+1);
      if(rest[0]==='['){
        var j=1;
        while(j<rest.length){ var cc=rest.charCodeAt(j); if(cc>=0x40&&cc<=0x7e) break; j++; }
        var seq=rest.slice(0,j+1), fin=rest[j];
        if(fin==='A') this.keyUp(); else if(fin==='B') this.keyDown();
        else if(fin==='C') this.keyRight(); else if(fin==='D') this.keyLeft();
        else if(fin==='H') st.cur=0; else if(fin==='F') st.cur=st.input.length;
        else if(fin==='M'||fin==='m') this.onMouse(seq);
        i += 1 + (j + 1);
        continue;
      }
      this.keyEsc(); i+=1; continue;
    }
    if(ch==='\u0003'){ this.teardown(); process.exit(0); }
    if(ch==='\u0010'){ st.expanded=!st.expanded; i++; continue; }
    if(ch==='\r'||ch==='\n'){ this.keyEnter(); i++; continue; }
    if(ch==='\u007f'||ch==='\b'){ this.keyBack(); i++; continue; }
    if(ch==='\t'){ i++; continue; }
    var cp=s.codePointAt(i); var ln=cp>0xffff?2:1;
    this.keyChar(s.substr(i,ln)); i+=ln;
  }
};
App.prototype.keyChar=function(c){
  var st=this.st;
  if(st.input.length<400){ st.input=st.input.slice(0,st.cur)+c+st.input.slice(st.cur); st.cur+=1; }
  st.menu=st.input.charAt(0)==='/'; if(st.menu) st.menuSel=0;
};
App.prototype.keyBack=function(){ var st=this.st; if(st.cur>0){ st.input=st.input.slice(0,st.cur-1)+st.input.slice(st.cur); st.cur--; } if(st.input.charAt(0)!=='/') st.menu=false; };
App.prototype.keyLeft=function(){ var st=this.st; if(st.menu) return; if(strWidth(st.input)>0){ if(st.cur>0) st.cur--; } else st.tab=(st.tab+TABS.length-1)%TABS.length; };
App.prototype.keyRight=function(){ var st=this.st; if(st.menu) return; if(strWidth(st.input)>0){ if(st.cur<st.input.length) st.cur++; } else st.tab=(st.tab+1)%TABS.length; };
App.prototype.listLen=function(){ var st=this.st; if(st.tab===1) return this.todos.length; if(st.tab===3) return CMDS.length; if(st.tab===4) return SETTINGS.length; return 0; };
App.prototype.keyUp=function(){
  var st=this.st;
  if(st.menu){ st.menuSel=Math.max(0,st.menuSel-1); return; }
  if(strWidth(st.input)===0&&this.listLen()>0){ st.sel[st.tab]=Math.max(0,st.sel[st.tab]-1); return; }
  if(st.hi>0){ st.hi--; st.input=st.hist[st.hi]; st.cur=st.input.length; }
};
App.prototype.keyDown=function(){
  var st=this.st;
  if(st.menu){ var n=(this.menuList&&this.menuList.length)||CMDS.length; st.menuSel=Math.min(n-1,st.menuSel+1); return; }
  if(strWidth(st.input)===0&&this.listLen()>0){ st.sel[st.tab]=Math.min(this.listLen()-1,st.sel[st.tab]+1); return; }
  if(st.hi<st.hist.length-1){ st.hi++; st.input=st.hist[st.hi]; st.cur=st.input.length; }
  else { st.hi=st.hist.length; st.input=''; st.cur=0; }
};
App.prototype.keyEsc=function(){
  var st=this.st, now=Date.now();
  if(st.showRewind){ st.showRewind=false; return; }
  if(st.showHelp){ st.showHelp=false; return; }
  if(st.menu){ st.menu=false; return; }
  if(this._esc&&now-this._esc<450){ this._esc=0; st.showRewind=true; return; }
  this._esc=now;
};
App.prototype.keyEnter=function(){
  var st=this.st;
  if(st.view==='splash'){
    st.view='work';
    this.row([{t:'OpenClaw TUI · session '+st.session+' · agent '+st.agent+' · '+st.model,fg:C.muted}]);
    this.row([]);
    this.row([{t:'输入消息开始聊天，或输 / 查看命令',fg:C.dim}]);
    return;
  }
  if(st.menu&&this.menuList&&this.menuList.length){ this.submit(this.menuList[st.menuSel][0]); return; }
  if(strWidth(st.input)===0){
    if(st.tab===3){ this.submit(CMDS[st.sel[3]][0]); return; }
    if(st.tab===4){ SETTINGS[st.sel[4]][1]=!SETTINGS[st.sel[4]][1]; return; }
    return;
  }
  this.submit(st.input.trim());
};
App.prototype.submit=function(v){
  var st=this.st;
  if(!v) return;
  st.menu=false; st.hist.push(v); st.hi=st.hist.length; st.input=''; st.cur=0;
  if(v.charAt(0)==='/'){ this.runCmd(v); return; }
  this.sendText(v);
};
App.prototype.pushUser=function(t){ this.row([{t:'\u276f ',fg:C.cyan,b:true},{t:t,fg:C.text,b:true}]); this.row([]); };
App.prototype.gwStart=function(){
  var self=this;
  live.connect({
    onHello: function(){ self.st.conn='ok'; self.render(); },
    onError: function(m){ self.st.conn='x'; self.gwErr=m; self.render(); },
    onEvent: function(ev){ self.onGwEvent(ev); }
  }).then(function(r){
    self.gw=r.gw; self.gwPort=r.cfg&&r.cfg.port; self.gwErr=null;
    self.sessionKey=process.env.OPC_SESSION_KEY||'agent:main:opc-tui-full';
    return self.gw.request('sessions.create',{key:self.sessionKey});
  }).then(function(cr){
    if(cr&&cr.sessionId) self.gwSid=cr.sessionId;
    if(cr&&cr.key) self.sessionKey=cr.key;
    return self.gw.request('sessions.list',{}).catch(function(){ return null; });
  }).then(function(list){
    if(list) self.applySessions(list);
    self.row([{t:'\u2713 \u5df2\u8fde\u63a5\u7f51\u5173 \u00b7 \u4f1a\u8bdd '+self.sessionKey,fg:C.ok}]);
    self.row([{t:'\u8f93\u5165\u6d88\u606f\u5f00\u59cb\u804a\u5929\uff0c\u6216\u8f93 / \u67e5\u770b\u547d\u4ee4\u3002',fg:C.dim}]);
    self.render();
  }).catch(function(e){
    self.st.conn='x'; self.gwErr=String(e&&e.message||e);
    self.row([{t:'\u2717 \u7f51\u5173\u8fde\u63a5\u5931\u8d25\uff1a'+self.gwErr,fg:C.err}]);
    self.render();
  });
  if(this.liveTimer) clearInterval(this.liveTimer);
  this.liveTimer=setInterval(function(){ self.livePoll(); }, 1600);
};
App.prototype.livePoll=function(){
  var self=this, st=this.st;
  if(!this.gw||!this.gw.state.connected) return;
  this._tick=(this._tick||0)+1;
  if(!st.busy && this._tick%3!==0) return;
  this.gw.request('sessions.list',{}).then(function(r){ self.applySessions(r); }).catch(function(){});
};
App.prototype.applySessions=function(r){
  var st=this.st, arr=(r&&r.sessions)||[], e=null, i;
  for(i=0;i<arr.length;i++){ if(arr[i].key===this.sessionKey){ e=arr[i]; break; } }
  if(!e) return;
  if(typeof e.totalTokens==='number') st.tokens=e.totalTokens;
  if(typeof e.inputTokens==='number') st.ctxTokens=e.inputTokens;
  if(typeof e.outputTokens==='number') st.outTokens=e.outputTokens;
  if(typeof e.contextTokens==='number'&&e.contextTokens>0) st.ctxWindow=e.contextTokens;
  if(typeof e.estimatedCostUsd==='number') st.cost=e.estimatedCostUsd;
  if(e.model) st.model=e.model;
  if(e.modelProvider&&e.model) st.modelFull=e.modelProvider+'/'+e.model;
  st.ctx=Math.min(100,Math.round(100*(st.ctxTokens/(st.ctxWindow||32768))));
  this.render();
};
App.prototype.onGwEvent=function(ev){
  try{
    var st=this.st, p=ev&&ev.payload; if(!p) return;
    if(ev.event!=='agent'&&ev.event!=='chat') return;
    var sk=p.sessionKey||'', mine=false;
    if(this.streamRun&&p.runId===this.streamRun) mine=true;
    else if(sk&&sk===this.sessionKey) mine=true;
    if(!mine) return;
    var d=p.data||{};
    if(!this.streamRun&&typeof p.runId==='string'&&p.runId) this.streamRun=p.runId;
    if(ev.event==='chat'){
      if(typeof p.deltaText==='string'&&p.deltaText){ this.ansText=p.deltaText; this.paintAnswer(); }
      if(p.state==='final'&&st.busy) this.finishTurn();
      return;
    }
    if(p.stream==='run_status'){
      var ph=String((d&&d.phase)||'');
      st.stateTxt=(ph==='preparing_workspace')?'\u51c6\u5907\u5de5\u4f5c\u533a':((ph==='preparing_context')?'\u88c5\u914d\u4e0a\u4e0b\u6587':(ph||'\u8fd0\u884c\u4e2d'));
      this.render(); return;
    }
    if(p.stream==='thinking'){
      var rt;
      if(typeof d.text==='string'&&d.text){ if(!this.thinkText||d.text.indexOf(this.thinkText)===0) rt=d.text; else rt=String(this.thinkText)+String(d.delta||d.text); }
      else rt=String(this.thinkText||'')+String(d.delta||'');
      this.thinkText=rt; this.paintThink(); return;
    }
    if(p.stream==='assistant'){
      if(typeof d.itemId==='string'&&d.itemId&&d.itemId!==this.ansItemId){ this.ansItemId=d.itemId; this.ansText=''; this.ansRowStart=-1; this.ansRowEnd=-1; }
      if(typeof d.text==='string'&&d.text){ if(!this.ansText||d.text.indexOf(this.ansText)===0) this.ansText=d.text; else this.ansText=this.ansText+String(d.delta||d.text); }
      else this.ansText=String(this.ansText||'')+String(d.delta||'');
      this.paintAnswer();
      return;
    }
    if(p.stream==='usage'){ if(typeof d.outputTokens==='number') st.outTokens=d.outputTokens; return; }
    if(p.stream==='item'&&d){ this.paintTool(d); return; }
    if(p.stream==='lifecycle'){ if(d.phase==='end'&&st.busy) this.finishTurn(); return; }
  }catch(e){}
};
App.prototype.paintThink=function(){
  var txt=String(this.thinkText||'');
  var cols=this.out.columns||80, cW=(cols>=92)?(cols-33):(cols-2);
  if(!(this.thinkRowStart>=0&&this.thinkRowEnd===this.rows.length)) this.thinkRowStart=this.rows.length;
  else this.rows.length=this.thinkRowStart;
  this.wrapPush([{t:'\u273b ',fg:C.brand3},{t:txt.slice(-900),fg:C.muted}], Math.max(10,cW));
  this.thinkRowEnd=this.rows.length;
  this.render();
};
App.prototype.paintAnswer=function(){
  var txt=String(this.ansText||''); if(!txt) return;
  var cols=this.out.columns||80, cW=(cols>=92)?(cols-33):(cols-2);
  if(!(this.ansRowStart>=0&&this.ansRowEnd===this.rows.length)) this.ansRowStart=this.rows.length;
  else this.rows.length=this.ansRowStart;
  this.wrapPush([{t:txt,fg:C.text}], Math.max(10,cW));
  this.ansRowEnd=this.rows.length;
  this.render();
};
App.prototype.paintTool=function(d){
  var nm=d.title||d.name||d.kind||'tool', ph=d.phase||'';
  var end=(ph==='end'), failed=end&&/fail|error|cancel|abort/i.test(String(d.status||''));
  var id=d.itemId||d.toolCallId||nm;
  if(!this.toolRows) this.toolRows={};
  var seg=[{t:'\u25b8 ',fg:C.brand3,b:true},{t:nm,fg:C.soft},{t:'   '+(end?(failed?'\u2717 \u5931\u8d25':'\u2713 \u5b8c\u6210'):(ph||'\u8fd0\u884c\u4e2d')),fg:end?(failed?C.err:C.ok):C.muted}];
  var ref=this.toolRows[id];
  if(!ref){ ref=[]; this.rows.push(ref); this.toolRows[id]=ref; }
  ref.length=0;
  for(var i=0;i<seg.length;i++) ref.push(seg[i]);
  this.render();
};
App.prototype.sendText=function(text){
  var self=this, st=this.st;
  this.pushUser(text);
  if(!this.gw||!this.gw.state.connected){ this.row([{t:'\u2717 \u7f51\u5173\u672a\u8fde\u63a5\uff0c\u6d88\u606f\u672a\u53d1\u51fa',fg:C.err}]); this.render(); return; }
  st.busy=true; st.stateTxt='\u601d\u8003\u4e2d'; st.activity='\u8bf7\u6c42';
  this.streamRun=null; this.waitT0=Date.now();
  this.thinkText=''; this.thinkRowStart=-1; this.thinkRowEnd=-1; this.ansText=''; this.ansRowStart=-1; this.ansRowEnd=-1; this.ansItemId=''; this.toolRows={};
  this.render();
  this.gw.request('sessions.send',{key:this.sessionKey,message:text}).then(function(r){
    if(r&&r.runId) self.streamRun=r.runId;
  }).catch(function(e){
    self.gw.request('openclaw.chat',{sessionId:self.gwSid,message:text}).then(function(r){
      if(r&&r.reply){ self.ansText=r.reply; self.paintAnswer(); }
      self.finishTurn();
    }).catch(function(e2){
      self.finishTurn();
      self.row([{t:'\u2717 '+String(e2&&e2.message||e2),fg:C.err}]); self.render();
    });
  });
};
App.prototype.finishTurn=function(){
  var st=this.st;
  if(!st.busy) return;
  st.busy=false; st.stateTxt='\u5c31\u7eea'; st.activity='\u7a7a\u95f2'; st.tps=0;
  if(this.thinkRowStart>=0&&this.thinkRowEnd>this.thinkRowStart&&this.thinkRowEnd<=this.rows.length){
    var n=String(this.thinkText||'').length;
    var mark=[{t:'\u25b8 \u601d\u8003 \u00b7 '+(n?n+' \u5b57':'已完成'),fg:C.dim}];
    this.rows.splice(this.thinkRowStart, this.thinkRowEnd-this.thinkRowStart, mark);
  }
  this.row([]);
  this.render();
  this.livePoll();
};
App.prototype.runCmd=function(raw){
  var st=this.st, c=raw.trim().split(/\s+/)[0];
  this.pushUser(raw);
  if(c==='/quit'){ this.teardown(); process.exit(0); }
  if(c==='/clear'){ this.rows=[]; this.row([{t:'\u5df2\u6e05\u7a7a\u5f53\u524d\u89c6\u56fe',fg:C.muted}]); return; }
  if(c==='/theme'){ st.theme=st.theme==='light'?'dark':'light'; if(st.theme==='light'){C.bg=[238,241,246];C.text=[23,27,36];C.muted=[97,108,132];C.panel=[226,231,238];C.panel2=[214,221,232];C.line=[205,213,225];} else {C.bg=[8,9,13];C.text=[217,222,234];C.muted=[124,134,153];C.panel=[13,15,21];C.panel2=[22,25,34];C.line=[22,27,38];} this.row([{t:'\u5df2\u5207\u6362\u4e3a '+(st.theme==='light'?'\u6d45\u8272':'\u6df1\u8272')+' \u4e3b\u9898',fg:C.ok}]); return; }
  if(c==='/new'){ st.ctx=0; st.ctxTokens=0; st.tokens=0; st.outTokens=0; st.tps=0; this.thinkRowStart=-1; this.thinkRowEnd=-1; this.ansRowStart=-1; this.ansRowEnd=-1; this.row([]); this.row([{t:'OpenClaw TUI \u00b7 \u65b0\u89c6\u56fe\uff08\u4f1a\u8bdd\u4e0d\u53d8\uff09 '+this.sessionKey,fg:C.muted}]); return; }
  if(c==='/resume'){ st.showRewind=true; return; }
  if(c==='/settings'){ st.tab=4; this.sysCard('/settings',['\u5e95\u680f\u5b57\u6bb5\u9010\u9879\u5f00\u5173\uff08\u53f3\u4fa7\u9762\u677f\u2193\u9009\u62e9\u3001Enter \u5207\u6362\uff09']); return; }
  if(c==='/help'){ this.sysCard('/help',['/help \u5e2e\u52a9  /new \u65b0\u4f1a\u8bdd  /model \u6a21\u578b  /status \u72b6\u6001','/agents /sessions /context /clear /compact','/resume \u56de\u6eaf  /theme \u4e3b\u9898  /settings \u8bbe\u7f6e','/balance \u4f59\u989d  /update \u66f4\u65b0  /quit \u9000\u51fa']); return; }
  if(c==='/model'){ var selfM=this, mArg=raw.trim().split(/\s+/)[1]; if(!mArg){ this.sysCard('/model',['\u5f53\u524d  '+st.model,'\u7528\u6cd5  /model <provider>/<model>']); return; } if(!this.gw||!this.gw.state.connected){ this.sysCard('/model',['\u7f51\u5173\u672a\u8fde\u63a5']); return; } this.gw.request('sessions.patch',{key:this.sessionKey,model:mArg}).then(function(){ st.model=mArg; st.modelFull=mArg; selfM.sysCard('/model',['\u5df2\u5207\u6362 \u2192 '+mArg]); selfM.render(); }).catch(function(e){ selfM.sysCard('/model',['\u2717 '+String(e&&e.message||e)]); selfM.render(); }); return; }
  if(c==='/status'){ var gok=(st.conn==='ok'); this.sysCard('/status',['gateway    '+(gok?'\u2713 connected':'\u2717 '+(this.gwErr||'offline'))+'  127.0.0.1:'+(this.gwPort||''),'agent      '+st.agent,'session    '+this.sessionKey,'model      '+st.model+(st.modelFull?'  '+st.modelFull:''),'context    '+Math.round(st.ctx)+'%  '+st.ctxTokens+' / '+(st.ctxWindow||32768),'tokens     '+grp(st.tokens)+'   cost $'+(st.cost||0).toFixed(4),'git        '+st.git,'uptime     '+Math.floor((Date.now()-st.startedAt)/1000)+'s']); return; }
  if(c==='/agents'){ this.sysCard('/agents',['* main   main  (active)','  demo']); return; }
  if(c==='/sessions'){ var selfS=this; if(!this.gw||!this.gw.state.connected){ this.sysCard('/sessions',['\u7f51\u5173\u672a\u8fde\u63a5']); return; } this.gw.request('sessions.list',{}).then(function(r){ var a=(r&&r.sessions)||[], ls=[]; for(var i=0;i<a.length&&i<10;i++){ ls.push(String(a[i].key||'')+'  '+String(a[i].totalTokens||0)+' tok'+(a[i].key===selfS.sessionKey?'  \u2190 current':'')); } selfS.sysCard('/sessions',ls.length?ls:['\uff08\u65e0\uff09']); selfS.render(); }).catch(function(e){ selfS.sysCard('/sessions',['\u2717 '+String(e&&e.message||e)]); selfS.render(); }); return; }
  if(c==='/context'){ this.sysCard('/context',['\u4e0a\u4e0b\u6587  '+st.ctxTokens+' / '+(st.ctxWindow||32768)+'  ('+Math.round(st.ctx)+'%)','\u7cfb\u7edf\u63d0\u793a\u8bcd  '+this.ctxInfo.system+' \u6bb5','\u5de5\u5177  '+this.ctxInfo.tools,'\u8f93\u51fa token  '+(st.outTokens||0)]); return; }
  if(c==='/compact'){ var selfC=this; if(!this.gw||!this.gw.state.connected){ this.sysCard('/compact',['\u7f51\u5173\u672a\u8fde\u63a5']); return; } this.gw.request('sessions.compact',{key:this.sessionKey}).then(function(){ selfC.sysCard('/compact',['\u5df2\u8bf7\u6c42\u538b\u7f29']); selfC.render(); }).catch(function(e){ selfC.sysCard('/compact',['\u2717 '+String(e&&e.message||e)]); selfC.render(); }); return; }
  if(c==='/balance'){ this.sysCard('/balance',['tokens  '+grp(st.tokens),'\u8f93\u51fa token  '+(st.outTokens||0),'\u9884\u4f30\u8d39\u7528  $'+(st.cost||0).toFixed(4),'\u4f1a\u8bdd  '+this.sessionKey]); return; }
  if(c==='/update'){ this.sysCard('/update',['\u5f53\u524d v'+VERSION,'\u6700\u65b0 v'+VERSION+'  \u2713 \u5df2\u662f\u6700\u65b0']); return; }
  if(c==='/tips'){ this.sysCard('/tips',['\u2190\u2192 \u5207\u4fa7\u680f\u9875\u7b7e  \u00b7  \u2191\u2193 \u9009\u6761\u76ee  \u00b7  Enter \u786e\u8ba4','Ctrl+P \u5c55\u5f00/收起  \u00b7  Esc Esc \u65f6\u95f4\u56de\u6eaf']); return; }
  this.sysCard(c,['\u672a\u77e5\u547d\u4ee4\uff0c\u8f93\u5165 / \u67e5\u770b\u53ef\u7528\u6307\u4ee4']);
};
App.prototype.sysCard=function(cmd,lines){
  this.row([{t:'\u25b8 openclaw',fg:C.brand3,b:true},{t:'   '+cmd,fg:C.muted}]);
  for(var i=0;i<lines.length;i++) this.row([{t:'  '+lines[i],fg:C.soft}]);
  this.row([]);
};

function main(argv){
  if(argv.indexOf('--version')>=0||argv.indexOf('-v')>=0){ console.log('opc-tui '+VERSION); return; }
  if(argv.indexOf('--help')>=0||argv.indexOf('-h')>=0){
    console.log('opc-tui '+VERSION+' \u2014 OpenClaw TUI (Claude Code style fullscreen terminal)');
    console.log('usage: opc-tui            run the TUI');
    console.log('       opc-tui --help     show help');
    console.log('       opc-tui --version  show version');
    console.log('keys: \u2190\u2192 tabs  \u2191\u2193 select  / commands  Esc Esc rewind  t theme  Ctrl+C quit');
    return;
  }
  if(!process.stdin.isTTY||!process.stdout.isTTY){ console.log('opc-tui needs an interactive terminal (run in CMD / Windows Terminal / bash).'); return; }
  ansi.detectTruecolor();
  var app=new App();
  process.on('SIGINT', function(){ app.teardown(); process.exit(0); });
  process.on('SIGTERM', function(){ app.teardown(); process.exit(0); });
  process.on('exit', function(){ try{ app.teardown(); }catch(e){} });
  process.on('uncaughtException', function(e){ try{ app.teardown(); }catch(x){} console.error(e); process.exit(1); });
  app.session();
}
module.exports = { main: main, App: App };
