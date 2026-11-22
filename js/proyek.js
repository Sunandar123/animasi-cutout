// Proyek: simpan/buka file, simpan otomatis, background, kamera ikut, ekspor video
const projMsg=document.getElementById('projMsg');
function say(t){projMsg.textContent=t;}
function stamp(){const d=new Date(),p=n=>String(n).padStart(2,'0');return d.getFullYear()+p(d.getMonth()+1)+p(d.getDate())+'-'+p(d.getHours())+p(d.getMinutes());}
function download(blob,name){
  const a=document.createElement('a'),u=URL.createObjectURL(blob);
  a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(u),5000);
}

// ---------- simpan / buka file proyek (.json) ----------
// v2: banyak karakter, objek, kamera terpisah. withImg=true menyertakan semua gambar (untuk file .json)
function projectData(withImg){
  return {app:'animasi-cutout',v:2,frames:FRAMES,active,camKeys,camFollow,cmd:cmdIn.value,
    bg:{x:bg.x,y:bg.y,s:bg.s,screen:!!bg.screen,src:withImg?bg.src:null},
    chars:chars.map(c=>({id:c.id,name:c.name,look:c.look,keys:c.keys,
      parts:Object.fromEntries(Object.entries(c.parts).map(([pid,p])=>[pid,{px:p.px,py:p.py,s:p.s,r:p.r,mouth:p.mouth,src:withImg?p.src:null}])),
      photo:c.photo?{joints:c.photo.joints,mouth:c.photo.mouth,src:withImg?c.photo.src:null}:null})),
    objs:objs.map(o=>({id:o.id,name:o.name,keys:o.keys,attach:o.attach,layer:o.layer,src:withImg?o.src:null})),
    audio:audioTracks.map(trackMeta)};
}
function idbGet(k){try{return typeof idb!=='undefined'?idb.get(k).catch(()=>null):Promise.resolve(null);}catch(e){return Promise.resolve(null);}}
function applyProject(d){
  if(!d||d.app!=='animasi-cutout'||(!d.keys&&!d.chars)) throw new Error('bukan file proyek animasi');
  if(playing)stop();
  const fixKeys=K=>{const o={};Object.keys(K||{}).forEach(f=>o[+f]=K[f]);return o;};
  if(d.chars&&d.chars.length){
    chars=d.chars.map(c=>({id:c.id,name:c.name,look:Object.assign({},LOOK0,c.look||{}),parts:{},keys:fixKeys(c.keys),_parts:c.parts||{},_photo:c.photo||null}));
    camKeys=fixKeys(d.camKeys);if(!Object.keys(camKeys).length)camKeys={0:clone(CAM0)};
  }else{                                     // proyek versi lama: 1 karakter, kamera di dalam keyframe
    const c=newChar('Budi');c.keys=fixKeys(d.keys);camKeys={};
    Object.entries(c.keys).forEach(([f,k])=>{if(k.cam){camKeys[f]=k.cam;delete k.cam;}});
    if(!Object.keys(camKeys).length)camKeys={0:clone(CAM0)};
    chars=[c];
  }
  setActive(Math.min(d.active||0,chars.length-1));
  objs=(d.objs||[]).map(o=>({id:o.id,name:o.name,keys:fixKeys(o.keys),attach:o.attach||null,layer:o.layer||'front',img:null,_src:o.src}));
  selObj=-1;if(sel==='obj')sel='root';
  FRAMES=Math.max(12,d.frames||48);frame=0;
  camFollow=!!d.camFollow;document.getElementById('bFollow').classList.toggle('on',camFollow);
  if(typeof d.cmd==='string')cmdIn.value=d.cmd;
  const b=d.bg||{};bg.x=b.x??W/2;bg.y=b.y??H/2;bg.s=b.s??1;bg.screen=!!b.screen;
  if(b.src)setBgSrc(b.src,false);else{bg.src=null;bg.img=null;}
  buildChips();buildSliders();render();
  loadSceneImages();
  loadAudioFromProject(d.audio);
}
// gambar bagian tubuh & objek: dari file proyek, atau dari penyimpanan browser
async function loadSceneImages(){
  for(const c of chars){
    const parts=c._parts||{};delete c._parts;
    for(const [pid,p] of Object.entries(parts)){
      const src=p.src||await idbGet('img:'+c.id+':'+pid);if(!src)continue;
      try{const {src:_,...cfg}=p;await setPartImage(c,pid,src,cfg);if(p.src)idbPut('img:'+c.id+':'+pid,src);}catch(e){}
    }
  }
  for(const c of chars){
    const p=c._photo;delete c._photo;if(!p)continue;
    const src=p.src||await idbGet('img:'+c.id+':photo');if(!src)continue;
    try{await setPhoto(c,src,p.joints,p.mouth);if(p.src)idbPut('img:'+c.id+':photo',src);}catch(e){}
  }
  for(const o of objs){
    const src=o._src||await idbGet('img:'+o.id);delete o._src;if(!src)continue;
    try{const img=await loadImg(src);o.src=src;o.img=img;o.base=100/Math.max(img.width,img.height);idbPut('img:'+o.id,src);}catch(e){}
  }
  buildChips();buildSliders();render();
}
document.getElementById('bSave').onclick=async()=>{
  const d=projectData(true);
  d.audio=await Promise.all(audioTracks.map(async t=>Object.assign(trackMeta(t),{data:await blobToDataURL(t.blob)})));
  download(new Blob([JSON.stringify(d)],{type:'application/json'}),'animasi-'+stamp()+'.json');
  say('Proyek disimpan (cek folder Download).');
};
const fOpen=document.getElementById('fOpen');
document.getElementById('bOpen').onclick=()=>fOpen.click();
fOpen.onchange=()=>{
  const f=fOpen.files[0];if(!f)return;
  const r=new FileReader();
  r.onload=()=>{try{applyProject(JSON.parse(r.result));say('Proyek dibuka: '+f.name);}catch(e){say('Gagal membuka: '+e.message);}};
  r.readAsText(f);fOpen.value='';
};

// ---------- background ----------
function setBgSrc(src,fit){
  const img=new Image();
  img.onload=()=>{
    bg.img=img;bg.src=src;
    if(fit){bg.s=Math.max(W/img.width,H/img.height);bg.x=W/2;bg.y=H/2;}
    buildSliders();render();saveBgLocal();
  };
  img.src=src;
}
function clearBg(){bg.src=null;bg.img=null;bg.x=W/2;bg.y=H/2;bg.s=1;buildSliders();render();saveBgLocal();}
// perkecil gambar supaya ringan; PNG/WebP tetap transparan
function shrinkImage(file,cb,max){
  max=max||1600;
  const r=new FileReader();
  r.onload=()=>{
    const im=new Image();
    im.onload=()=>{
      const sc=Math.min(1,max/Math.max(im.width,im.height));
      const c=document.createElement('canvas');c.width=Math.round(im.width*sc);c.height=Math.round(im.height*sc);
      c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      cb(file.type==='image/jpeg'?c.toDataURL('image/jpeg',0.85):c.toDataURL('image/png'));
    };
    im.onerror=()=>say('Gambar tidak bisa dibaca.');
    im.src=r.result;
  };
  r.readAsDataURL(file);
}
const fBg=document.getElementById('fBg');
document.getElementById('bBg').onclick=()=>fBg.click();
fBg.onchange=()=>{
  const f=fBg.files[0];if(!f)return;
  shrinkImage(f,src=>{setBgSrc(src,true);sel='bg';buildChips();buildSliders();say('Background dipasang. Atur skala/posisi di chip 🖼 Background.');});
  fBg.value='';
};

// ---------- kamera ikut karakter ----------
document.getElementById('bFollow').onclick=e=>{camFollow=!camFollow;e.currentTarget.classList.toggle('on',camFollow);render();};

// ---------- simpan otomatis di browser ----------
const LS='animasi-cutout:proyek',LSBG='animasi-cutout:bg';
let lastSaved='';
function saveLocal(){
  if(playing||exporting||drag)return;
  try{const s=JSON.stringify(projectData(false));if(s!==lastSaved){localStorage.setItem(LS,s);lastSaved=s;}}catch(e){}
}
function saveBgLocal(){
  try{if(bg.src)localStorage.setItem(LSBG,bg.src);else localStorage.removeItem(LSBG);}
  catch(e){say('Background terlalu besar untuk simpan otomatis, pakai 💾 Simpan.');}
}
function loadLocal(){
  try{
    const s=localStorage.getItem(LS);if(!s)return false;
    const d=JSON.parse(s),src=localStorage.getItem(LSBG);
    if(src)d.bg=Object.assign(d.bg||{},{src});
    applyProject(d);lastSaved=s;say('Proyek terakhir dipulihkan otomatis.');return true;
  }catch(e){return false;}
}
setInterval(saveLocal,2000);

// ---------- ekspor video ----------
let rec=null;
const bExport=document.getElementById('bExport');
bExport.onclick=()=>{if(exporting){if(rec&&rec.state!=='inactive')rec.stop();return;}exportVideo();};
function exportVideo(){
  if(!cv.captureStream||!window.MediaRecorder){say('Browser ini belum mendukung ekspor video. Coba Chrome terbaru.');return;}
  const withAudio=audioTracks.length>0;
  const mime=(withAudio
    ?['video/mp4;codecs=avc1,mp4a.40.2','video/mp4','video/webm;codecs=vp9,opus','video/webm;codecs=vp8,opus','video/webm']
    :['video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm']).find(t=>MediaRecorder.isTypeSupported(t))||'';
  if(playing)stop();
  const oldDpr=dpr;dpr=3;cv.width=W*dpr;cv.height=H*dpr;      // render resolusi tinggi saat ekspor
  exporting=true;frame=0;render();
  bExport.textContent='⏹ Batal';
  const chunks=[],vstream=cv.captureStream(FPS),adest=withAudio?audioDest():null;
  const stream=adest?new MediaStream([...vstream.getVideoTracks(),...adest.stream.getAudioTracks()]):vstream;   // gambar + suara
  rec=new MediaRecorder(stream,Object.assign({videoBitsPerSecond:8e6},mime?{mimeType:mime}:{}));
  rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
  rec.onstop=()=>{
    audioStop();vstream.getTracks().forEach(t=>t.stop());
    const done=frame>=FRAMES;
    exporting=false;dpr=oldDpr;cv.width=W*dpr;cv.height=H*dpr;bExport.textContent='🎬 Ekspor video';render();
    if(!done){say('Ekspor dibatalkan.');return;}
    const type=rec.mimeType||mime||'video/webm',ext=type.includes('mp4')?'mp4':'webm';
    download(new Blob(chunks,{type}),'animasi-'+stamp()+'.'+ext);
    say('Video tersimpan: '+ext.toUpperCase()+', '+(FRAMES/FPS).toFixed(1).replace('.',',')+' dtk.'+(ext==='webm'?' WebM bisa diputar di Chrome/VLC, atau diubah ke MP4 lewat CapCut.':''));
  };
  rec.start(250);
  if(adest)audioStart(0,{dest:adest});
  const t0=performance.now();
  (function loop(now){
    if(!exporting)return;
    const f=Math.min(FRAMES,Math.floor((now-t0)/(1000/FPS)));
    if(f!==frame){frame=f;render();}
    say('Merekam… '+Math.round(frame/FRAMES*100)+'% (jangan pindah aplikasi)');
    if(frame>=FRAMES){setTimeout(()=>{if(rec.state!=='inactive')rec.stop();},200);return;}
    requestAnimationFrame(loop);
  })(t0);
}
