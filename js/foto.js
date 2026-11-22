// Karakter dari foto: AI (MediaPipe) menghapus background + mendeteksi sendi, lalu foto dibungkus mesh yang ditarik tulang
const MP_VER='0.10.14';
const MP_BASE='https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@'+MP_VER;
const MP_MODEL='https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task';
// tulang foto: [titik awal, titik akhir]; hip & spine dihitung dari titik lain
const PH_BONES={torso:['hip','spine'],chest:['spine','neck'],head:['neck','headTop'],
  armF_u:['shoulderF','elbowF'],armF_l:['elbowF','wristF'],armB_u:['shoulderB','elbowB'],armB_l:['elbowB','wristB'],
  legF_u:['hipF','kneeF'],legF_l:['kneeF','ankleF'],legB_u:['hipB','kneeB'],legB_l:['kneeB','ankleB']};
const PH_ORDER=['torso','chest','head','armF_u','armF_l','armB_u','armB_l','legF_u','legF_l','legB_u','legB_l'];
const PH_GROUP={torso:'body',chest:'body',head:'body',armF_u:'armF',armF_l:'armF',armB_u:'armB',armB_l:'armB',legF_u:'legF',legF_l:'legF',legB_u:'legB',legB_l:'legB'};
const PH_GROUPS={body:['torso','chest','head'],armF:['armF_u','armF_l','chest'],armB:['armB_u','armB_l','chest'],legF:['legF_u','legF_l','torso'],legB:['legB_u','legB_l','torso']};
const PH_LAYER={armB_u:0,armB_l:0,legB_u:1,legB_l:1,torso:2,chest:2,legF_u:3,legF_l:3,head:4,armF_u:5,armF_l:5};
const JOINT_NAMES={headTop:'ubun',neck:'leher',mouth:'mulut',shoulderF:'bahu D',elbowF:'siku D',wristF:'tangan D',shoulderB:'bahu B',elbowB:'siku B',wristB:'tangan B',
  hipF:'pinggul D',kneeF:'lutut D',ankleF:'kaki D',hipB:'pinggul B',kneeB:'lutut B',ankleB:'kaki B'};
// posisi bawaan (pecahan lebar/tinggi gambar) kalau AI tidak tersedia
const JOINT_TEMPLATE={headTop:[.5,.02],mouth:[.5,.12],neck:[.5,.17],shoulderF:[.42,.21],elbowF:[.38,.36],wristF:[.37,.5],shoulderB:[.58,.21],elbowB:[.62,.36],wristB:[.63,.5],
  hipF:[.45,.53],kneeF:[.45,.74],ankleF:[.45,.95],hipB:[.55,.53],kneeB:[.55,.74],ankleB:[.55,.95]};

// ---------- AI: muat sekali, lalu dipakai lagi ----------
let poseLM=null;
async function getPoseLandmarker(){
  if(poseLM)return poseLM;
  const mp=await import(MP_BASE+'/vision_bundle.mjs');
  const fs=await mp.FilesetResolver.forVisionTasks(MP_BASE+'/wasm');
  const opts=d=>({baseOptions:{modelAssetPath:MP_MODEL,delegate:d},runningMode:'IMAGE',numPoses:1,outputSegmentationMasks:true});
  // CPU dulu: mask background lebih andal di HP (GPU kadang memberi mask kosong)
  try{poseLM=await mp.PoseLandmarker.createFromOptions(fs,opts('CPU'));}
  catch(e){poseLM=await mp.PoseLandmarker.createFromOptions(fs,opts('GPU'));}
  return poseLM;
}
// hasil: {lm:[33 titik ternormalisasi], mask:{w,h,data}} atau null kalau tidak ada orang
async function detectPose(img){
  const lmk=await getPoseLandmarker();
  let out=null;
  lmk.detect(img,res=>{
    if(!res.landmarks||!res.landmarks.length)return;
    const m=res.segmentationMasks&&res.segmentationMasks[0];
    out={lm:res.landmarks[0].map(p=>({x:p.x,y:p.y,z:p.z,v:p.visibility??1})),
         mask:m?{w:m.width,h:m.height,data:Float32Array.from(m.getAsFloat32Array())}:null};
  });
  return out;
}

// ---------- olah foto: potong background, cari sendi ----------
function canvasOf(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c;}
const mid=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
function jointsFromLandmarks(L,W2,H2){
  const pt=i=>[L[i].x*W2,L[i].y*H2];
  const zA=(L[11].z+L[23].z)/2,zB=(L[12].z+L[24].z)/2,A=zA<=zB;   // sisi yang lebih dekat kamera = depan
  const s=A?{sh:11,el:13,wr:15,hp:23,kn:25,an:27}:{sh:12,el:14,wr:16,hp:24,kn:26,an:28};
  const t=A?{sh:12,el:14,wr:16,hp:24,kn:26,an:28}:{sh:11,el:13,wr:15,hp:23,kn:25,an:27};
  const shM=mid(pt(11),pt(12)),hpM=mid(pt(23),pt(24));
  const neck=[hpM[0]+(shM[0]-hpM[0])/0.86,hpM[1]+(shM[1]-hpM[1])/0.86];
  const ears=[7,8].filter(i=>L[i].v>0.4);
  const hc=ears.length?ears.map(pt).reduce((a,b)=>mid(a,b)):pt(0);
  const headTop=[hc[0]+(hc[0]-neck[0])*0.85,hc[1]+(hc[1]-neck[1])*0.85];
  return {headTop,neck,mouth:mid(pt(9),pt(10)),
    shoulderF:pt(s.sh),elbowF:pt(s.el),wristF:pt(s.wr),hipF:pt(s.hp),kneeF:pt(s.kn),ankleF:pt(s.an),
    shoulderB:pt(t.sh),elbowB:pt(t.el),wristB:pt(t.wr),hipB:pt(t.hp),kneeB:pt(t.kn),ankleB:pt(t.an),
    _facingLeft:L[0].x<(ears.length?hc[0]/W2:L[0].x)-0.01&&Math.abs(L[11].x-L[12].x)<0.08};
}
function templateJoints(w,h){const J={};Object.entries(JOINT_TEMPLATE).forEach(([k,[x,y]])=>J[k]=[x*w,y*h]);return J;}
// potong orang dari background memakai mask AI, lalu crop ke badan orangnya
function cutPerson(img,det){
  const w=img.width,h=img.height,c=canvasOf(w,h),g=c.getContext('2d');g.drawImage(img,0,0);
  let J=det?jointsFromLandmarks(det.lm,w,h):templateJoints(w,h);
  if(!det||!det.mask)return {canvas:c,joints:J,cut:false};
  const M=det.mask,mAt=(x,y)=>M.data[Math.floor(y*M.h/h)*M.w+Math.floor(x*M.w/w)];
  let x0=w,y0=h,x1=0,y1=0,n=0;
  for(let y=0;y<h;y++)for(let x=0;x<w;x++)if(mAt(x,y)>0.5){n++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;}
  // mask tidak masuk akal (kosong/penuh) -> pakai foto apa adanya, jangan sampai karakter jadi transparan
  if(n<w*h*0.01||n>w*h*0.97)return {canvas:c,joints:J,cut:false,maskBad:true};
  const id=g.getImageData(0,0,w,h);
  for(let y=0;y<h;y++)for(let x=0;x<w;x++){const a=Math.max(0,Math.min(1,(mAt(x,y)-0.3)/0.35));id.data[(y*w+x)*4+3]=Math.round(a*255);}
  g.putImageData(id,0,0);
  if(x1<=x0||y1<=y0)return {canvas:c,joints:J,cut:true};
  const pad=Math.round(Math.max(x1-x0,y1-y0)*0.04);
  x0=Math.max(0,x0-pad);y0=Math.max(0,y0-pad);x1=Math.min(w,x1+pad);y1=Math.min(h,y1+pad);
  const cc=canvasOf(x1-x0,y1-y0);cc.getContext('2d').drawImage(c,-x0,-y0);
  Object.keys(J).forEach(k=>{if(Array.isArray(J[k]))J[k]=[J[k][0]-x0,J[k][1]-y0];});
  return {canvas:cc,joints:J,cut:true};
}
function flipCanvas(src){const c=canvasOf(src.width,src.height),g=c.getContext('2d');g.translate(src.width,0);g.scale(-1,1);g.drawImage(src,0,0);return c;}

// ---------- rig: mesh + bobot tulang ----------
function fullJoints(J){
  const hip=mid(J.hipF,J.hipB),spine=[hip[0]+(J.neck[0]-hip[0])*35/72,hip[1]+(J.neck[1]-hip[1])*35/72];
  return Object.assign({},J,{hip,spine});
}
function bindPhoto(ch){
  const ph=ch.photo,img=ph.img,w=img.width,h=img.height,J=fullJoints(ph.joints);
  const tex=canvasOf(w,h),g=tex.getContext('2d');g.drawImage(img,0,0);
  const alpha=g.getImageData(0,0,w,h).data,A=(x,y)=>alpha[(Math.min(h-1,Math.max(0,Math.round(y)))*w+Math.min(w-1,Math.max(0,Math.round(x))))*4+3];
  const bones={};
  PH_ORDER.forEach(id=>{const [a,b]=PH_BONES[id],o=J[a],e=J[b];bones[id]={o,e,th:Math.atan2(-(e[0]-o[0]),e[1]-o[1]),len:Math.hypot(e[0]-o[0],e[1]-o[1])||1};});
  const legLen=(bones.legF_u.len+bones.legF_l.len+bones.legB_u.len+bones.legB_l.len)/2;
  let gs=92/Math.max(1,legLen);       // skala: panjang kaki foto = panjang kaki kerangka
  // batasi tinggi badan supaya tidak raksasa/kerdil kalau kaki terpotong atau titiknya meleset
  const bodyH=Math.max(1,Math.max(J.ankleF[1],J.ankleB[1])-J.headTop[1]);
  gs=Math.max(140/bodyH,Math.min(260/bodyH,gs));
  // mesh dipisah per kelompok (badan, tiap lengan, tiap kaki) supaya kaki/lengan tidak saling menempel
  const cell=Math.max(5,Math.round(Math.max(w,h)/48)),cols=Math.ceil(w/cell),rows=Math.ceil(h/cell);
  const vid={},verts=[],tris=[];
  const V=(i,j,grp)=>{const k=i+','+j+','+grp;if(vid[k]!==undefined)return vid[k];
    const x=Math.min(w,i*cell),y=Math.min(h,j*cell);
    const ds=PH_GROUPS[grp].map(id=>{const b=bones[id];return [id,1/Math.pow(distSeg(x,y,b.o[0],b.o[1],b.e[0],b.e[1])/cell+0.6,4)];}).sort((p,q)=>q[1]-p[1]).slice(0,2);
    const s2=ds[0][1]+ds[1][1];verts.push({x,y,ws:[[ds[0][0],ds[0][1]/s2],[ds[1][0],ds[1][1]/s2]]});return vid[k]=verts.length-1;};
  for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
    let n=0;for(let a2=0;a2<=2;a2++)for(let b2=0;b2<=2;b2++)if(A((i+a2/2)*cell,(j+b2/2)*cell)>40)n++;
    if(n<2&&A((i+.5)*cell,(j+.5)*cell)<=40)continue;
    const cx=(i+.5)*cell,cy=(j+.5)*cell;
    const dom=PH_ORDER.map(id=>[id,distSeg(cx,cy,bones[id].o[0],bones[id].o[1],bones[id].e[0],bones[id].e[1])]).sort((p,q)=>p[1]-q[1])[0][0];
    const grp=PH_GROUP[dom],a=V(i,j,grp),b=V(i+1,j,grp),c=V(i+1,j+1,grp),d=V(i,j+1,grp);
    tris.push({t:[a,b,c],l:PH_LAYER[dom]},{t:[a,c,d],l:PH_LAYER[dom]});
  }
  if(!tris.length){       // gambar transparan semua -> pakai seluruh kotak gambar
    for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
      const cx=(i+.5)*cell,cy=(j+.5)*cell;
      const dom=PH_ORDER.map(id=>[id,distSeg(cx,cy,bones[id].o[0],bones[id].o[1],bones[id].e[0],bones[id].e[1])]).sort((p,q)=>p[1]-q[1])[0][0];
      const grp=PH_GROUP[dom],a=V(i,j,grp),b=V(i+1,j,grp),c=V(i+1,j+1,grp),d=V(i,j+1,grp);
      tris.push({t:[a,b,c],l:PH_LAYER[dom]},{t:[a,c,d],l:PH_LAYER[dom]});
    }
  }
  tris.sort((p,q)=>p.l-q.l);
  ph.bind={tex,bones,g:gs,verts,tris:tris.map(t=>t.t),mouth:ph.joints.mouth};
}
// transformasi tiap tulang: foto (posisi diam) -> pose sekarang
function photoXf(ch,pose){
  const B=ch.photo.bind,w=computeWorld(pose),M={};
  PH_ORDER.forEach(id=>{
    const b=B.bones[id];let o;
    if(id==='torso')o=[pose.x,pose.y];else o=applyM(M[P[id].parent],b.o);
    M[id]={ox:o[0],oy:o[1],ang:w[id].a-b.th,o:b.o,g:B.g};
  });
  return {M,w};
}
function applyM(m,v){const q=rot((v[0]-m.o[0])*m.g,(v[1]-m.o[1])*m.g,m.ang);return [m.ox+q[0],m.oy+q[1]];}
function photoWorldFrom(B,M,w){
  const out={};
  PH_ORDER.forEach(id=>{const b=B.bones[id],m=M[id],e=applyM(m,b.e);out[id]={x:m.ox,y:m.oy,ex:e[0],ey:e[1],a:w[id].a,len:b.len*B.g};});
  const hd=out.head;hd.cx=(hd.x+hd.ex)/2;hd.cy=(hd.y+hd.ey)/2;hd.rad=hd.len/2;
  return out;
}
function photoWorld(ch,pose){const {M,w}=photoXf(ch,pose);return photoWorldFrom(ch.photo.bind,M,w);}
function charWorld(ch,pose){return ch.photo&&ch.photo.bind?photoWorld(ch,pose):computeWorld(pose);}
function drawPhotoChar(pose,ch,alpha,ghost){
  const B=ch.photo.bind,{M,w}=photoXf(ch,pose),PW=photoWorldFrom(B,M,w);
  ctx.save();flipCtx(pose);ctx.globalAlpha*=alpha;
  if(ghost){
    ctx.strokeStyle=ghost;ctx.lineWidth=8;ctx.lineCap='round';
    PH_ORDER.forEach(id=>{const j=PW[id];ctx.beginPath();ctx.moveTo(j.x,j.y);ctx.lineTo(j.ex,j.ey);ctx.stroke();});
    ctx.restore();return PW;
  }
  const V=B.verts.map(v=>{let x=0,y=0;for(const [id,wt] of v.ws){const p=applyM(M[id],[v.x,v.y]);x+=p[0]*wt;y+=p[1]*wt;}return {x,y,u:v.x,v:v.y};});
  B.tris.forEach(t=>drawTexTri(V[t[0]],V[t[1]],V[t[2]],B.tex,1.1));
  const ms=pose.mouth||'X';
  if(ms!=='X'&&B.mouth&&ch.photo.mouth!==false){     // mulut lip-sync ditempel di wajah foto
    const p=applyM(M.head,B.mouth),k=B.bones.head.len*B.g/46;
    ctx.save();ctx.translate(p[0],p[1]);ctx.scale(k,k);drawMouth({x:0,y:0,a:w.head.a},0,0,1,ms);ctx.restore();
  }
  if(showMesh){
    ctx.lineWidth=0.6;ctx.strokeStyle='rgba(255,255,255,.7)';ctx.beginPath();
    B.tris.forEach(([a,b,c])=>{ctx.moveTo(V[a].x,V[a].y);ctx.lineTo(V[b].x,V[b].y);ctx.lineTo(V[c].x,V[c].y);ctx.closePath();});ctx.stroke();
  }
  ctx.restore();
  return PW;
}

// ---------- alur: pilih foto -> AI -> rig -> atur titik ----------
let photoEdit=false;
async function setPhoto(ch,src,joints,mouthOn,extra){
  const img=await loadImg(src);
  ch.photo=Object.assign({src,img,joints,mouth:mouthOn!==false},extra||{});bindPhoto(ch);
}
// proses foto asli: AI -> (hapus background) -> rig. orig disimpan supaya bisa diproses ulang
async function processPhoto(ch,orig,removeBg){
  const img=await loadImg(orig);let det=null,aiOk=true;
  say('🤖 Memuat AI & mendeteksi pose… (pertama kali agak lama)');
  try{det=await detectPose(img);}catch(e){aiOk=false;}
  let r=cutPerson(img,removeBg?det:(det&&{lm:det.lm,mask:null}));
  if(det&&r.joints._facingLeft){         // foto menghadap kiri -> dibalik supaya menghadap kanan
    const fc=flipCanvas(r.canvas),W2=fc.width;Object.keys(r.joints).forEach(k=>{if(Array.isArray(r.joints[k]))r.joints[k]=[W2-r.joints[k][0],r.joints[k][1]];});
    r=Object.assign({},r,{canvas:fc});
  }
  delete r.joints._facingLeft;
  const out=r.canvas.toDataURL('image/png');
  await setPhoto(ch,out,r.joints,ch.photo?ch.photo.mouth:true,{orig,nobg:!removeBg});
  idbPut('img:'+ch.id+':photo',out);idbPut('img:'+ch.id+':photoOrig',orig);
  photoEdit=true;sel='look';buildChips();buildSliders();render();
  say(!aiOk?'AI tidak bisa dimuat (cek internet). Atur titik sendi secara manual, background tidak dihapus.'
    :!det?'Orang tidak terdeteksi. Atur titik sendi secara manual.'
    :r.maskBad?'⚠ Background tidak bisa dihapus otomatis untuk foto ini, foto dipakai apa adanya. Rapikan titik sendi, lalu ✓ Selesai.'
    :'✓ Foto jadi karakter'+(r.cut?' (background dihapus)':'')+'. Rapikan titik yang meleset, lalu tekan ✓ Selesai.');
}
const fPhoto=document.getElementById('fPhoto');
fPhoto.onchange=()=>{
  const f=fPhoto.files[0];fPhoto.value='';if(!f)return;
  const ch=curChar();
  shrinkImage(f,async src=>{
    try{await processPhoto(ch,src,true);}catch(e){say('Foto gagal diproses.');}
  },1024);
};
function flipPhoto(ch){
  const ph=ch.photo,fc=flipCanvas(ph.img),W2=fc.width,J={};
  Object.entries(ph.joints).forEach(([k,v])=>J[k]=[W2-v[0],v[1]]);
  const out=fc.toDataURL('image/png');
  setPhoto(ch,out,J,ph.mouth,{orig:ph.orig,nobg:ph.nobg}).then(()=>{idbPut('img:'+ch.id+':photo',out);buildSliders();render();});
}
function removePhoto(ch){delete ch.photo;photoEdit=false;idbDel('img:'+ch.id+':photo');idbDel('img:'+ch.id+':photoOrig');buildSliders();render();}

// panel di 🎨 Tampilan
function buildPhotoPanel(ch){
  const row=addRow();
  if(!ch.photo){
    addBtn(row,'📷 Buat dari foto (AI)',()=>fPhoto.click(),'primary');
    addNote('Upload foto orang badan utuh. AI menghapus background & mencari sendi otomatis. Hasil terbaik: tampak samping, tangan tidak menempel ke badan.');
    return;
  }
  if(photoEdit){buildRigEditor(ch);return;}
  addBtn(row,'✏️ Atur titik sendi',()=>{photoEdit=true;buildSliders();});
  addBtn(row,'↔ Balik foto',()=>flipPhoto(ch));
  addBtn(row,'📷 Ganti foto',()=>fPhoto.click());
  addBtn(row,'🗑 Kembali ke kartun',()=>removePhoto(ch));
  const lb=document.createElement('label');lb.className='chk';
  lb.innerHTML='<input type="checkbox"> Tampilkan mulut lip-sync di wajah foto';
  const cb=lb.querySelector('input');cb.checked=ch.photo.mouth!==false;cb.onchange=()=>{ch.photo.mouth=cb.checked;render();};
  slEl.appendChild(lb);
  if(ch.photo.orig){
    const lb2=document.createElement('label');lb2.className='chk';
    lb2.innerHTML='<input type="checkbox"> Hapus background foto (diproses ulang, titik sendi dideteksi lagi)';
    const cb2=lb2.querySelector('input');cb2.checked=!ch.photo.nobg;
    cb2.onchange=()=>processPhoto(ch,ch.photo.orig,cb2.checked).catch(()=>say('Foto gagal diproses.'));
    slEl.appendChild(lb2);
  }
}
// editor titik sendi: seret titik di atas foto
function buildRigEditor(ch){
  const ph=ch.photo,img=ph.img,cw=W,ch2=Math.min(460,Math.round(cw*img.height/img.width));
  const sc=Math.min(cw/img.width,ch2/img.height),ox=(cw-img.width*sc)/2,oy=(ch2-img.height*sc)/2;
  const c=document.createElement('canvas');c.className='rig';c.width=cw*dpr;c.height=ch2*dpr;slEl.appendChild(c);
  const g=c.getContext('2d');
  const toS=p=>[ox+p[0]*sc,oy+p[1]*sc],fromS=(x,y)=>[(x-ox)/sc,(y-oy)/sc];
  function draw(){
    g.setTransform(dpr,0,0,dpr,0,0);g.clearRect(0,0,cw,ch2);
    g.fillStyle='#ccc';for(let y=0;y<ch2;y+=12)for(let x=(y/12)%2*12;x<cw;x+=24)g.fillRect(x,y,12,12);
    g.drawImage(img,ox,oy,img.width*sc,img.height*sc);
    const J=fullJoints(ph.joints);
    g.lineCap='round';g.lineWidth=3;
    PH_ORDER.forEach(id=>{const [a,b]=PH_BONES[id],p=toS(J[a]),q=toS(J[b]);g.strokeStyle=id.includes('B')?'rgba(43,108,217,.8)':'rgba(217,98,43,.9)';g.beginPath();g.moveTo(p[0],p[1]);g.lineTo(q[0],q[1]);g.stroke();});
    g.font='10px system-ui';
    Object.entries(ph.joints).forEach(([k,v])=>{const p=toS(v);g.fillStyle=k.endsWith('B')?'#2b6cd9':k==='mouth'?'#c0392b':'#d9622b';
      g.beginPath();g.arc(p[0],p[1],6,0,Math.PI*2);g.fill();g.strokeStyle='#fff';g.lineWidth=1.5;g.stroke();
      g.fillStyle='#111';g.fillText(JOINT_NAMES[k]||k,p[0]+8,p[1]-6);});
  }
  let dragK=null;
  const pos=e=>{const r=c.getBoundingClientRect();return [(e.clientX-r.left)*cw/r.width,(e.clientY-r.top)*ch2/r.height];};
  c.addEventListener('pointerdown',e=>{
    const [x,y]=pos(e);let best=null,bd=24;
    Object.entries(ph.joints).forEach(([k,v])=>{const p=toS(v),d=Math.hypot(p[0]-x,p[1]-y);if(d<bd){bd=d;best=k;}});
    if(best){dragK=best;c.setPointerCapture(e.pointerId);}
  });
  c.addEventListener('pointermove',e=>{if(!dragK)return;const [x,y]=pos(e),q=fromS(x,y);ph.joints[dragK]=[Math.round(q[0]),Math.round(q[1])];draw();});
  const end=()=>{if(dragK){dragK=null;bindPhoto(ch);render();}};
  c.addEventListener('pointerup',end);c.addEventListener('pointercancel',end);
  draw();
  addNote('Seret titik ke sendi yang benar. Oranye = sisi depan, biru = sisi belakang (D/B). Karakter di atas langsung ikut berubah.');
  const row=addRow();
  addBtn(row,'✓ Selesai',()=>{photoEdit=false;bindPhoto(ch);buildSliders();render();},'primary');
  addBtn(row,'🤖 Deteksi ulang',async()=>{
    say('🤖 Mendeteksi ulang…');
    try{const det=await detectPose(img);if(!det){say('Orang tidak terdeteksi.');return;}
      const J=jointsFromLandmarks(det.lm,img.width,img.height);delete J._facingLeft;ph.joints=J;bindPhoto(ch);buildSliders();render();say('✓ Titik sendi dideteksi ulang.');}
    catch(e){say('AI tidak bisa dimuat (cek internet).');}
  });
  addBtn(row,'↔ Balik foto',()=>flipPhoto(ch));
}
