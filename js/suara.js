// Suara: upload/rekam audio, track di timeline, putar sinkron, lip-sync otomatis
let actx=null,audioTracks=[],playingSrc=[],lipsync={},recMic=null,muteAudio=false;
function ac(){if(!actx){const C=window.AudioContext||window.webkitAudioContext;actx=new C();}return actx;}
const audioMsg=document.getElementById('audioMsg');
function sayA(t){audioMsg.textContent=t;}
function fmtS(s){return s.toFixed(1).replace('.',',')+' dtk';}
function uid(){return 't'+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}

// ---------- penyimpanan audio di browser (IndexedDB, muat file besar) ----------
const idb=(()=>{
  let dbp;
  function db(){return dbp||(dbp=new Promise((res,rej)=>{const r=indexedDB.open('animasi-cutout',1);r.onupgradeneeded=()=>r.result.createObjectStore('audio');r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);}));}
  function op(mode,fn){return db().then(d=>new Promise((res,rej)=>{const t=d.transaction('audio',mode),q=fn(t.objectStore('audio'));t.oncomplete=()=>res(q.result);t.onerror=()=>rej(t.error);}));}
  return {put:(k,v)=>op('readwrite',s=>s.put(v,k)),get:k=>op('readonly',s=>s.get(k)),del:k=>op('readwrite',s=>s.delete(k))};
})();
function blobToDataURL(b){return new Promise(r=>{const f=new FileReader();f.onload=()=>r(f.result);f.readAsDataURL(b);});}
async function dataURLToBlob(u){return (await fetch(u)).blob();}
function trackMeta(t){return {id:t.id,name:t.name,start:t.start,vol:t.vol,lip:t.lip,text:t.text};}

// ---------- track ----------
async function addTrackFromBlob(blob,meta){
  const buf=await ac().decodeAudioData(await blob.arrayBuffer());
  const t=Object.assign({id:uid(),name:'Audio',start:frame/FPS,vol:1,lip:true,text:''},meta||{},{blob,buf});
  audioTracks.push(t);return t;
}
function extendToAudio(){
  const end=Math.max(0,...audioTracks.map(t=>Math.ceil((t.start+t.buf.duration)*FPS)));
  if(end>FRAMES)FRAMES=end;     // timeline diperpanjang supaya suara muat
}
function afterAudioChange(){extendToAudio();computeLip();renderTracks();render();}
async function loadAudioFromProject(list){
  audioStop();audioTracks=[];
  for(const m of list||[]){
    try{
      const blob=m.data?await dataURLToBlob(m.data):await idb.get(m.id);if(!blob)continue;
      const meta=Object.assign({},m);delete meta.data;
      await addTrackFromBlob(blob,meta);
      if(m.data)idb.put(m.id,blob).catch(()=>{});
    }catch(e){}
  }
  computeLip();renderTracks();render();
}

// ---------- pemutaran ----------
function audioStart(fromFrame,opt){
  opt=opt||{};audioStop();
  if(muteAudio||!audioTracks.length)return;
  const c=ac();if(c.state==='suspended')c.resume();
  const now=c.currentTime+0.03,t0=fromFrame/FPS;
  audioTracks.forEach(t=>{
    if(t0>=t.start+t.buf.duration)return;
    const s=c.createBufferSource(),g=c.createGain();
    s.buffer=t.buf;g.gain.value=t.vol;s.connect(g);g.connect(c.destination);if(opt.dest)g.connect(opt.dest);
    s.start(now+Math.max(0,t.start-t0),Math.max(0,t0-t.start));playingSrc.push(s);
  });
}
function audioStop(){playingSrc.forEach(s=>{try{s.stop();}catch(e){}});playingSrc=[];}
function audioDest(){return ac().createMediaStreamDestination();}

// ---------- lip-sync otomatis: volume -> kapan mulut terbuka, teks -> bentuk vokal ----------
const VOWEL={a:'A',i:'E',e:'E',u:'O',o:'O'};
function computeLip(){
  lipsync={};
  audioTracks.filter(t=>t.lip).forEach(t=>{
    const d=t.buf.getChannelData(0),sr=t.buf.sampleRate,n=Math.ceil(t.buf.duration*FPS),lv=[];
    for(let i=0;i<n;i++){
      const a=Math.floor(i*sr/FPS),b=Math.min(d.length,Math.floor((i+1)*sr/FPS));let s=0,c=0;
      for(let k=a;k<b;k+=4){s+=d[k]*d[k];c++;}
      lv.push(Math.sqrt(s/Math.max(1,c)));
    }
    const sorted=[...lv].sort((x,y)=>x-y),ref=sorted[Math.floor(sorted.length*0.95)]||1e-6;
    const L=lv.map(v=>Math.min(1,v/ref)),voiced=L.map(v=>v>0.15),V=voiced.filter(Boolean).length||1;
    const vs=[...(t.text||'').toLowerCase()].filter(ch=>VOWEL[ch]).map(ch=>VOWEL[ch]);
    const shapes=[];let k=0;
    for(let i=0;i<n;i++){
      let m='X';
      if(voiced[i]){
        if(vs.length){m=vs[Math.min(vs.length-1,Math.floor(k*vs.length/V))];if(L[i]<0.35)m='S';}
        else m=L[i]>0.6?'A':L[i]>0.35?'E':'S';
        k++;
      }
      shapes.push(m);
    }
    for(let i=1;i<n-1;i++)if(shapes[i]!==shapes[i-1]&&shapes[i]!==shapes[i+1])shapes[i]=shapes[i-1];  // buang kedip 1 frame
    const f0=Math.round(t.start*FPS);shapes.forEach((m,i)=>{lipsync[f0+i]=m;});
  });
}
function lipAt(f){return lipsync[f];}
function audioBarsHTML(){
  return audioTracks.map((t,i)=>'<div class="ab" style="left:'+(2+t.start*FPS/FRAMES*96)+'%;width:'+(t.buf.duration*FPS/FRAMES*96)+'%;top:'+(22+(i%2)*7)+'px"></div>').join('');
}

// ---------- daftar track ----------
const audioList=document.getElementById('audioList');
function renderTracks(){
  audioList.innerHTML='';
  audioTracks.forEach(t=>{
    const el=document.createElement('div');el.className='trk';
    el.innerHTML='<div class="trk-h"><b></b><span class="muted"></span><button class="btn sm">✕</button></div>'+
      '<label class="sl"><span>Mulai</span><input type="range" min="0" step="0.1"><span></span></label>'+
      '<label class="sl"><span>Volume</span><input type="range" min="0" max="150" step="1"><span></span></label>'+
      '<label class="chk"><input type="checkbox"> Gerakkan mulut (lip-sync)</label>'+
      '<input class="txt" type="text" placeholder="Teks dialog (opsional), mis: halo apa kabar">';
    el.querySelector('b').textContent=t.name;el.querySelector('.muted').textContent=fmtS(t.buf.duration);
    const [rs,rv]=el.querySelectorAll('input[type=range]'),os=rs.nextElementSibling,ov=rv.nextElementSibling;
    rs.max=Math.max(10,Math.ceil(FRAMES/FPS)+5);rs.value=t.start;os.textContent=fmtS(t.start);
    rv.value=Math.round(t.vol*100);ov.textContent=rv.value+'%';
    rs.oninput=()=>{t.start=+rs.value;os.textContent=fmtS(t.start);extendToAudio();computeLip();render();};
    rv.oninput=()=>{t.vol=rv.value/100;ov.textContent=rv.value+'%';};
    const cb=el.querySelector('input[type=checkbox]');cb.checked=t.lip;cb.onchange=()=>{t.lip=cb.checked;computeLip();render();};
    const tx=el.querySelector('.txt');tx.value=t.text||'';tx.oninput=()=>{t.text=tx.value;computeLip();render();};
    el.querySelector('button').onclick=()=>{audioStop();audioTracks=audioTracks.filter(x=>x!==t);idb.del(t.id).catch(()=>{});computeLip();renderTracks();render();};
    audioList.appendChild(el);
  });
}

// ---------- upload ----------
const fAudio=document.getElementById('fAudio');
document.getElementById('bAudio').onclick=()=>fAudio.click();
fAudio.onchange=async()=>{
  const f=fAudio.files[0];fAudio.value='';if(!f)return;
  try{
    const t=await addTrackFromBlob(f,{name:f.name});
    idb.put(t.id,f).catch(()=>{});afterAudioChange();
    sayA('Audio ditambahkan mulai '+fmtS(t.start)+'. Isi teks dialog supaya bentuk mulutnya lebih pas.');
  }catch(e){sayA('Audio tidak bisa dibaca. Coba format MP3, M4A, atau WAV.');}
};

// ---------- rekam dari mikrofon (sambil animasi diputar, untuk dubbing) ----------
const bRec=document.getElementById('bRec');
bRec.onclick=async()=>{
  if(recMic){recMic.stop();return;}
  let stream;
  try{stream=await navigator.mediaDevices.getUserMedia({audio:true});}
  catch(e){sayA('Mikrofon tidak diizinkan atau tidak tersedia.');return;}
  const chunks=[],startF=frame,r=new MediaRecorder(stream);recMic=r;
  r.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
  r.onstop=async()=>{
    stream.getTracks().forEach(t=>t.stop());recMic=null;muteAudio=false;if(playing)stop();
    bRec.textContent='🎤 Rekam suara';
    try{
      const blob=new Blob(chunks,{type:r.mimeType||'audio/webm'});
      const t=await addTrackFromBlob(blob,{name:'Rekaman '+(audioTracks.length+1),start:startF/FPS});
      idb.put(t.id,blob).catch(()=>{});afterAudioChange();
      sayA('Rekaman ditambahkan mulai '+fmtS(t.start)+'.');
    }catch(e){sayA('Rekaman gagal diproses.');}
  };
  r.start();bRec.textContent='⏹ Stop rekam';muteAudio=true;play();
  sayA('Merekam… animasi diputar supaya dubbing pas dengan gerakan. Tekan ⏹ untuk berhenti.');
};
