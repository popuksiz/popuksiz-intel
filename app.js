"use strict";
(function(){
const $=s=>document.querySelector(s);
const el=(t,c,txt)=>{const e=document.createElement(t);if(c)e.className=c;if(txt!=null)e.textContent=txt;return e};
const NS="http://www.w3.org/2000/svg";
const sv=(t,a)=>{const e=document.createElementNS(NS,t);for(const k in a)e.setAttribute(k,a[k]);return e};
const store={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};

/* ---------- маршрутизация ---------- */
const VIEWS=["home","maps","sound","tactics","gear","ammo","smelter","newbie","fps"];
const ALIAS={tv:"maps",spawns:"maps",merchant:"sound",weapons:"gear"};
function route(){
  let h=(location.hash||"#home").slice(1); if(ALIAS[h]) h=ALIAS[h]; if(!VIEWS.includes(h)) h="home";
  VIEWS.forEach(v=>{$("#v-"+v).hidden=(v!==h)});
  document.querySelectorAll("#tabs a").forEach(a=>a.setAttribute("aria-current",a.getAttribute("href")==="#"+h?"page":"false"));
  store.set("pk_tab",h); window.scrollTo(0,0);
}
window.addEventListener("hashchange",route);

/* ---------- карты ---------- */
const MT={loot:{c:"#e8b04a",s:"$",n:"Ценный лут"},key:{c:"#5aa7e0",s:"К",n:"Ключ / запертая комната"},boss:{c:"#e0232c",s:"Б",n:"Босс"},exit:{c:"#58b46a",s:"↗",n:"Выход"},spawn:{c:"#cfc6c3",s:"С",n:"Спавн игроков"},danger:{c:"#ff8a3d",s:"!",n:"Опасно"}};
const filt={}; Object.keys(MT).forEach(k=>filt[k]=true);
let cur=PK.MAPS[0], floor=0, vb={x:0,y:0,w:1000,h:700}, selEl=null;

function mapSel(){
  const box=$("#mapsel"); box.replaceChildren();
  PK.MAPS.forEach(m=>{const b=el("button","chip",m.name); b.setAttribute("role","tab"); b.setAttribute("aria-pressed",String(m===cur));
    b.addEventListener("click",()=>{cur=m;floor=0;resetView();store.set("pk_map",m.id);renderMap()}); box.append(b)});
}
function legend(){
  const box=$("#legend"); box.replaceChildren();
  Object.entries(MT).forEach(([k,v])=>{const b=el("button","chip"); b.setAttribute("aria-pressed",String(filt[k]));
    const dot=el("span"); dot.textContent="● "; dot.style.color=v.c; b.append(dot,document.createTextNode(v.n));
    b.addEventListener("click",()=>{filt[k]=!filt[k];renderMap()}); box.append(b)});
}
function info(title,text,type,extra){
  const b=$("#info"); b.replaceChildren(); const t=el("span","t",type?MT[type]?MT[type].n:type:"Зона"); if(type&&MT[type]) t.style.color=MT[type].c;
  b.append(t, el("h3",null,title)); if(extra) b.append(el("span","tag",extra)); b.append(el("p","lead",text));
}
function setVB(){ $("#mapsvg").setAttribute("viewBox",`${vb.x} ${vb.y} ${vb.w} ${vb.h}`) }
function resetView(){ vb={x:0,y:0,w:1000,h:700}; setVB() }
function zoom(f,cx,cy){ const nw=Math.min(1000,Math.max(200,vb.w*f)), nh=nw*0.7; if(cx==null){cx=vb.x+vb.w/2;cy=vb.y+vb.h/2}
  vb.x=cx-(cx-vb.x)*nw/vb.w; vb.y=cy-(cy-vb.y)*nh/vb.h; vb.w=nw; vb.h=nh; clampVB(); setVB() }
function clampVB(){ vb.x=Math.max(-100,Math.min(1100-vb.w,vb.x)); vb.y=Math.max(-70,Math.min(770-vb.h,vb.y)) }

function renderMap(){
  mapSel(); legend();
  $("#mapTitle").textContent=cur.name+" ("+cur.en+")";
  $("#mapAbout").textContent=cur.about+"  Режим: "+cur.mode+" · рейд "+cur.time+" · "+cur.players+".";
  const fs=$("#floorsel"); fs.replaceChildren();
  if(cur.floors) cur.floors.forEach((f,i)=>{const b=el("button","chip",f);b.setAttribute("aria-pressed",String(i===floor));b.addEventListener("click",()=>{floor=i;renderMap()});fs.append(b)});
  const svg=$("#mapsvg"); svg.replaceChildren();
  $("#mapbox").hidden=!!cur.nomap; $("#nomapZones").hidden=!cur.nomap;
  if(cur.nomap){ const g=$("#nomapZones"); g.replaceChildren(); cur.zones.forEach(z=>{const c=el("div","card");c.append(el("span","k","Зона"),el("h3",null,z.n),el("p","lead",z.d));g.append(c)}); }
  else {
    const defs=sv("defs",{}); const pat=sv("pattern",{id:"grid",width:50,height:50,patternUnits:"userSpaceOnUse"});
    pat.append(sv("path",{d:"M50 0 L0 0 0 50",fill:"none",stroke:"#231b1c","stroke-width":1})); defs.append(pat); svg.append(defs);
    svg.append(sv("rect",{x:-100,y:-70,width:1200,height:840,fill:"#120e0f"}), sv("rect",{x:0,y:0,width:1000,height:700,fill:"url(#grid)",stroke:"#2e2426"}));
    (cur.terrain||[]).forEach(t=>{
      if(t.t==="road"){ svg.append(sv("path",{d:t.d,fill:"none",stroke:"#3a2f30","stroke-width":14,"stroke-linecap":"round"})); }
      else if(t.t==="water"){ svg.append(sv("path",{d:t.d,fill:"#13212b",stroke:"#1f3646"})); }
      else if(t.t==="hill"){ svg.append(sv("ellipse",{cx:t.cx,cy:t.cy,rx:t.rx,ry:t.ry,fill:"#1a1516",stroke:"#2b2223","stroke-dasharray":"6 6"})); }
      if(t.l){ const p=t.t==="hill"?{x:t.cx,y:t.cy-t.ry+18}:null; if(p){const tx=sv("text",{x:p.x,y:p.y,"text-anchor":"middle",fill:"#6d605c","font-size":14,"font-family":"PT Sans, sans-serif"}); tx.textContent=t.l; svg.append(tx);} }
    });
    cur.zones.filter(z=>(z.f||0)===floor).forEach(z=>{
      const g=sv("g",{class:"mk",tabindex:0,role:"button","aria-label":z.n});
      g.append(sv("rect",{x:z.x,y:z.y,width:z.w,height:z.h,rx:6,fill:"#1f1819",stroke:"#4a3a3c","stroke-width":2}));
      const tx=sv("text",{x:z.x+z.w/2,y:z.y+20,"text-anchor":"middle",fill:"#cfc6c3","font-size":14,"font-family":"Russo One, sans-serif"}); tx.textContent=z.n; g.append(tx);
      const act=()=>info(z.n+(z.en?" · "+z.en:""),z.d,null);
      g.addEventListener("click",act); g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();act()}}); svg.append(g);
    });
    cur.markers.filter(m=>(m.f||0)===floor&&filt[m.t]).forEach(m=>{
      const t=MT[m.t]; const g=sv("g",{class:"mk",tabindex:0,role:"button","aria-label":t.n+": "+m.n});
      if(m.tier==="red") g.append(sv("circle",{cx:m.x,cy:m.y,r:22,fill:"none",stroke:"#e0232c","stroke-width":3,"stroke-dasharray":"4 3"}));
      g.append(sv("circle",{cx:m.x,cy:m.y,r:15,fill:t.c,stroke:"#0b0909","stroke-width":2}));
      const tx=sv("text",{x:m.x,y:m.y+5,"text-anchor":"middle",fill:"#0b0909","font-size":15,"font-weight":"700","font-family":"PT Sans, sans-serif"}); tx.textContent=t.s; g.append(tx);
      const tt=sv("title",{}); tt.textContent=m.n; g.append(tt);
      const act=()=>{ if(selEl) selEl.classList.remove("sel"); selEl=g; g.classList.add("sel"); info(m.n,m.d,m.t,m.tier==="red"?"шанс на красное":m.tier==="gold"?"ценный лут":null) };
      g.addEventListener("click",e=>{e.stopPropagation();act()}); g.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();act()}});
      svg.append(g);
    });
    setVB();
  }
  const up=$("#unplaced"); up.replaceChildren();
  (cur.unplaced||[]).filter(u=>filt[u[0]]!==false).forEach(u=>{const d=el("div"); const b=el("b",null,u[1]); b.style.color=(MT[u[0]]||{}).c||"var(--fg)"; d.append(b,document.createTextNode(u[2])); up.append(d)});
  if(!up.children.length) up.append(el("p","lead","Все известные точки уже на схеме."));
  const tips=$("#mapTips"); tips.replaceChildren(); cur.tactics.forEach(t=>tips.append(el("li",null,t)));
  info("Выберите метку","Нажмите на метку или зону на схеме, чтобы прочитать, что там лежит и чем опасно.",null);
}
(function panzoom(){
  const svg=$("#mapsvg"); let drag=null; const pts=new Map(); let pinch=null;
  const toSvg=(cx,cy)=>{const r=svg.getBoundingClientRect(); return {x:vb.x+(cx-r.left)/r.width*vb.w, y:vb.y+(cy-r.top)/r.height*vb.h, r}};
  svg.addEventListener("wheel",e=>{e.preventDefault(); const p=toSvg(e.clientX,e.clientY); zoom(e.deltaY>0?1.15:0.87,p.x,p.y)},{passive:false});
  svg.addEventListener("pointerdown",e=>{ if(e.target.closest&&e.target.closest(".mk")&&e.pointerType==="mouse") return;
    pts.set(e.pointerId,{x:e.clientX,y:e.clientY}); svg.setPointerCapture(e.pointerId);
    if(pts.size===1){ drag={x:e.clientX,y:e.clientY,vx:vb.x,vy:vb.y}; svg.classList.add("drag") }
    if(pts.size===2){ const [a,b]=[...pts.values()]; pinch={d:Math.hypot(a.x-b.x,a.y-b.y),w:vb.w}; drag=null } });
  svg.addEventListener("pointermove",e=>{ if(!pts.has(e.pointerId)) return; pts.set(e.pointerId,{x:e.clientX,y:e.clientY});
    const r=svg.getBoundingClientRect();
    if(pinch&&pts.size===2){ const [a,b]=[...pts.values()]; const d=Math.hypot(a.x-b.x,a.y-b.y); const m=toSvg((a.x+b.x)/2,(a.y+b.y)/2); zoom(pinch.w*pinch.d/d/vb.w,m.x,m.y); }
    else if(drag){ vb.x=drag.vx-(e.clientX-drag.x)/r.width*vb.w; vb.y=drag.vy-(e.clientY-drag.y)/r.height*vb.h; clampVB(); setVB(); } });
  const end=e=>{pts.delete(e.pointerId); if(pts.size<2) pinch=null; if(!pts.size){drag=null; svg.classList.remove("drag")}};
  svg.addEventListener("pointerup",end); svg.addEventListener("pointercancel",end);
  $("#zin").addEventListener("click",()=>zoom(0.75)); $("#zout").addEventListener("click",()=>zoom(1.33)); $("#zreset").addEventListener("click",resetView);
})();

/* ---------- звуковые группы ---------- */
const MYSIZE={}; Object.entries(PK.MYTH).forEach(([s,l])=>l.forEach(n=>MYSIZE[n]=s));
const GROUPS=PK.SG.map(([n,s,more])=>{const items=s.split(/,\s*(?=[A-Z"])/);return {n,items,more:more||0,myth:items.filter(i=>MYSIZE[i])}});
const gname=n=>{const g=GROUPS.find(x=>x.n===+n);return g?"звук #"+g.n+(g.myth.length?" (есть красное)":""):""};
function renderSG(){
  const q=$("#sq").value.trim().toLowerCase(), sz=$("#ssize").value, red=$("#sredonly").checked, box=$("#sgroups"); box.replaceChildren(); let shown=0;
  GROUPS.forEach(g=>{
    if(red&&!g.myth.length) return; if(sz&&!g.myth.some(i=>MYSIZE[i]===sz)) return;
    if(q&&!g.items.some(i=>i.toLowerCase().includes(q))) return; shown++;
    const c=el("div","sgc"+(g.myth.length?" hit":"")), head=el("div","controls");
    head.append(el("span","k","ЗВУК #"+g.n)); if(g.myth.length) head.append(el("span","tag gold","красное: "+g.myth.length)); c.append(head);
    const it=el("div","items"); g.items.forEach(i=>it.append(el("span","it"+(MYSIZE[i]?" my":"")+(q&&i.toLowerCase().includes(q)?" match":""),i+(MYSIZE[i]?" · "+MYSIZE[i]:""))));
    if(g.more) it.append(el("span","it","+ ещё "+g.more)); c.append(it); box.append(c);
  });
  if(!shown) box.append(el("p","lead","Ничего не найдено. Попробуйте английское название, как в игре."));
}
["#sq","#ssize","#sredonly"].forEach(s=>$(s).addEventListener("input",renderSG));
GROUPS.forEach(g=>{const o=el("option",null,"#"+g.n+" — "+g.items.slice(0,2).join(", ")+(g.myth.length?" ★":""));o.value=g.n;$("#sgroup").append(o)});

/* ---------- определитель ---------- */
let lastFeat=null, lastSrc="";
async function analyze(feat){
  lastFeat=feat; const refs=await PK.Sound.all(); const res=$("#results"), v=$("#verdict"); res.replaceChildren();
  $("#saveBox").hidden=false;
  if(!refs.length){ v.className="verdict"; v.textContent="Библиотека пуста"; res.append(el("p","lead","Сохраните этот звук как первый эталон: подпишите, что было внутри груза. Когда эталонов станет несколько, сайт начнёт их сравнивать.")); return; }
  const sc=refs.map(r=>({r,s:PK.Sound.similarity(feat,r.feat)})).sort((a,b)=>b.s-a.s);
  const top=sc.slice(0,5);
  // голосование трёх ближайших
  const k=sc.slice(0,3); let redW=0,allW=0; k.forEach(x=>{const w=Math.pow(x.s,4); allW+=w; if(x.r.red) redW+=w});
  const best=sc[0], pRed=allW?redW/allW:0;
  if(best.s<0.72){ v.className="verdict"; v.textContent="Похожих эталонов нет — звук новый"; }
  else if(pRed>=0.6){ v.className="verdict red"; v.textContent="Похоже на КРАСНОЕ: "+best.r.label+" ("+Math.round(best.s*100)+"%)"; }
  else { v.className="verdict"; v.textContent="Скорее не красное: "+best.r.label+" ("+Math.round(best.s*100)+"%)"; }
  top.forEach(x=>{const d=el("div","ri"); const nm=el("span",null,x.r.label+(x.r.group?" · "+gname(x.r.group):"")); if(x.r.red) nm.style.color="var(--gold)";
    d.append(nm, el("span","num",Math.round(x.s*100)+"%")); const b=el("div","bar2"), i=el("i"); i.style.width=Math.round(x.s*100)+"%"; i.style.background=x.r.red?"var(--gold)":"var(--red)"; b.append(i); d.append(b); res.append(d)});
  res.append(el("p","status","Сходство выше 85% — почти наверняка тот же звук; 72–85% — похоже; ниже — другой предмет."));
}
$("#recBtn").addEventListener("click",async()=>{
  const b=$("#recBtn"), st=$("#qstat"); b.disabled=true; st.textContent="Запись… включите звук груза рядом с микрофоном.";
  try{ const f=await PK.Sound.record(4,(p,prog)=>{$("#lvl").style.width=Math.min(100,Math.round(p*140))+"%"; b.textContent="Запись "+Math.min(100,Math.round(prog*100))+"%"});
    lastSrc="микрофон"; st.textContent="Записано. Сравниваю…"; await analyze(f); st.textContent="Готово: запись с микрофона."; }
  catch(e){ st.textContent=e&&e.name==="NotAllowedError"?"Доступ к микрофону запрещён. Разрешите его в настройках браузера для этого сайта.":(e.message||"Не получилось записать."); }
  finally{ b.disabled=false; b.textContent="Записать 4 с с микрофона"; $("#lvl").style.width="0" }
});
$("#qfile").addEventListener("change",async()=>{
  const f=$("#qfile").files[0], st=$("#qstat"); if(!f) return;
  if(f.size>200*1024*1024){ st.textContent="Файл больше 200 МБ — обрежьте видео."; return }
  const pv=$("#qprev"); try{ if(pv.src) URL.revokeObjectURL(pv.src) }catch(e){} pv.src=URL.createObjectURL(f); pv.hidden=false;
  st.textContent="Обрабатываю «"+f.name+"»…";
  try{ const s=parseFloat($("#qs").value), e=parseFloat($("#qe").value);
    const feat=await PK.Sound.fromFile(f, isNaN(s)?null:s, isNaN(e)?null:e); lastSrc=f.name; await analyze(feat); st.textContent="Готово: "+f.name+" ("+feat.dur.toFixed(1)+" с фрагмент)."; }
  catch(err){ st.textContent=err.message||"Не получилось обработать файл." }
  $("#qfile").value="";
});
$("#saveRef").addEventListener("click",async()=>{
  if(!lastFeat){return} const label=$("#slabel").value.trim(); if(!label){$("#qstat").textContent="Подпишите эталон: что было в грузе.";return}
  await PK.Sound.put({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),label:label.slice(0,80),group:$("#sgroup").value?+$("#sgroup").value:null,red:$("#sred").checked,feat:lastFeat,src:lastSrc.slice(0,80),at:Date.now()});
  $("#slabel").value=""; $("#sred").checked=false; $("#sgroup").value=""; $("#qstat").textContent="Эталон сохранён."; renderLib();
});
$("#sgroup").addEventListener("change",()=>{const g=GROUPS.find(x=>x.n===+$("#sgroup").value); if(g&&g.myth.length&&!$("#slabel").value) $("#slabel").value=g.myth[0]});
async function renderLib(){
  const refs=(await PK.Sound.all()).sort((a,b)=>b.at-a.at), box=$("#lib"); box.replaceChildren();
  $("#libcount").textContent="· "+refs.length+" шт., красных: "+refs.filter(r=>r.red).length;
  if(!refs.length){ box.append(el("p","lead","Пока пусто. Определите звук и сохраните его с подписью — это первый эталон.")); return }
  refs.forEach(r=>{const d=el("div"); const s=el("span",null,r.label+(r.group?" · "+gname(r.group):"")+(r.src?" · "+r.src:"")); if(r.red) s.style.color="var(--gold)";
    const del=el("button","ghost","Удалить"); let armed=false;
    del.addEventListener("click",async()=>{ if(!armed){armed=true;del.textContent="Точно?";setTimeout(()=>{armed=false;del.textContent="Удалить"},3000);return} await PK.Sound.del(r.id); renderLib() });
    d.append(s,del); box.append(d)});
}
$("#exportLib").addEventListener("click",async()=>{
  const refs=await PK.Sound.all(); const blob=new Blob([JSON.stringify({app:"popuksiz-intel",v:1,refs},null,0)],{type:"application/json"});
  const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download="popuksiz-zvuki.json"; document.body.append(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},500);
});
$("#importLib").addEventListener("change",async()=>{
  const f=$("#importLib").files[0]; if(!f) return; const st=$("#qstat");
  try{ const j=JSON.parse(await f.text()); if(!j||!Array.isArray(j.refs)) throw 0; let n=0;
    for(const r of j.refs){ if(!r||typeof r.label!=="string"||!r.feat||!Array.isArray(r.feat.shape)||r.feat.shape.length!==32) continue;
      const feat={shape:r.feat.shape.map(Number),sd:(r.feat.sd||[]).map(Number),cent:+r.feat.cent||0,centSd:+r.feat.centSd||0,flux:+r.feat.flux||0,hits:+r.feat.hits||0,dur:+r.feat.dur||0};
      if(feat.sd.length!==32||feat.shape.some(isNaN)) continue;
      await PK.Sound.put({id:String(r.id||Date.now().toString(36)+n).slice(0,40),label:r.label.slice(0,80),group:r.group?+r.group:null,red:!!r.red,feat,src:String(r.src||"импорт").slice(0,80),at:+r.at||Date.now()}); n++; }
    st.textContent="Импортировано эталонов: "+n+"."; renderLib(); }
  catch(e){ st.textContent="Это не файл библиотеки звуков." }
  $("#importLib").value="";
});

/* ---------- тактики ---------- */
const TACT=[
 ["Звук — главное оружие","Играйте в наушниках, музыку и голосовой чат держите тише игры. Шаги по металлу, дверям и стеклу выдают врага раньше, чем вы его увидите. Сами двигайтесь шагом у опасных зон."],
 ["Угол — по кусочку","Не выбегайте за угол целиком: открывайте его постепенно, держа прицел на уровне головы. Используйте наклон: он открывает меньше вашего тела."],
 ["Заход в комнату","Сначала граната или флешка, потом вход с прицелом в самый опасный угол. В отряде — двое заходят с разных дверей одновременно."],
 ["Не дерись честно","Атакуйте того, кто занят: лутает, лечится или стреляет в бота. После выстрела меняйте позицию — по звуку вас уже ищут."],
 ["Патроны под броню","Против брони 5–6 класса нужен патрон класса 5+. Обычным патроном бейте в ноги и руки — там брони нет."],
 ["Лечение — в укрытии","Сначала уйдите из линии огня, потом жгут на кровотечение, обезболивающее на перелом, затем аптечка."],
 ["Выход — тоже бой","У выходов кемперят. Подходите не по дороге, а сбоку, послушайте 20–30 секунд, проверьте окна и крыши."],
 ["Боссы","Охрана босса опаснее самого босса. Отстреливайте охрану издалека, не лезьте в здание, пока не выбита половина отряда."],
 ["Гранаты","Граната выгоняет из укрытия, флешка даёт 2–3 секунды на заход, дым — чтобы перебежать открытое место или поднять товарища."],
 ["Снайпер на высоте","На открытых картах (Аэропорт, Долина) передвигайтесь от укрытия к укрытию и не стойте на гребнях холмов на фоне неба."],
 ["Отряд","Один держит дальнюю дистанцию, двое чистят здания, один прикрывает тыл. Называйте направление по сторонам света и ориентирам."],
 ["Жадность убивает","Решите заранее, какую стоимость рюкзака несёте до выхода. Набрали — уходите, даже если рядом ещё сейф."]
];
function renderTactics(){ const g=$("#tacticsGrid"); TACT.forEach(([h,t])=>{const c=el("div","card"); c.append(el("h3",null,h), el("p","lead",t)); g.append(c)}) }

/* ---------- снаряжение ---------- */
const ICON={
 armor:'<svg viewBox="0 0 120 90" fill="none" stroke="#a3948f" stroke-width="3"><path d="M38 8 L50 8 Q60 20 70 8 L82 8 L98 22 L92 40 L92 84 L28 84 L28 40 L22 22 Z" fill="#241c1d"/><path d="M40 48 H80 M40 62 H80"/></svg>',
 helmet:'<svg viewBox="0 0 120 90" fill="none" stroke="#a3948f" stroke-width="3"><path d="M18 62 Q18 14 60 12 Q102 14 102 62 L92 70 L28 70 Z" fill="#241c1d"/><path d="M30 48 H90"/></svg>',
 ar:'<svg viewBox="0 0 160 60" fill="#241c1d" stroke="#a3948f" stroke-width="2.5"><path d="M8 22 H120 L152 18 V26 L120 28 L118 32 H70 L64 52 H52 L58 32 H40 L34 44 H14 L20 32 H8 Z"/></svg>',
 carbine:'<svg viewBox="0 0 160 60" fill="#241c1d" stroke="#a3948f" stroke-width="2.5"><path d="M6 24 H130 L154 22 V27 L130 29 V33 H76 L70 48 H60 L64 33 H30 L8 40 Z"/></svg>',
 dmr:'<svg viewBox="0 0 160 60" fill="#241c1d" stroke="#a3948f" stroke-width="2.5"><path d="M6 26 H126 L156 24 V29 L126 30 V34 H74 L68 50 H58 L62 34 H30 L8 42 Z"/><rect x="58" y="12" width="40" height="9"/></svg>',
 sniper:'<svg viewBox="0 0 160 60" fill="#241c1d" stroke="#a3948f" stroke-width="2.5"><path d="M4 28 H130 L158 26 V30 L130 31 V35 H70 L28 34 L6 44 Z"/><rect x="56" y="13" width="46" height="9"/></svg>',
 smg:'<svg viewBox="0 0 160 60" fill="#241c1d" stroke="#a3948f" stroke-width="2.5"><path d="M30 20 H110 L132 18 V25 L110 27 V31 H82 L78 52 H68 L72 31 H58 L54 44 H42 L46 31 H30 Z"/></svg>',
 sg:'<svg viewBox="0 0 160 60" fill="#241c1d" stroke="#a3948f" stroke-width="2.5"><path d="M6 24 H140 V31 H84 L76 46 H64 L70 31 H32 L8 40 Z"/><path d="M60 33 H120" stroke-width="5"/></svg>',
 lmg:'<svg viewBox="0 0 160 60" fill="#241c1d" stroke="#a3948f" stroke-width="2.5"><path d="M6 22 H124 L156 20 V26 L124 28 V32 H72 L66 48 H54 L60 32 H30 L8 40 Z"/><rect x="74" y="32" width="22" height="16"/><path d="M128 28 L136 50 M128 28 L120 50"/></svg>',
 pistol:'<svg viewBox="0 0 160 60" fill="#241c1d" stroke="#a3948f" stroke-width="2.5"><path d="M44 14 H118 V28 H82 L76 52 H58 L64 28 H44 Z"/></svg>',
 rifle:'<svg viewBox="0 0 160 60" fill="#241c1d" stroke="#a3948f" stroke-width="2.5"><path d="M4 28 H150 V33 H70 L28 32 L6 42 Z"/><path d="M70 33 Q78 44 92 36" fill="none"/></svg>'
};
const WT={ar:"Штурмовая винтовка",carbine:"Карабин",dmr:"Марксманская винтовка",sniper:"Снайперская винтовка",smg:"Пистолет-пулемёт",sg:"Дробовик",lmg:"Пулемёт",pistol:"Пистолет",rifle:"Винтовка с рычажным затвором"};
const WD={ar:"Универсал: средняя дистанция, автоматический огонь. Основа большинства сборок.",carbine:"Полуавтомат или короткий ствол: точные одиночные на средней дистанции.",dmr:"Точный огонь на дальней дистанции с быстрой стрельбой; нужен прицел.",sniper:"Мощный выстрел на дальней дистанции; медленный затвор — промах дорог.",smg:"Ближний бой в зданиях: высокий темп, малая отдача, слабое пробитие.",sg:"Огромный урон вблизи; пули (slug) дальше и сильнее дроби.",lmg:"Длинные очереди и большой магазин: подавление и удержание направления.",pistol:"Запасное оружие на крайний случай.",rifle:"Мощные одиночные на средней дистанции."};
const ammoCal=c=>{const m={"9x39":"9x39mm","7.62x51":"7.62x51mm","12x70":"12x70mm","7.62x39":"7.62x39mm","9x19":"9x19mm","5.45x39":"5.45x39mm","5.8x42":"5.8x42mm","5.7x28":"5.7x28mm","5.56x45":"5.56x45mm","7.62x54":"7.62x54mm","7.62x25":"7.62x25mm"};return m[c]||c};
let AMMO=[]; const CLSCOL=["#3a3a3a","#4a4a4a","#5e5a52","#7a6a3a","#8a5a20","#a8321e","#c51d26","#e0232c"];
function gearData(){
  const A=PK.ARMOR.split(";").map(r=>{const[n,c,d,w,m]=r.split("|");return{kind:"armor",n,c:+c,d:+d,w:+w,m}});
  const H=PK.HELMETS.split(";").map(r=>{const[n,c,d,w]=r.split("|");return{kind:"helmet",n,c:+c,d:+d,w:+w}});
  const W=PK.WEAPONS.split(";").map(r=>{const[n,t,cal,rpm]=r.split("|");return{kind:"weapon",n,t,cal,rpm:+rpm}});
  return {armor:A,helmet:H,weapon:W};
}
const GD=gearData();
function descArmor(x){
  const cl=x.c>=6?"Высший класс: держит почти все патроны, кроме лучших бронебойных (7Н37, M61).":x.c===5?"Держит патроны до 4 класса; против 5–6 класса — лишь несколько попаданий.":x.c===4?"Средний класс: хороша против пистолетных, ПП и обычных автоматных патронов.":"Защита от пистолетных патронов и дроби — для бюджетной вылазки.";
  const wt=x.w>=11?" Тяжёлая: заметно режет скорость и выносливость — для штурма и обороны.":x.w<=6?" Лёгкая: почти не мешает бегать.":" Средний вес.";
  const ef=" Прочность на килограмм: "+(x.d/x.w).toFixed(1)+".";
  return cl+wt+ef;
}
function descHelmet(x){
  const cl=x.c>=6?"Топ-защита головы от большинства патронов.":x.c===5?"Хорошая защита, держит обычные автоматные патроны.":x.c===4?"Защищает от пистолетных и ПП, автоматные пробивают.":x.c===3?"Только от пистолетов и осколков.":"Почти декоративная защита.";
  const wt=x.w>=3.5?" Тяжёлый: больше штраф к движению и обзору.":x.w<=1.6?" Очень лёгкий.":"";
  return cl+wt;
}
function descWeapon(x){
  const cal=ammoCal(x.cal); const best=AMMO.filter(a=>a.cal===cal).sort((a,b)=>b.pen-a.pen)[0];
  const rp=x.rpm>=850?" Очень высокий темп — быстро убивает вблизи, но быстро опустошает магазин.":x.rpm<=100?" Одиночные выстрелы с перезарядкой затвора.":x.rpm<=400?" Невысокий темп — стреляйте точно, одиночными.":"";
  return WD[x.t]+rp+(best?" Лучший патрон калибра в таблице: "+best.name+" (пробитие "+best.pen+", класс "+best.cls+").":"");
}
let gkind="armor", IMG={};
function gearFilters(){
  const s=$("#gf"); s.replaceChildren(); const add=(v,t)=>{const o=el("option",null,t);o.value=v;s.append(o)};
  if(gkind==="weapon"){ add("","Все типы"); Object.entries(WT).forEach(([k,v])=>add(k,v)) }
  else { add("","Любой класс"); [6,5,4,3,2,1].forEach(c=>add(String(c),"Класс "+c)) }
}
function renderGear(){
  const q=$("#gq").value.trim().toLowerCase(), f=$("#gf").value, box=$("#gearGrid"); box.replaceChildren();
  let list=GD[gkind].filter(x=>!q||x.n.toLowerCase().includes(q));
  if(f) list=list.filter(x=>gkind==="weapon"?x.t===f:x.c===+f);
  list.sort((a,b)=>gkind==="weapon"?a.n.localeCompare(b.n):(b.c-a.c)||(b.d-a.d));
  list.forEach(x=>{
    const c=el("article","gc"), pic=el("div","pic"); const slug=x.n.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
    if(IMG[slug]){ const im=el("img"); im.alt=x.n; im.loading="lazy"; im.src="img/"+IMG[slug]; pic.append(im) }
    else pic.innerHTML=ICON[x.kind==="weapon"?x.t:x.kind];
    const b=el("div","body"); b.append(el("h3",null,x.n)); const st=el("div","stats");
    if(x.kind==="weapon"){ st.append(el("span","tag red",WT[x.t]),el("span","tag",x.cal),el("span","tag",x.rpm+" выстр./мин")); b.append(st, el("p",null,descWeapon(x))) }
    else { const t=el("span","cls","КЛ "+x.c); t.style.background=CLSCOL[x.c]; t.style.padding="0 6px"; st.append(t,el("span","tag","прочн. "+x.d),el("span","tag",x.w+" кг")); if(x.m) st.append(el("span","tag",x.m)); b.append(st, el("p",null,x.kind==="armor"?descArmor(x):descHelmet(x))) }
    c.append(pic,b); box.append(c);
  });
  if(!list.length) box.append(el("p","lead","Ничего не найдено."));
  $("#gearNote").textContent=gkind==="armor"?"Без проверенных характеристик в базе: "+PK.ARMOR_NOSTAT+".":gkind==="weapon"?"Показаны 40 из 91 образца оружия — по остальным в открытой базе нет данных.":"Источник: arenabreakout-infinite.com/helmets.";
}
document.querySelectorAll("[data-gt]").forEach(b=>b.addEventListener("click",()=>{gkind=b.dataset.gt;document.querySelectorAll("[data-gt]").forEach(x=>x.setAttribute("aria-pressed",String(x===b)));gearFilters();renderGear()}));
$("#gq").addEventListener("input",renderGear); $("#gf").addEventListener("change",renderGear);
fetch("img/index.json").then(r=>r.ok?r.json():{}).then(j=>{if(j&&typeof j==="object"){IMG=j;renderGear()}}).catch(()=>{});

/* ---------- патроны ---------- */
AMMO=PK.AMMO.split(";").map(r=>{const[full,pen,cls,dmg]=r.split("|");const m=full.match(/^(\S+)\s+(.*)$/);return{cal:m[1],name:m[2],pen:+pen,cls:+cls,dmg:+dmg}});
let asort={k:"pen",d:-1};
[...new Set(AMMO.map(a=>a.cal))].sort().forEach(c=>{const o=el("option",null,c);o.value=c;$("#acal").append(o)});
function renderAmmo(){
  const cal=$("#acal").value, mc=+$("#acls").value||0, tb=$("#atbl"); tb.replaceChildren();
  AMMO.filter(a=>(!cal||a.cal===cal)&&a.cls>=mc).sort((a,b)=>{const x=a[asort.k],y=b[asort.k];return(typeof x==="string"?x.localeCompare(y):x-y)*asort.d})
   .forEach(a=>{const tr=el("tr");tr.append(el("td",null,a.name),el("td","num",a.cal));const td=el("td"),s=el("span","cls",String(a.cls));s.style.background=CLSCOL[a.cls];td.append(s);tr.append(td,el("td","num",String(a.pen)),el("td","num",String(a.dmg)));tb.append(tr)});
}
document.querySelectorAll("#v-ammo th[data-sort]").forEach(th=>th.addEventListener("click",()=>{const k=th.dataset.sort;asort={k,d:asort.k===k?-asort.d:(k==="name"||k==="cal"?1:-1)};renderAmmo()}));
["#acal","#acls"].forEach(s=>$(s).addEventListener("change",renderAmmo));

/* ---------- старт ---------- */
$("#kgear").textContent=GD.armor.length+GD.helmet.length+GD.weapon.length;
const sm=store.get("pk_map"); cur=PK.MAPS.find(m=>m.id===sm)||PK.MAPS[0];
if(location.hash==="#tv"||location.hash==="#spawns") cur=PK.MAPS.find(m=>m.id==="tv");
if(!location.hash){const t=store.get("pk_tab");if(t&&VIEWS.includes(t))history.replaceState(null,"","#"+t)}
renderMap(); renderSG(); renderLib(); renderTactics(); gearFilters(); renderGear(); renderAmmo(); route();
})();
