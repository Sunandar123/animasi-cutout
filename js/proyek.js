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
function projectData(withBg){
  return {app:'animasi-cutout',v:1,frames:FRAMES,keys,camFollow,cmd:cmdIn.value,
          bg:{x:bg.x,y:bg.y,s:bg.s,src:withBg?bg.src:null}};
}
function applyProject(d){
  if(!d||d.app!=='animasi-cutout'||!d.keys) throw new Error('bukan file proyek animasi');
  if(playing)stop();
  keys={};Object.keys(d.keys).forEach(f=>keys[+f]=d.keys[f]);
  FRAMES=Math.max(12,d.frames||48);frame=0;
  camFollow=!!d.camFollow;document.getElementById('bFollow').classList.toggle('on',camFollow);
  if(typeof d.cmd==='string')cmdIn.value=d.cmd;
  const b=d.bg||{};bg.x=b.x??W/2;bg.y=b.y??H/2;bg.s=b.s??1;
  if(b.src)setBgSrc(b.src,false);else{bg.src=null;bg.img=null;}
  buildChips();buildSliders();render();
}
document.getElementById('bSave').onclick=()=>{
  download(new Blob([JSON.stringify(projectData(true))],{type:'application/json'}),'animasi-'+stamp()+'.json');
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
function shrinkImage(file,cb){
  const r=new FileReader();
  r.onload=()=>{
    const im=new Image();
    im.onload=()=>{
      const sc=Math.min(1,1600/Math.max(im.width,im.height));
      const c=document.createElement('canvas');c.width=Math.round(im.width*sc);c.height=Math.round(im.height*sc);
      c.getContext('2d').drawImage(im,0,0,c.width,c.height);
      cb(file.type==='image/png'?c.toDataURL('image/png'):c.toDataURL('image/jpeg',0.85));
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
  const mime=['video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9','video/webm;codecs=vp8','video/webm'].find(t=>MediaRecorder.isTypeSupported(t))||'';
  if(playing)stop();
  const oldDpr=dpr;dpr=3;cv.width=W*dpr;cv.height=H*dpr;      // render resolusi tinggi saat ekspor
  exporting=true;frame=0;render();
  bExport.textContent='⏹ Batal';
  const chunks=[],stream=cv.captureStream(FPS);
  rec=new MediaRecorder(stream,Object.assign({videoBitsPerSecond:8e6},mime?{mimeType:mime}:{}));
  rec.ondataavailable=e=>{if(e.data&&e.data.size)chunks.push(e.data);};
  rec.onstop=()=>{
    stream.getTracks().forEach(t=>t.stop());
    const done=frame>=FRAMES;
    exporting=false;dpr=oldDpr;cv.width=W*dpr;cv.height=H*dpr;bExport.textContent='🎬 Ekspor video';render();
    if(!done){say('Ekspor dibatalkan.');return;}
    const type=rec.mimeType||mime||'video/webm',ext=type.includes('mp4')?'mp4':'webm';
    download(new Blob(chunks,{type}),'animasi-'+stamp()+'.'+ext);
    say('Video tersimpan: '+ext.toUpperCase()+', '+(FRAMES/FPS).toFixed(1).replace('.',',')+' dtk.'+(ext==='webm'?' WebM bisa diputar di Chrome/VLC, atau diubah ke MP4 lewat CapCut.':''));
  };
  rec.start(250);
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
