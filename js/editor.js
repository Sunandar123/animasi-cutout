// Interaksi editor: seret di kanvas, chip karakter/objek/bagian tubuh, panel pengaturan, timeline, tombol
function ensureKey(){
  if(playing) stop();
  if(!keys[frame]) keys[frame]=poseAt(frame);
  return keys[frame];
}
function ensureCamKey(){if(playing)stop();if(!camKeys[frame])camKeys[frame]=camAtF(frame);return camKeys[frame];}
function ensureObjKey(o){if(playing)stop();if(!o.keys[frame])o.keys[frame]=objAt(o,frame);return o.keys[frame];}

function ptRaw(e){const r=cv.getBoundingClientRect();return [(e.clientX-r.left)*W/r.width,(e.clientY-r.top)*H/r.height];}
// koordinat layar -> koordinat dunia (memperhitungkan kamera)
function pt(e){const [lx,ly]=ptRaw(e),c=camAt(frame);return [(lx-W/2)/c.z+c.x,(ly-H/2)/c.z+c.y];}
// koordinat dunia -> koordinat lokal karakter (ukuran + arah hadap)
function ptChar(ch,pose,wx,wy){const q=toChar(ch,pose,wx,wy);return [mirrorX(pose,q[0]),q[1]];}

let drag=null;
cv.addEventListener('pointerdown',e=>{
  if(exporting) return;
  if(playing) stop();
  const [rx,ry]=ptRaw(e),[wx,wy]=pt(e);
  if(sel==='cam'||(sel==='bg'&&!bg.screen)){
    cv.setPointerCapture(e.pointerId);
    if(sel==='cam'){const c=ensureCamKey();drag={pan:'cam',rx,ry,ox:c.x,oy:c.y,z:c.z};}
    else drag={pan:'bg',rx,ry,ox:bg.x,oy:bg.y,z:camAt(frame).z};
    return;
  }
  if(sel==='root'){
    const k=ensureKey();cv.setPointerCapture(e.pointerId);
    drag={root:true,sx:rx,sy:ry,ox:k.x,oy:k.y,z:camAt(frame).z,s:curChar().look.size||1};   // x tidak ikut skala ukuran, y ikut
    return;
  }
  // objek (yang paling depan dulu)
  const oi=hitObj(wx,wy);
  if(oi>=0){
    if(sel!=='obj'||selObj!==oi){sel='obj';selObj=oi;buildChips();buildSliders();}
    const st=ensureObjKey(objs[oi]);cv.setPointerCapture(e.pointerId);
    drag={obj:oi,rx,ry,ox:st.x,oy:st.y,z:camAt(frame).z};render();return;
  }
  // karakter: yang aktif dulu, lalu yang lain dari paling depan
  const order=[active,...chars.map((_,i)=>i).reverse().filter(i=>i!==active)];
  for(const ci of order){
    const ch=chars[ci],pose=poseAtK(ch.keys,frame),[cx,cy]=ptChar(ch,pose,wx,wy);
    const hit=hitTest(computeWorld(pose),cx,cy,ch);
    if(!hit)continue;
    if(ci!==active||hit!==sel){setActive(ci);sel=hit;buildChips();buildSliders();}
    const k=ensureKey(),w=computeWorld(k),j=w[sel];
    cv.setPointerCapture(e.pointerId);
    if(ikOn&&IK[sel])drag={ik:true,ox:j.ex-cx,oy:j.ey-cy};
    else drag={j,start:Math.atan2(cy-j.y,cx-j.x),deg:k.r[sel]||0};
    render();return;
  }
});
cv.addEventListener('pointermove',e=>{
  if(!drag) return;
  const [rx,ry]=ptRaw(e);
  if(drag.pan){
    const dx=(rx-drag.rx)/drag.z,dy=(ry-drag.ry)/drag.z;
    if(drag.pan==='cam'){const c=camKeys[frame];c.x=Math.round(drag.ox-dx);c.y=Math.round(drag.oy-dy);}
    else{bg.x=Math.round(drag.ox+dx);bg.y=Math.round(drag.oy+dy);}
    render();return;
  }
  if(drag.obj!==undefined){
    const st=objs[drag.obj].keys[frame];
    st.x=Math.round(drag.ox+(rx-drag.rx)/drag.z);st.y=Math.round(drag.oy+(ry-drag.ry)/drag.z);
    render();return;
  }
  const k=keys[frame];
  if(drag.root){
    k.x=Math.round(Math.max(-1000,Math.min(2000,drag.ox+(rx-drag.sx)/drag.z)));
    k.y=Math.round(Math.max(-200,Math.min(GROUND,drag.oy+(ry-drag.sy)/(drag.z*drag.s))));
    render();return;
  }
  const [wx,wy]=pt(e),[cx,cy]=ptChar(curChar(),k,wx,wy);
  if(drag.ik){
    solveIK(k,sel,cx+drag.ox,cy+drag.oy);
  }else{
    let d=(Math.atan2(cy-drag.j.y,cx-drag.j.x)-drag.start)*R2D;
    d=((d%360)+540)%360-180;
    k.r[sel]=Math.round((drag.deg+d)*10)/10;
    drag.deg=k.r[sel];drag.start=Math.atan2(cy-drag.j.y,cx-drag.j.x);
  }
  render();
});
['pointerup','pointercancel'].forEach(ev=>cv.addEventListener(ev,()=>{drag=null;}));

// ---------- chip: karakter & objek, lalu bagian tubuh ----------
const sceneEl=document.getElementById('sceneChips'),chipsEl=document.getElementById('chips');
function chip(parent,text,on,onclick,cls){
  const b=document.createElement('button');b.className='chip'+(cls?' '+cls:'')+(on?' on':'');b.textContent=text;b.onclick=onclick;parent.appendChild(b);return b;
}
function buildChips(){
  sceneEl.innerHTML='';
  chars.forEach((c,i)=>chip(sceneEl,'👤 '+c.name,i===active&&sel!=='obj'&&sel!=='cam'&&sel!=='bg',()=>{setActive(i);if(sel==='obj'||sel==='cam'||sel==='bg')sel='root';buildChips();buildSliders();render();}));
  chip(sceneEl,'＋ Karakter',false,()=>addChar(),'add');
  objs.forEach((o,i)=>chip(sceneEl,'📦 '+o.name,sel==='obj'&&selObj===i,()=>{sel='obj';selObj=i;buildChips();buildSliders();render();}));
  chip(sceneEl,'＋ Objek',false,()=>document.getElementById('fObj').click(),'add');

  const list=[{id:'cam',name:'🎥 Kamera'},{id:'bg',name:'🖼 Background'},{id:'look',name:'🎨 Tampilan'},{id:'root',name:'Geser badan'},...['torso','chest','head','armF_u','armF_l','armB_u','armB_l','legF_u','legF_l','legB_u','legB_l'].map(id=>P[id])];
  chipsEl.innerHTML='';
  if(typeof renderTracks==='function'&&typeof audioList!=='undefined')renderTracks();
  list.forEach(it=>chip(chipsEl,it.name+(curChar().parts[it.id]?' 🖼':''),it.id===sel,()=>{sel=it.id;buildChips();buildSliders();render();}));
}

// ---------- panel pengaturan sesuai pilihan ----------
const slEl=document.getElementById('sliders');let sliderDefs=[];
let headBtns=null,mouthBtns=null,toggleDef=null;
function addRow(){const r=document.createElement('div');r.className='row';r.style.marginTop='0';slEl.appendChild(r);return r;}
function addBtn(row,text,onclick,cls){const b=document.createElement('button');b.className='btn'+(cls?' '+cls:'');b.textContent=text;b.onclick=onclick;row.appendChild(b);return b;}
function addNote(text){const p=document.createElement('p');p.className='sub';p.style.margin='0';p.textContent=text;slEl.appendChild(p);return p;}
function addSliders(defs){
  defs.forEach(d=>{
    const row=document.createElement('label');row.className='sl';
    row.innerHTML='<span></span><input type="range" step="1"><span></span>';
    row.firstChild.textContent=d.label;
    const inp=row.querySelector('input');inp.min=d.min;inp.max=d.max;d.inp=inp;d.out=row.lastChild;
    inp.addEventListener('input',()=>{const k=d.global?null:(d.ensure?d.ensure():ensureKey());d.set(k,Number(inp.value));render();});
    slEl.appendChild(row);sliderDefs.push(d);
  });
}
function buildSliders(){
  slEl.innerHTML='';sliderDefs=[];headBtns=null;mouthBtns=null;toggleDef=null;
  const ch=curChar();
  if(sel==='cam'){
    addSliders([
      {label:'Zoom',min:50,max:300,unit:'%',ensure:ensureCamKey,get:()=>camAtF(frame).z*100,set:(k,v)=>k.z=v/100},
      {label:'Kamera X',min:-400,max:1200,ensure:ensureCamKey,get:()=>camAtF(frame).x,set:(k,v)=>k.x=v},
      {label:'Kamera Y',min:-200,max:600,ensure:ensureCamKey,get:()=>camAtF(frame).y,set:(k,v)=>k.y=v},
    ]);
    addNote('Seret kanvas untuk menggeser kamera. Posisi & zoom kamera tersimpan per keyframe.');
    return;
  }
  if(sel==='bg'){
    if(!bg.screen)addSliders([
      {global:true,label:'Skala',min:5,max:400,unit:'%',get:()=>bg.s*100,set:(k,v)=>bg.s=v/100},
      {global:true,label:'Posisi X',min:-600,max:1200,get:()=>bg.x,set:(k,v)=>bg.x=v},
      {global:true,label:'Posisi Y',min:-400,max:800,get:()=>bg.y,set:(k,v)=>bg.y=v},
    ]);
    const lb=document.createElement('label');lb.className='chk';
    lb.innerHTML='<input type="checkbox"> Selalu penuh layar (tidak ikut gerak kamera)';
    const cb=lb.querySelector('input');cb.checked=!!bg.screen;cb.onchange=()=>{bg.screen=cb.checked;buildSliders();render();};
    slEl.appendChild(lb);
    const row=addRow();
    addBtn(row,bg.img?'Ganti gambar':'Pilih gambar',()=>document.getElementById('fBg').click());
    if(bg.img)addBtn(row,'Hapus background',()=>clearBg());
    return;
  }
  if(sel==='obj'&&objs[selObj]){buildObjPanel(objs[selObj]);return;}
  if(sel==='look'){buildLookPanel(ch);return;}
  if(sel==='root'){
    addSliders([{label:'Posisi X',min:-400,max:1200,get:p=>p.x,set:(k,v)=>k.x=v},{label:'Posisi Y',min:-200,max:GROUND,get:p=>p.y,set:(k,v)=>k.y=v}]);
    const b=addBtn(addRow(),'',()=>{const k=ensureKey();k.bf=-(k.bf||1);render();});
    toggleDef={b,prop:'bf',txt:v=>'Badan menghadap: '+(v>0?'Kanan ▶':'◀ Kiri')+'  (balik)'};
    return;
  }
  // bagian tubuh
  addSliders([{label:'Rotasi',min:-180,max:180,unit:'°',get:p=>p.r[sel]||0,set:(k,v)=>k.r[sel]=v}]);
  if(sel==='torso'||sel==='chest')addSliders([{label:'Perut (morph)',min:-50,max:100,unit:'%',get:p=>(p.belly||0)*100,set:(k,v)=>k.belly=v/100}]);
  if(sel==='head'){
    const row=addRow();
    headBtns=[['L','◀ Kiri'],['F','● Depan'],['B','○ Belakang'],['R','Kanan ▶']].map(([v,t])=>{
      const b=addBtn(row,t,()=>{const k=ensureKey();k.hv=v;delete k.hf;render();});b.dataset.v=v;return b;});
    const row2=addRow();
    mouthBtns=[['X','Mulut tutup'],['S','Kecil'],['A','A'],['E','E/I'],['O','O/U']].map(([v,t])=>{
      const b=addBtn(row2,t,()=>{const k=ensureKey();k.mouth=v;render();});b.dataset.v=v;return b;});
  }
  buildPartImagePanel(ch,sel);
}

// ---------- timeline ----------
const track=document.getElementById('track');
function setFrame(f){frame=Math.max(0,Math.min(FRAMES,f));render();}
function trackFrame(e){const r=track.getBoundingClientRect();return Math.round((e.clientX-r.left)/r.width*FRAMES);}
let scrub=false;
track.addEventListener('pointerdown',e=>{if(exporting)return;if(playing)stop();scrub=true;track.setPointerCapture(e.pointerId);setFrame(trackFrame(e));});
track.addEventListener('pointermove',e=>{if(scrub)setFrame(trackFrame(e));});
['pointerup','pointercancel'].forEach(ev=>track.addEventListener(ev,()=>scrub=false));
const pct=f=>(2+f/FRAMES*96)+'%';

function keyOwner(){return sel==='cam'?'kamera':(sel==='obj'&&objs[selObj])?objs[selObj].name:curChar().name;}
function updateUI(pose){
  const K=curKeys(),isKey=!!K[frame];
  document.getElementById('stFrame').textContent='Frame '+frame+' / '+FRAMES+' · '+(frame/FPS).toFixed(2).replace('.',',')+' dtk';
  document.getElementById('stKey').innerHTML=(isKey?'<b>◆ keyframe</b>':'interpolasi')+' · '+keyOwner();
  let h='';
  const lab=[12,24,48,96,192,384,768].find(v=>FRAMES/v<=6)||768,minor=lab/4;
  for(let f=0;f<=FRAMES;f+=minor){const big=f%lab===0;h+='<div class="tick'+(big?' big':'')+'" style="left:'+pct(f)+'"></div>';if(big)h+='<div class="tlabel" style="left:'+pct(f)+'">'+String(+(f/FPS).toFixed(1)).replace('.',',')+'s</div>';}
  sortedKeys(K).forEach(f=>{h+='<div class="kd" style="left:'+pct(f)+'"></div>';});
  if(typeof audioBarsHTML==='function')h+=audioBarsHTML();
  h+='<div class="ph" style="left:'+pct(frame)+'"></div>';
  track.innerHTML=h;
  sliderDefs.forEach(d=>{const v=Math.round(d.get(pose));if(document.activeElement!==d.inp)d.inp.value=v;d.out.textContent=v+(d.unit||'');});
  if(mouthBtns){const v=pose.mouth||'X';mouthBtns.forEach(b=>b.classList.toggle('on',b.dataset.v===v));}
  if(headBtns){const v=headView(pose);headBtns.forEach(b=>b.classList.toggle('on',b.dataset.v===v));}
  if(toggleDef) toggleDef.b.textContent=toggleDef.txt(pose[toggleDef.prop]||1);
  document.getElementById('bDel').disabled=!isKey;
  document.getElementById('bPlay').textContent=playing?'⏸ Pause':'▶ Play';
}

// Pemutaran memakai jam nyata supaya tetap sinkron dengan suara
let playStart=0,playFrame0=0;
function tick(){
  if(!playing) return;
  const f=playFrame0+Math.floor((performance.now()-playStart)*FPS/1000);
  if(f>=FRAMES){frame=0;playFrame0=0;playStart=performance.now();if(typeof audioStart==='function')audioStart(0);}
  else frame=f;
  render();requestAnimationFrame(tick);
}
function play(){
  if(exporting)return;
  if(frame>=FRAMES)frame=0;
  playing=true;playFrame0=frame;playStart=performance.now();
  if(typeof audioStart==='function')audioStart(frame);
  requestAnimationFrame(tick);render();
}
function stop(){playing=false;if(typeof audioStop==='function')audioStop();render();}

document.getElementById('bPlay').onclick=()=>playing?stop():play();
document.getElementById('bPrev').onclick=()=>{if(playing)stop();setFrame(frame-1);};
document.getElementById('bNext').onclick=()=>{if(playing)stop();setFrame(frame+1);};
document.getElementById('bKey').onclick=()=>{
  if(playing)stop();
  if(sel==='cam')camKeys[frame]=camAtF(frame);
  else if(sel==='obj'&&objs[selObj])objs[selObj].keys[frame]=objAt(objs[selObj],frame);
  else keys[frame]=poseAt(frame);
  render();
};
document.getElementById('bDel').onclick=()=>{
  const K=curKeys();
  if(Object.keys(K).length<=1){render();return;}   // sisakan minimal satu keyframe
  delete K[frame];render();
};
document.getElementById('bDemo').onclick=()=>{const K=clone(WALK);const x=poseAt(0).x;Object.values(K).forEach(k=>k.x=x);setKeys(K);FRAMES=Math.max(FRAMES,48);frame=0;play();};
document.getElementById('bReset').onclick=()=>{if(playing)stop();const k=clone(DEFAULT);k.x=poseAt(0).x;k.bf=poseAt(0).bf||1;setKeys({0:k});frame=0;render();};
document.getElementById('bOnion').onclick=e=>{onion=!onion;e.currentTarget.classList.toggle('on',onion);render();};
document.getElementById('bEase').onclick=e=>{ease=!ease;e.currentTarget.classList.toggle('on',ease);render();};
document.getElementById('bIK').onclick=e=>{ikOn=!ikOn;e.currentTarget.classList.toggle('on',ikOn);render();};
document.getElementById('bMesh').onclick=e=>{showMesh=!showMesh;e.currentTarget.classList.toggle('on',showMesh);render();};
matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change',render);
