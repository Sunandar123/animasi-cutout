// Data karakter (tulang/PARTS), pose, state aplikasi, interpolasi keyframe & kinematika maju
const D2R=Math.PI/180,R2D=180/Math.PI;
const W=360,H=340,FPS=24,GROUND=306;
let FRAMES=48;
const SKIN='#f2c9a0',SHOE='#2a2a2e';
const PARTS=[
 {id:'torso', name:'Pinggul',parent:null, ax:0,ay:0, base:180,len:35,w:28,c:'#d9622b'},
 {id:'chest', name:'Dada',   parent:'torso',ax:0,ay:35,base:0,len:37,w:28,c:'#d9622b'},
 {id:'head',  name:'Kepala',parent:'chest',ax:0,ay:37,base:0,len:0,w:0,c:SKIN},
 {id:'armF_u',name:'Lengan dpn atas', parent:'chest', ax:0,ay:27,base:180,len:38,w:13,c:'#ec8150'},
 {id:'armF_l',name:'Lengan dpn bawah',parent:'armF_u',ax:0,ay:38,base:0,len:34,w:11,c:'#ec8150'},
 {id:'armB_u',name:'Lengan blkg atas', parent:'chest', ax:0,ay:27,base:180,len:38,w:13,c:'#a8471c'},
 {id:'armB_l',name:'Lengan blkg bawah',parent:'armB_u',ax:0,ay:38,base:0,len:34,w:11,c:'#a8471c'},
 {id:'legF_u',name:'Paha dpn', parent:'torso', ax:0,ay:0,base:180,len:46,w:16,c:'#44557a'},
 {id:'legF_l',name:'Betis dpn',parent:'legF_u',ax:0,ay:46,base:0,len:46,w:14,c:'#44557a'},
 {id:'legB_u',name:'Paha blkg', parent:'torso', ax:0,ay:0,base:180,len:46,w:16,c:'#2b3550'},
 {id:'legB_l',name:'Betis blkg',parent:'legB_u',ax:0,ay:46,base:0,len:46,w:14,c:'#2b3550'},
];
const P={};PARTS.forEach(p=>P[p.id]=p);
const HIT_ORDER=['armF_l','armF_u','head','chest','torso','legF_l','legF_u','armB_l','armB_u','legB_l','legB_u'];
const DRAW_ORDER=['legB_u','legB_l','armB_u','armB_l','legF_u','legF_l','torso','head','armF_u','armF_l'];

const DEFAULT={x:180,y:208,r:{torso:0,head:0,armF_u:8,armF_l:-12,armB_u:-8,armB_l:-12,legF_u:-4,legF_l:2,legB_u:4,legB_l:2}};
const contactA={x:180,y:218,belly:0,r:{chest:-6,torso:5,head:-3,armF_u:28,armF_l:-25,armB_u:-28,armB_l:-15,legF_u:-28,legF_l:6,legB_u:24,legB_l:18}};
const passA={x:180,y:209,belly:0.35,r:{chest:4,torso:5,head:-3,armF_u:0,armF_l:-22,armB_u:0,armB_l:-22,legF_u:2,legF_l:0,legB_u:-12,legB_l:45}};
const contactB={x:180,y:218,belly:0,r:{chest:-6,torso:5,head:-3,armF_u:-28,armF_l:-15,armB_u:28,armB_l:-25,legF_u:24,legF_l:18,legB_u:-28,legB_l:6}};
const passB={x:180,y:209,belly:0.35,r:{chest:4,torso:5,head:-3,armF_u:0,armF_l:-22,armB_u:0,armB_l:-22,legF_u:-12,legF_l:45,legB_u:2,legB_l:0}};
const WALK={0:contactA,12:passA,24:contactB,36:passB,48:contactA};

const clone=o=>JSON.parse(JSON.stringify(o));
const CAM0={x:W/2,y:H/2,z:1};

// ---------- tampilan karakter (warna & bentuk badan) ----------
const LOOK0={skin:'#f2c9a0',hair:'#3a2a20',shirt:'#d9622b',stripe:'#f3a46f',pants:'#44557a',shoe:'#2a2a2e',size:1,fat:1};
const LOOK_PRESETS=[
  {name:'Budi'},
  {name:'Ani',skin:'#e8b48c',hair:'#1f1410',shirt:'#2b8a6e',stripe:'#7fd1b5',pants:'#7a3f6b',shoe:'#5a2a3a',size:0.95,fat:0.9},
  {name:'Kakek',skin:'#e0b08a',hair:'#d8d8d8',shirt:'#6b5b45',stripe:'#a39274',pants:'#3a3a3a',shoe:'#1f1f1f',size:0.92,fat:1.15},
  {name:'Anak',skin:'#f5d0ae',hair:'#4a2a18',shirt:'#e0b83a',stripe:'#fff1a8',pants:'#3f6fb5',shoe:'#c0392b',size:0.68,fat:1.05},
  {name:'Gendut',skin:'#d9a477',hair:'#2a1a10',shirt:'#3d6fd9',stripe:'#9bb8f3',pants:'#55606e',shoe:'#2a2a2e',size:1,fat:1.6},
  {name:'Jangkung',skin:'#c68c63',hair:'#101010',shirt:'#8a3fbf',stripe:'#c79be6',pants:'#2f4a3a',shoe:'#2a2a2e',size:1.2,fat:0.85},
];
function uid(p){return (p||'x')+Date.now().toString(36)+Math.random().toString(36).slice(2,6);}
function newChar(name,look,x,bf){
  const k=clone(DEFAULT);k.x=x??180;if(bf)k.bf=bf;
  return {id:uid('c'),name:name||'Karakter',look:Object.assign({},LOOK0,look||{}),parts:{},keys:{0:k}};
}

// ---------- state adegan ----------
let bg={src:null,img:null,x:W/2,y:H/2,s:1,screen:false}, camFollow=false, exporting=false;
let chars=[newChar('Budi')], active=0, objs=[], selObj=-1, camKeys={0:clone(CAM0)};
let keys=chars[0].keys, frame=0, playing=false, sel='armF_l', onion=true, ease=true, ikOn=true, showMesh=false;
function curChar(){return chars[active];}
function setActive(i){active=Math.max(0,Math.min(chars.length-1,i));keys=chars[active].keys;}
function setKeys(K){keys=K;chars[active].keys=K;}
// keyframe yang sedang diedit: kamera, objek, atau karakter aktif
function curKeys(){return sel==='cam'?camKeys:(sel==='obj'&&objs[selObj])?objs[selObj].keys:keys;}

const cv=document.getElementById('cv'),ctx=cv.getContext('2d');
let dpr=Math.min(window.devicePixelRatio||1,3);
cv.width=W*dpr;cv.height=H*dpr;

function rot(x,y,a){const c=Math.cos(a),s=Math.sin(a);return [x*c-y*s,x*s+y*c];}
function sortedKeys(K){return Object.keys(K||keys).map(Number).sort((a,b)=>a-b);}
function lerp(a,b,t){return a+(b-a)*t;}

// interpolasi umum: cari dua keyframe terdekat lalu campur
function interpK(K,f,mix){
  const ks=sortedKeys(K);if(!ks.length)return null;
  if(f<=ks[0])return clone(K[ks[0]]);
  const l=ks[ks.length-1];if(f>=l)return clone(K[l]);
  let i=0;while(ks[i+1]<=f)i++;
  const a=ks[i],b=ks[i+1];if(a===f)return clone(K[a]);
  let t=(f-a)/(b-a);if(ease)t=t*t*(3-2*t);
  return mix(K[a],K[b],t);
}
function mixPose(A,B,t){
  const r={};for(const p of PARTS)r[p.id]=lerp(A.r[p.id]||0,B.r[p.id]||0,t);
  return {x:lerp(A.x,B.x,t),y:lerp(A.y,B.y,t),r,belly:lerp(A.belly||0,B.belly||0,t),seat:lerp(A.seat||0,B.seat||0,t),sx:(A.seat?A.sx:B.sx),mouth:A.mouth,hv:headView(A),bf:A.bf||1};
}
function poseAtK(K,f){return interpK(K,f,mixPose)||clone(DEFAULT);}
function poseAt(f){return poseAtK(keys,f);}
function camAtF(f){return interpK(camKeys,f,(A,B,t)=>({x:lerp(A.x,B.x,t),y:lerp(A.y,B.y,t),z:lerp(A.z,B.z,t)}))||clone(CAM0);}
function objAt(o,f){return interpK(o.keys,f,(A,B,t)=>({x:lerp(A.x,B.x,t),y:lerp(A.y,B.y,t),r:lerp(A.r||0,B.r||0,t),s:lerp(A.s??1,B.s??1,t),a:lerp(A.a??1,B.a??1,t)}))||{x:W/2,y:H/2,r:0,s:1,a:1};}

function computeWorld(pose){
  const w={};
  function get(id){
    if(w[id]) return w[id];
    const p=P[id];let px,py,pa;
    if(!p.parent){px=pose.x;py=pose.y;pa=0;}
    else{const q=get(p.parent);const d=rot(p.ax,p.ay,q.a);px=q.x+d[0];py=q.y+d[1];pa=q.a;}
    const a=pa+(p.base+(pose.r[id]||0))*D2R;
    const e=rot(0,p.len,a);
    return w[id]={x:px,y:py,a,ex:px+e[0],ey:py+e[1]};
  }
  PARTS.forEach(p=>get(p.id));
  return w;
}
