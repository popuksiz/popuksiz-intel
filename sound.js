/* Определитель по звуку: акустический отпечаток в браузере (лог-мел спектр) и сравнение с библиотекой эталонов. */
"use strict";
window.PK = window.PK || {};
PK.Sound = (function(){
  const NB = 32; // мел-полос

  function fft(re, im){ // in-place radix-2
    const n = re.length;
    for (let i=1,j=0;i<n;i++){ let bit=n>>1; for(;j&bit;bit>>=1) j^=bit; j^=bit; if(i<j){ let t=re[i];re[i]=re[j];re[j]=t; t=im[i];im[i]=im[j];im[j]=t; } }
    for (let len=2; len<=n; len<<=1){
      const ang = -2*Math.PI/len, wr=Math.cos(ang), wi=Math.sin(ang);
      for (let i=0;i<n;i+=len){ let cr=1, ci=0;
        for (let k=0;k<len/2;k++){
          const a=i+k, b=a+len/2, xr=re[b]*cr-im[b]*ci, xi=re[b]*ci+im[b]*cr;
          re[b]=re[a]-xr; im[b]=im[a]-xi; re[a]+=xr; im[a]+=xi;
          const nr=cr*wr-ci*wi; ci=cr*wi+ci*wr; cr=nr; } } }
  }
  const mel = f => 2595*Math.log10(1+f/700), imel = m => 700*(Math.pow(10,m/2595)-1);
  function melBank(N, sr, fmin, fmax){
    const bins = N/2+1, lo=mel(fmin), hi=mel(fmax), pts=[];
    for (let i=0;i<NB+2;i++) pts.push(Math.floor((N+1)*imel(lo+(hi-lo)*i/(NB+1))/sr));
    const bank=[]; for (let b=0;b<NB;b++){ const w=new Float32Array(bins);
      for (let k=pts[b];k<pts[b+1];k++) w[k]=(k-pts[b])/Math.max(1,pts[b+1]-pts[b]);
      for (let k=pts[b+1];k<pts[b+2];k++) w[k]=(pts[b+2]-k)/Math.max(1,pts[b+2]-pts[b+1]);
      bank.push(w); } return bank;
  }
  function mono(buf){ const n=buf.length, out=new Float32Array(n);
    for (let c=0;c<buf.numberOfChannels;c++){ const d=buf.getChannelData(c); for(let i=0;i<n;i++) out[i]+=d[i]/buf.numberOfChannels; } return out; }

  /* выбор фрагмента: явные границы или самое громкое окно 2 с */
  function pickSegment(x, sr, start, end){
    if (start!=null || end!=null){ const s=Math.max(0,Math.floor((start||0)*sr)), e=Math.min(x.length, end?Math.floor(end*sr):x.length);
      if (e-s > sr*0.2) return x.subarray(s,e); }
    const win=Math.floor(sr*2); if (x.length<=win) return x;
    const hop=Math.floor(sr*0.1); let best=0, bestE=-1;
    for (let s=0;s+win<=x.length;s+=hop){ let e=0; for(let i=s;i<s+win;i+=4) e+=x[i]*x[i]; if(e>bestE){bestE=e;best=s;} }
    return x.subarray(best,best+win);
  }

  function features(x, sr){
    const N = sr>30000 ? 2048 : 1024, hop=N/4, bank=melBank(N,sr,80,Math.min(9000,sr/2-100));
    const hann=new Float32Array(N); for(let i=0;i<N;i++) hann[i]=0.5-0.5*Math.cos(2*Math.PI*i/(N-1));
    const frames=[], cents=[], energies=[]; let prev=null; const flux=[];
    for (let s=0;s+N<=x.length;s+=hop){
      const re=new Float32Array(N), im=new Float32Array(N); let en=0;
      for(let i=0;i<N;i++){ re[i]=x[s+i]*hann[i]; en+=re[i]*re[i]; }
      if (en < 1e-7) continue;
      fft(re,im); const P=new Float32Array(N/2+1); let cs=0, ps=0;
      for(let k=0;k<=N/2;k++){ P[k]=re[k]*re[k]+im[k]*im[k]; cs+=k*P[k]; ps+=P[k]; }
      const m=new Float32Array(NB); for(let b=0;b<NB;b++){ let v=0; const w=bank[b]; for(let k=0;k<w.length;k++) if(w[k]) v+=w[k]*P[k]; m[b]=Math.log10(1e-10+v); }
      if (prev){ let f=0; for(let b=0;b<NB;b++){ const d=m[b]-prev[b]; if(d>0) f+=d; } flux.push(f); }
      prev=m; frames.push(m); cents.push(cs/ps*sr/N); energies.push(en);
    }
    if (frames.length<4) throw new Error("Слишком тихо или слишком коротко: нужен фрагмент со звуком хотя бы 0,3 с.");
    const mean=new Float32Array(NB), sd=new Float32Array(NB);
    frames.forEach(m=>{for(let b=0;b<NB;b++) mean[b]+=m[b]/frames.length;});
    frames.forEach(m=>{for(let b=0;b<NB;b++) sd[b]+=Math.pow(m[b]-mean[b],2)/frames.length;});
    for(let b=0;b<NB;b++) sd[b]=Math.sqrt(sd[b]);
    const lvl=mean.reduce((a,b)=>a+b,0)/NB; const shape=Array.from(mean,v=>v-lvl);
    const cm=cents.reduce((a,b)=>a+b,0)/cents.length, cv=Math.sqrt(cents.reduce((a,b)=>a+(b-cm)*(b-cm),0)/cents.length);
    const fm=flux.reduce((a,b)=>a+b,0)/Math.max(1,flux.length);
    // ударность: доля кадров с всплеском энергии
    const em=energies.reduce((a,b)=>a+b,0)/energies.length; const hits=energies.filter(e=>e>em*2).length/energies.length;
    return {shape, sd:Array.from(sd), cent:cm, centSd:cv, flux:fm, hits, dur:x.length/sr};
  }
  function cos(a,b){ let d=0,na=0,nb=0; for(let i=0;i<a.length;i++){d+=a[i]*b[i];na+=a[i]*a[i];nb+=b[i]*b[i];} return d/(Math.sqrt(na*nb)||1); }
  function similarity(q, r){
    const s1=(cos(q.shape,r.shape)+1)/2, s2=(cos(q.sd,r.sd)+1)/2;
    const c=1-Math.min(1,Math.abs(Math.log((q.cent+1)/(r.cent+1)))/1.2);
    const f=1-Math.min(1,Math.abs(q.flux-r.flux)/Math.max(q.flux,r.flux,1e-6));
    const h=1-Math.min(1,Math.abs(q.hits-r.hits)*2);
    return Math.max(0, Math.min(1, 0.5*s1+0.2*s2+0.15*c+0.1*f+0.05*h));
  }
  async function decode(arrayBuffer){
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) throw new Error("Браузер не умеет обрабатывать звук.");
    const ctx = new AC();
    try { return await new Promise((res,rej)=>{ const p=ctx.decodeAudioData(arrayBuffer,res,rej); if(p&&p.then) p.then(res,rej); }); }
    catch(e){ throw new Error("Не удалось извлечь звук из файла. Подойдут mp4, webm, mov (AAC), mp3, wav, m4a."); }
    finally { try{ctx.close()}catch(e){} }
  }
  async function fromFile(file, start, end){
    const buf = await decode(await file.arrayBuffer());
    const x = pickSegment(mono(buf), buf.sampleRate, start, end);
    return features(x, buf.sampleRate);
  }
  /* запись с микрофона */
  async function record(seconds, onLevel){
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) throw new Error("Микрофон недоступен в этом браузере.");
    const stream = await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:false,noiseSuppression:false,autoGainControl:false}});
    const AC = window.AudioContext || window.webkitAudioContext, ctx=new AC(), src=ctx.createMediaStreamSource(stream);
    const proc = ctx.createScriptProcessor(4096,1,1), chunks=[]; let total=0;
    return await new Promise((resolve,reject)=>{
      proc.onaudioprocess = e => { const d=e.inputBuffer.getChannelData(0); chunks.push(new Float32Array(d)); total+=d.length;
        let p=0; for(let i=0;i<d.length;i+=8) p=Math.max(p,Math.abs(d[i])); if(onLevel) onLevel(p, total/ctx.sampleRate/seconds);
        if (total >= seconds*ctx.sampleRate){ proc.disconnect(); src.disconnect(); stream.getTracks().forEach(t=>t.stop());
          const x=new Float32Array(total); let o=0; chunks.forEach(c=>{x.set(c,o);o+=c.length;}); const sr=ctx.sampleRate; ctx.close();
          try{ resolve(features(pickSegment(x,sr), sr)); }catch(err){ reject(err); } } };
      src.connect(proc); proc.connect(ctx.destination);
    });
  }
  /* хранилище эталонов: IndexedDB с запасным вариантом в памяти */
  const mem=[]; let dbp=null;
  function db(){ if(dbp) return dbp; dbp=new Promise((res)=>{ try{ const r=indexedDB.open("pk-sounds",1);
      r.onupgradeneeded=()=>r.result.createObjectStore("refs",{keyPath:"id"}); r.onsuccess=()=>res(r.result); r.onerror=()=>res(null);
    }catch(e){ res(null); } }); return dbp; }
  async function all(){ const d=await db(); if(!d) return mem.slice();
    return new Promise(res=>{ try{ const q=d.transaction("refs").objectStore("refs").getAll(); q.onsuccess=()=>res(q.result||[]); q.onerror=()=>res(mem.slice()); }catch(e){res(mem.slice())} }); }
  async function put(ref){ const d=await db(); if(!d){ const i=mem.findIndex(r=>r.id===ref.id); if(i>=0) mem[i]=ref; else mem.push(ref); return; }
    return new Promise(res=>{ const t=d.transaction("refs","readwrite"); t.objectStore("refs").put(ref); t.oncomplete=res; t.onerror=res; }); }
  async function del(id){ const d=await db(); if(!d){ const i=mem.findIndex(r=>r.id===id); if(i>=0) mem.splice(i,1); return; }
    return new Promise(res=>{ const t=d.transaction("refs","readwrite"); t.objectStore("refs").delete(id); t.oncomplete=res; t.onerror=res; }); }
  return {fromFile, record, similarity, all, put, del};
})();
