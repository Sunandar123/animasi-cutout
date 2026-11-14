// Interaksi editor: seret di kanvas, chip bagian tubuh, slider, timeline, tombol
function ensureKey(){
  if(playing) stop();
  if(!keys[frame]) keys[frame]=poseAt(frame);
  return keys[frame];
}

function pt(e){const r=cv.getBoundingClientRect();return [(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height];}
let drag=null;
cv.addEventListener('pointerdown',e=>{
  if(playing) stop();
  let [px,py]=pt(e);
  if(sel!=='root'){
    const cur=poseAt(frame);px=mirrorX(cur,px);
    const hit=hitTest(computeWorld(cur),px,py);
    if(!hit) return;
    if(hit!==sel){sel=hit;buildChips();buildSliders();}
  }
  const k=ensureKey();
  cv.setPointerCapture(e.pointerId);
  if(sel==='root') drag={sx:px,sy:py,ox:k.x,oy:k.y};
  else if(ikOn&&IK[sel]){const j=computeWorld(k)[sel];drag={ik:true,ox:j.ex-px,oy:j.ey-py};}
  else{const j=computeWorld(k)[sel];drag={j,start:Math.atan2(py-j.y,px-j.x),deg:k.r[sel]||0};}
  render();
});
cv.addEventListener('pointermove',e=>{
  if(!drag) return;
  let [px,py]=pt(e);const k=keys[frame];
  if(sel!=='root') px=mirrorX(k,px);
  if(sel==='root'){
    k.x=Math.round(Math.max(20,Math.min(W-20,drag.ox+px-drag.sx)));
    k.y=Math.round(Math.max(90,Math.min(GROUND,drag.oy+py-drag.sy)));
  }else if(drag.ik){
    solveIK(k,sel,px+drag.ox,py+drag.oy);
  }else{
    let d=(Math.atan2(py-drag.j.y,px-drag.j.x)-drag.start)*R2D;
    d=((d%360)+540)%360-180;
    k.r[sel]=Math.round((drag.deg+d)*10)/10;
    drag.deg=k.r[sel];drag.start=Math.atan2(py-drag.j.y,px-drag.j.x);
  }
  render();
});
['pointerup','pointercancel'].forEach(ev=>cv.addEventListener(ev,()=>{drag=null;}));

const chipsEl=document.getElementById('chips');
function buildChips(){
  const list=[{id:'root',name:'Geser badan'},...['torso','chest','head','armF_u','armF_l','armB_u','armB_l','legF_u','legF_l','legB_u','legB_l'].map(id=>P[id])];
  chipsEl.innerHTML='';
  list.forEach(it=>{
    const b=document.createElement('button');b.className='chip'+(it.id===sel?' on':'');b.textContent=it.name;
    b.onclick=()=>{sel=it.id;buildChips();buildSliders();render();};
    chipsEl.appendChild(b);
  });
}

const slEl=document.getElementById('sliders');let sliderDefs=[];
function buildSliders(){
  slEl.innerHTML='';
  sliderDefs=sel==='root'
    ?[{label:'Posisi X',min:20,max:W-20,get:p=>p.x,set:(k,v)=>k.x=v},{label:'Posisi Y',min:90,max:GROUND,get:p=>p.y,set:(k,v)=>k.y=v}]
    :[{label:'Rotasi',min:-180,max:180,get:p=>p.r[sel]||0,set:(k,v)=>k.r[sel]=v,unit:'°'}];
  if(sel==='torso'||sel==='chest') sliderDefs.push({label:'Perut (morph)',min:-50,max:100,get:p=>(p.belly||0)*100,set:(k,v)=>k.belly=v/100,unit:'%'});
  sliderDefs.forEach(d=>{
    const row=document.createElement('label');row.className='sl';
    row.innerHTML='<span>'+d.label+'</span><input type="range" min="'+d.min+'" max="'+d.max+'" step="1"><span></span>';
    const inp=row.querySelector('input');d.inp=inp;d.out=row.lastChild;
    inp.addEventListener('input',()=>{const k=ensureKey();d.set(k,Number(inp.value));render();});
    slEl.appendChild(row);
  });
  const tg=sel==='root'?{prop:'bf',txt:v=>'Badan menghadap: '+(v>0?'Kanan ▶':'◀ Kiri')+'  (balik)'}:null;
  toggleDef=null;
  if(tg){
    const b=document.createElement('button');b.className='btn';b.style.justifySelf='start';
    b.onclick=()=>{const k=ensureKey();k[tg.prop]=-((k[tg.prop])||1);render();};
    slEl.appendChild(b);toggleDef={b,...tg};
  }
  headBtns=null;
  if(sel==='head'){
    const row=document.createElement('div');row.className='row';row.style.marginTop='0';
    headBtns=[['L','◀ Kiri'],['F','● Depan'],['B','○ Belakang'],['R','Kanan ▶']].map(([v,t])=>{
      const b=document.createElement('button');b.className='btn';b.textContent=t;b.dataset.v=v;
      b.onclick=()=>{const k=ensureKey();k.hv=v;delete k.hf;render();};
      row.appendChild(b);return b;
    });
    slEl.appendChild(row);
  }
}
let headBtns=null;
let toggleDef=null;

const track=document.getElementById('track');
function setFrame(f){frame=Math.max(0,Math.min(FRAMES,f));render();}
function trackFrame(e){const r=track.getBoundingClientRect();return Math.round((e.clientX-r.left)/r.width*FRAMES);}
let scrub=false;
track.addEventListener('pointerdown',e=>{if(playing)stop();scrub=true;track.setPointerCapture(e.pointerId);setFrame(trackFrame(e));});
track.addEventListener('pointermove',e=>{if(scrub)setFrame(trackFrame(e));});
['pointerup','pointercancel'].forEach(ev=>track.addEventListener(ev,()=>scrub=false));
const pct=f=>(2+f/FRAMES*96)+'%';

function updateUI(pose){
  const isKey=!!keys[frame];
  document.getElementById('stFrame').textContent='Frame '+frame+' / '+FRAMES+' · '+(frame/FPS).toFixed(2).replace('.',',')+' dtk';
  document.getElementById('stKey').innerHTML=isKey?'<b>◆ keyframe</b>':'interpolasi';
  let h='';
  const lab=[12,24,48,96,192,384,768].find(v=>FRAMES/v<=6)||768,minor=lab/4;
  for(let f=0;f<=FRAMES;f+=minor){const big=f%lab===0;h+='<div class="tick'+(big?' big':'')+'" style="left:'+pct(f)+'"></div>';if(big)h+='<div class="tlabel" style="left:'+pct(f)+'">'+String(+(f/FPS).toFixed(1)).replace('.',',')+'s</div>';}
  sortedKeys().forEach(f=>{h+='<div class="kd" style="left:'+pct(f)+'"></div>';});
  h+='<div class="ph" style="left:'+pct(frame)+'"></div>';
  track.innerHTML=h;
  sliderDefs.forEach(d=>{const v=Math.round(d.get(pose));if(document.activeElement!==d.inp)d.inp.value=v;d.out.textContent=v+(d.unit||'');});
  if(headBtns){const v=headView(pose);headBtns.forEach(b=>b.classList.toggle('on',b.dataset.v===v));}
  if(toggleDef) toggleDef.b.textContent=toggleDef.txt(pose[toggleDef.prop]||1);
  document.getElementById('bDel').disabled=!isKey;
  document.getElementById('bPlay').textContent=playing?'⏸ Pause':'▶ Play';
}

let lastTs=0,acc=0;
function tick(ts){
  if(!playing) return;
  if(!lastTs) lastTs=ts;
  acc+=ts-lastTs;lastTs=ts;
  const step=1000/FPS;
  while(acc>=step){acc-=step;frame=(frame+1)%FRAMES;}
  render();requestAnimationFrame(tick);
}
function play(){playing=true;lastTs=0;acc=0;requestAnimationFrame(tick);render();}
function stop(){playing=false;render();}

document.getElementById('bPlay').onclick=()=>playing?stop():play();
document.getElementById('bPrev').onclick=()=>{if(playing)stop();setFrame(frame-1);};
document.getElementById('bNext').onclick=()=>{if(playing)stop();setFrame(frame+1);};
document.getElementById('bKey').onclick=()=>{if(playing)stop();keys[frame]=poseAt(frame);render();};
document.getElementById('bDel').onclick=()=>{delete keys[frame];render();};
document.getElementById('bDemo').onclick=()=>{keys=clone(WALK);FRAMES=48;frame=0;play();};
document.getElementById('bReset').onclick=()=>{if(playing)stop();keys={0:clone(DEFAULT)};FRAMES=48;frame=0;render();};
document.getElementById('bOnion').onclick=e=>{onion=!onion;e.currentTarget.classList.toggle('on',onion);render();};
document.getElementById('bEase').onclick=e=>{ease=!ease;e.currentTarget.classList.toggle('on',ease);render();};
document.getElementById('bIK').onclick=e=>{ikOn=!ikOn;e.currentTarget.classList.toggle('on',ikOn);render();};
document.getElementById('bMesh').onclick=e=>{showMesh=!showMesh;e.currentTarget.classList.toggle('on',showMesh);render();};
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',render);
