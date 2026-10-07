'use strict';
var ansi = require('./ansi.js');
var scr = require('./screen.js');
var Screen = scr.Screen, strWidth = scr.strWidth;
var sprite = require('./sprite.js');

var VERSION = '0.2.0';
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
  this.st={ view:'splash', ctx:12, tps:0, tokens:0, cache:87, model:'deepseek-v4-pro',
    mode:'max', effort:'Max effort', agent:'main', session:hex8(), cwd:process.cwd(),
    git:gitBranch(), startedAt:Date.now(), input:'', cur:0, hist:[], hi:0,
    menu:false, menuSel:0, showRewind:false, showHelp:false, busy:false, stateTxt:'\u5c31\u7eea',
    activity:'\u7a7a\u95f2', phase:0, scroll:0, tab:0, sel:[0,0,0,0,0], exited:false, expanded:false };
  this.rows=[];
  this.todos=[ {t:'demo',s:1}, {t:'\u8ba1\u7b97\u5468\u6b21\u5e76\u5217\u51fa\u4eca\u65e5\u8bfe\u7a0b',s:1},
               {t:'demo',s:0}, {t:'\u751f\u6210\u6574\u7406\u5efa\u8bae',s:-1} ];
  this.ctxInfo={ system:12, runtime:3, tools:26 };
  this.timers=[];
}
App.prototype.row=function(segs){ this.rows.push(segs||[]); this.st.scroll=1e9; };
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
  this.loop=setInterval(function(){ self.st.phase++; self.render(); }, 80);
};
App.prototype.teardown=function(){
  if(this.st.exited) return; this.st.exited=true;
  for(var i=0;i<this.timers.length;i++){ clearTimeout(this.timers[i]); clearInterval(this.timers[i]); }
  if(this.loop) clearInterval(this.loop);
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
  var rt='gateway \u25cf online   '+pad2(clock.getHours())+':'+pad2(clock.getMinutes())+':'+pad2(clock.getSeconds())+'  ';
  this.sc.text(Math.max(0,w-strWidth(rt)-1),0,rt,C.muted);
  var mid='OpenClaw Harness \u00b7 v'+VERSION+'  ';
  if(w>62) this.sc.text(Math.max(18,Math.floor((w-strWidth(mid))/2)),0,mid,C.soft);
  this.sc.hline(0,1,w,'\u2500',C.border);

  var bStat=h-5, bTab=h-4, bIn=h-3, bFoot=h-2, bProg=h-1;
  var top=2, visible=Math.max(1,bStat-top);
  var sidebar=w>=92, sbW=sidebar?30:0, cW=sidebar?(w-sbW-3):(w-2);

  // content
  var maxStart=Math.max(0,this.rows.length-visible);
  if(st.scroll>=1e8) st.scroll=maxStart;
  var start=Math.max(0,Math.min(maxStart,st.scroll));
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
  this.sc.box(mx,my,mw,mh+2,C.border,C.panel);
  for(var i=0;i<mh;i++){
    var sel=(i===this.st.menuSel);
    if(sel) for(var f=0;f<mw-2;f++) this.sc.put(mx+1+f,my+1+i,' ',null,C.panel2);
    this.sc.text(mx+2,my+1+i,list[i][0],sel?C.brand3:C.soft,sel?C.panel2:null,sel);
    this.sc.text(mx+17,my+1+i,list[i][1],sel?C.text:C.muted,sel?C.panel2:null);
  }
};
App.prototype.renderOverlay=function(w,h,kind){
  var pw=Math.min(kind==='help'?62:60,w-6), ph=Math.min(kind==='help'?16:11,h-3);
  var px=Math.floor((w-pw)/2), py=Math.floor((h-ph)/2), i;
  this.sc.box(px,py,pw,ph,C.border,C.panel);
  if(kind==='rewind'){
    this.sc.text(px+2,py+1,'\u65f6\u95f4\u56de\u6eaf  REWIND',C.brand3,null,true);
    var it=['demo','demo','demo','-8 \u5206\u949f   \u4f1a\u8bdd\u5f00\u59cb'];
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
App.prototype.onData=function(s){
  var st=this.st, i=0;
  while(i<s.length){
    var ch=s[i];
    if(ch==='\u001b'){
      var rest=s.slice(i+1);
      if(rest[0]==='['){
        var c=rest[1];
        if(c==='A') this.keyUp(); else if(c==='B') this.keyDown();
        else if(c==='C') this.keyLeft(); else if(c==='D') this.keyRight();
        else if(c==='H') st.cur=0; else if(c==='F') st.cur=st.input.length;
        if('ABCDHF'.indexOf(c)>=0) i+=3; else i+=2;
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
  if(st.view==='splash'){ st.view='work'; this.startDemo(); return; }
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
  this.pushUser(v); this.simulate(v);
};
App.prototype.pushUser=function(t){ this.row([{t:'\u276f ',fg:C.cyan,b:true},{t:t,fg:C.text,b:true}]); this.row([]); };
App.prototype.addThink=function(){ this.row([{t:'\u273b ',fg:C.brand3}]); return this.rows.length-1; };
App.prototype.streamInto=function(idx,text,fg,speed,cb){
  var self=this, i=0;
  var iv=setInterval(function(){
    if(self.st.exited){ clearInterval(iv); return; }
    if(i>=text.length){ clearInterval(iv); if(cb) cb(); return; }
    var a=self.rows[idx]; if(!a){ clearInterval(iv); return; }
    a.push({t:text.charAt(i),fg:fg}); i++;
  }, speed||16);
  this.timers.push(iv); return iv;
};
App.prototype.simulate=function(text){
  var self=this, st=this.st;
  st.busy=true; st.stateTxt='\u601d\u8003\u4e2d'; st.activity='\u601d\u8003';
  var ti=this.addThink();
  this.streamInto(ti,'\u5148\u770b\u770b\u4f60\u8bf4\u7684\u300c'+text.slice(0,16)+'\u300d\u2026\u5224\u65ad\u8981\u4e0d\u8981\u8c03\u5de5\u5177\u3002\u8981\u5c31\u8dd1\u4e00\u6b21 exec\uff0c\u62ff\u5230\u8f93\u51fa\u518d\u7ec4\u7ec7\u7b54\u6848\u3002',C.muted,14,function(){
    self.row([{t:'\u25b8 exec',fg:C.brand3,b:true},{t:'   \u8fd0\u884c\u4e2d',fg:C.muted}]);
    var hI=self.rows.length-1;
    self.row([{t:'  $ /bin/sh -lc "echo hello from '+st.session+'"',fg:C.cyan}]);
    self.row([{t:'  (waiting)',fg:C.dim}]);
    var oI=self.rows.length-1;
    st.activity='exec'; self.genTick(2600);
    self.later(700,function(){
      self.rows[hI]=[{t:'\u25b8 exec',fg:C.brand3,b:true},{t:'   \u5b8c\u6210  '+(0.3+Math.random()*0.4).toFixed(2)+'s',fg:C.ok}];
      self.rows[oI]=[{t:'  hello from '+st.session,fg:C.soft}];
      st.busy=true; st.stateTxt='\u751f\u6210\u4e2d'; st.activity='\u751f\u6210';
      self.row([]); self.row([{t:'\u273b ',fg:C.brand3}]);
      var ai=self.rows.length-1;
      self.streamInto(ai,'\u6536\u5230\u3002\u8fd9\u662f OpenClaw \u4e13\u5c5e TUI \u2014\u2014 \u601d\u8003\u6d41\u3001\u5de5\u5177\u5361\u3001\u5e95\u680f\u5b57\u6bb5\u90fd\u5728\u5de5\u4f5c\u3002\u8f93\u5165 / \u770b\u5168\u90e8\u6307\u4ee4\u3002',C.text,13,function(){
        st.busy=false; st.stateTxt='\u5c31\u7eea'; st.activity='\u7a7a\u95f2';
      });
      self.row([]);
    });
  });
};
App.prototype.genTick=function(dur){
  var self=this, t0=Date.now();
  var iv=setInterval(function(){
    if(self.st.exited){ clearInterval(iv); return; }
    var p=(Date.now()-t0)/dur;
    if(p>=1){ clearInterval(iv); self.st.tps=0; return; }
    self.st.tps=16+Math.random()*26; self.st.ctx=Math.min(99,self.st.ctx+0.12);
    self.st.tokens+=6; self.st.cache=Math.max(60,Math.min(99,self.st.cache+(Math.random()<0.5?-1:1)));
  },180);
  this.timers.push(iv);
};
App.prototype.startDemo=function(){
  var self=this, st=this.st;
  this.row([{t:'OpenClaw TUI \u00b7 session '+st.session+' \u00b7 agent '+st.agent+' \u00b7 '+st.model,fg:C.muted}]);
  this.row([]);
  this.later(400,function(){
    self.pushUser('demo');
    st.busy=true; st.stateTxt='\u601d\u8003\u4e2d'; st.activity='\u601d\u8003'; self.genTick(5200);
    var ti=self.addThink();
    self.streamInto(ti,'demo',C.muted,14,function(){
      self.todos[0].s=0;
      self.row([{t:'\u25b8 exec',fg:C.brand3,b:true},{t:'   \u8fd0\u884c\u4e2d',fg:C.muted}]);
      var h1=self.rows.length-1;
      self.row([{t:'  demo',fg:C.cyan}]);
      self.row([{t:'  (running)',fg:C.dim}]);
      var o1=self.rows.length-1; st.activity='exec';
      self.later(900,function(){
        self.rows[h1]=[{t:'\u25b8 exec',fg:C.brand3,b:true},{t:'   \u5b8c\u6210  0.42s',fg:C.ok}];
        self.rows[o1]=[{t:'  demo',fg:C.soft}];
        self.todos[0].s=1; self.todos[1].s=1; self.todos[2].s=0;
        self.row([{t:'\u25b8 exec',fg:C.brand3,b:true},{t:'   \u8fd0\u884c\u4e2d',fg:C.muted}]);
        var h2=self.rows.length-1;
        self.row([{t:'  demo',fg:C.cyan}]);
        self.row([{t:'  (running)',fg:C.dim}]);
        var o2=self.rows.length-1;
        self.later(1100,function(){
          self.rows[h2]=[{t:'\u25b8 exec',fg:C.brand3,b:true},{t:'   \u5b8c\u6210  1.07s',fg:C.ok}];
          self.rows[o2]=[{t:'  demo',fg:C.soft}];
          self.todos[2].s=1; self.todos[3].s=0; st.stateTxt='\u751f\u6210\u4e2d'; st.activity='\u751f\u6210';
          self.row([]); self.row([{t:'\u273b ',fg:C.brand3}]);
          var ai=self.rows.length-1;
          self.streamInto(ai,'demo',C.text,12,function(){
            self.todos[3].s=1; st.ctx=21; st.tps=0; st.busy=false; st.stateTxt='\u5c31\u7eea'; st.activity='\u7a7a\u95f2'; st.tokens=12480;
            self.row([]);
          });
        });
      });
    });
  });
};
App.prototype.runCmd=function(raw){
  var st=this.st, c=raw.trim().split(/\s+/)[0];
  this.pushUser(raw);
  if(c==='/quit'){ this.teardown(); process.exit(0); }
  if(c==='/clear'){ this.rows=[]; this.row([{t:'\u5df2\u6e05\u7a7a\u5f53\u524d\u89c6\u56fe',fg:C.muted}]); return; }
  if(c==='/theme'){ st.theme=st.theme==='light'?'dark':'light'; if(st.theme==='light'){C.bg=[238,241,246];C.text=[23,27,36];C.muted=[97,108,132];C.panel=[226,231,238];C.panel2=[214,221,232];C.line=[205,213,225];} else {C.bg=[8,9,13];C.text=[217,222,234];C.muted=[124,134,153];C.panel=[13,15,21];C.panel2=[22,25,34];C.line=[22,27,38];} this.row([{t:'\u5df2\u5207\u6362\u4e3a '+(st.theme==='light'?'\u6d45\u8272':'\u6df1\u8272')+' \u4e3b\u9898',fg:C.ok}]); return; }
  if(c==='/new'){ st.session=hex8(); this.rows=[]; st.ctx=3; st.tps=0; this.row([{t:'OpenClaw TUI \u00b7 new session '+st.session,fg:C.muted}]); return; }
  if(c==='/resume'){ st.showRewind=true; return; }
  if(c==='/settings'){ st.tab=4; this.sysCard('/settings',['\u5e95\u680f\u5b57\u6bb5\u9010\u9879\u5f00\u5173\uff08\u53f3\u4fa7\u9762\u677f\u2193\u9009\u62e9\u3001Enter \u5207\u6362\uff09']); return; }
  if(c==='/help'){ this.sysCard('/help',['/help \u5e2e\u52a9  /new \u65b0\u4f1a\u8bdd  /model \u6a21\u578b  /status \u72b6\u6001','/agents /sessions /context /clear /compact','/resume \u56de\u6eaf  /theme \u4e3b\u9898  /settings \u8bbe\u7f6e','/balance \u4f59\u989d  /update \u66f4\u65b0  /quit \u9000\u51fa']); return; }
  if(c==='/model'){ this.sysCard('/model',['\u5f53\u524d  '+st.model,'\u53ef\u7528  deepseek/deepseek-v4-pro (max)','      deepseek/deepseek-v4-flash','      lmstudio/qwen3.5-9b (local)','\u5207\u6362  /model <provider>/<model>']); return; }
  if(c==='/status'){ this.sysCard('/status',['gateway    \u2713 live  127.0.0.1:18789','agent      '+st.agent,'session    '+st.session,'model      '+st.model+'  ('+st.mode+')','context    '+Math.round(st.ctx)+'% / 32768','git        '+st.git,'uptime     '+Math.floor((Date.now()-st.startedAt)/1000)+'s']); return; }
  if(c==='/agents'){ this.sysCard('/agents',['* main   main  (active)','  demo']); return; }
  if(c==='/sessions'){ this.sysCard('/sessions',['agent:main:main      '+st.session+'  active','agent:default:main   18570a69  idle']); return; }
  if(c==='/context'){ this.sysCard('/context',['\u7cfb\u7edf\u63d0\u793a\u8bcd  '+this.ctxInfo.system+' \u6bb5','\u8fd0\u884c\u65f6\u4e0a\u4e0b\u6587  '+this.ctxInfo.runtime+' \u9879','\u5de5\u5177  '+this.ctxInfo.tools,'\u8f93\u5165\u7f13\u5b58\u547d\u4e2d  '+st.cache+'%']); return; }
  if(c==='/compact'){ this.sysCard('/compact',['\u538b\u7f29\u5b8c\u6210 12% -> 3% \u00b7 \u5386\u53f2 3610 \u6761 -> 361 \u6761']); st.ctx=3; return; }
  if(c==='/balance'){ this.sysCard('/balance',['\u672c\u6708\u8c03\u7528 1,286 \u6b21','tokens 3.4M','\u9884\u4f30\u8d39\u7528 \u00a5 12.80']); return; }
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
