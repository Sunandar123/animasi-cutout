// Menggambar adegan: background, objek, semua karakter (warna, ukuran, gambar sendiri), overlay seleksi, hit test
const UP_PARTS={torso:1,chest:1,head:1};       // bagian yang tegak ke atas (gambarnya diputar 180°)
const PART_TARGET={head:50,chest:45,torso:40};  // tinggi bawaan gambar bagian tubuh (px)
function thick(ch){return 1+((ch.look.fat||1)-1)*0.7;}
function partColor(ch,id){
  const L=ch.look;
  if(id.startsWith('armF'))return shade(L.shirt,1.15);
  if(id.startsWith('armB'))return shade(L.shirt,0.78);
  if(id.startsWith('legF'))return L.pants;
  if(id.startsWith('legB'))return shade(L.pants,0.7);
  return L.shirt;
}

// gambar bagian tubuh buatan sendiri, ditempel di tulangnya
function drawPartImage(id,j,img,cfg,hf){
  const tgt=PART_TARGET[id]||((P[id].len||40)+8),k=tgt/img.height*(cfg.s||1);
  const w=img.width*k,h=img.height*k;
  ctx.save();ctx.translate(j.x,j.y);ctx.rotate(j.a+(UP_PARTS[id]?Math.PI:0)+(cfg.r||0)*D2R);
  if(id==='head'&&hf<0)ctx.scale(-1,1);
  ctx.drawImage(img,-cfg.px*w,-cfg.py*h,w,h);
  ctx.restore();
}

function drawMouth(j,lx,ly,sx,ms){
  const q=rot(lx,ly,j.a);ctx.save();ctx.translate(j.x+q[0],j.y+q[1]);ctx.rotate(j.a);
  const M={S:[5,2.6],A:[7,7],E:[8.5,3],O:[4.6,5.6]}[ms];
  if(!M){ctx.strokeStyle='#8a4a3a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-3.5*sx,0);ctx.lineTo(3.5*sx,0);ctx.stroke();}
  else{
    ctx.fillStyle='#5a1f1a';ctx.beginPath();ctx.ellipse(0,0,M[0]/2*sx,M[1]/2,0,0,Math.PI*2);ctx.fill();
    if(ms==='A'||ms==='O'){ctx.fillStyle='#d9736a';ctx.beginPath();ctx.ellipse(0,-M[1]*0.22,M[0]*0.28*sx,M[1]*0.18,0,0,Math.PI*2);ctx.fill();}
  }
  ctx.restore();
}

function drawPose(pose,alpha,ghost,ch){
  ch=ch||curChar();
  if(ch.photo&&ch.photo.bind)return drawPhotoChar(pose,ch,alpha,ghost);
  const w=computeWorld(pose),L=ch.look,th=thick(ch),pi=ch.parts||{};
  const hv=headView(pose),hf=hv==='L'?-1:1,ms=pose.mouth||'X';
  const has=id=>!ghost&&pi[id]&&pi[id].img;
  ctx.save();flipCtx(pose);ctx.globalAlpha*=alpha;ctx.lineCap='round';
  for(const id of DRAW_ORDER){
    const p=P[id],j=w[id];
    if(id==='torso'){
      if(has('torso')||has('chest')){
        if(has('torso'))drawPartImage('torso',w.torso,pi.torso.img,pi.torso,hf);
        if(has('chest'))drawPartImage('chest',w.chest,pi.chest.img,pi.chest,hf);
      }else drawBodyMesh(pose,w,ghost,ch);
      continue;
    }
    if(id==='head'){
      if(has('head')){
        drawPartImage('head',j,pi.head.img,pi.head,hf);
        if(pi.head.mouth!==false&&hv!=='B')drawMouth(j,hv==='F'?0:-8*hf,13,hv==='F'?1:0.65,ms);
        continue;
      }
      const c=rot(0,24,j.a);
      ctx.fillStyle=ghost||L.skin;ctx.beginPath();ctx.arc(j.x+c[0],j.y+c[1],22,0,Math.PI*2);ctx.fill();
      if(!ghost){
        const at=(x,y)=>{const v=rot(x,y,j.a);return [j.x+v[0],j.y+v[1]];};
        const dot=(x,y,r,c)=>{const q=at(x,y);ctx.fillStyle=c;ctx.beginPath();ctx.arc(q[0],q[1],r,0,Math.PI*2);ctx.fill();};
        const seg=(x1,y1,x2,y2,wd,c)=>{const a=at(x1,y1),b=at(x2,y2);ctx.strokeStyle=c;ctx.lineWidth=wd;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();};
        if(hv==='F'){
          dot(-22,25,4.5,L.skin);dot(22,25,4.5,L.skin);
          dot(-8,28,2.8,'#2a2a2e');dot(8,28,2.8,'#2a2a2e');
          drawMouth(j,0,14,1,ms);
          seg(-15,40,15,40,12,L.hair);
        }else if(hv==='B'){
          dot(-22,25,4.5,L.skin);dot(22,25,4.5,L.skin);
          const c2=at(0,26);ctx.fillStyle=L.hair;ctx.beginPath();ctx.arc(c2[0],c2[1],21,0,Math.PI*2);ctx.fill();
        }else{
          dot(-21*hf,22,5,L.skin);
          dot(-10*hf,28,2.8,'#2a2a2e');
          drawMouth(j,-8*hf,13,0.65,ms);
          seg(-14*hf,40,16*hf,34,12,L.hair);
          dot(6*hf,24,4.5,L.skin);
        }
      }
      continue;
    }
    if(has(id)){drawPartImage(id,j,pi[id].img,pi[id],hf);continue;}
    ctx.strokeStyle=ghost||partColor(ch,id);ctx.lineWidth=p.w*th;
    ctx.beginPath();ctx.moveTo(j.x,j.y);ctx.lineTo(j.ex,j.ey);ctx.stroke();
    if(id==='legF_l'||id==='legB_l'){
      const f=rot(15,0,j.a);ctx.strokeStyle=ghost||L.shoe;ctx.lineWidth=10*th;
      ctx.beginPath();ctx.moveTo(j.ex-f[0]*0.2,j.ey-f[1]*0.2);ctx.lineTo(j.ex+f[0],j.ey+f[1]);ctx.stroke();
    }
    if(id==='armF_l'||id==='armB_l'){
      ctx.fillStyle=ghost||L.skin;ctx.beginPath();ctx.arc(j.ex,j.ey,6.5*th,0,Math.PI*2);ctx.fill();
    }
  }
  ctx.restore();
  return w;
}

function headView(p){return p.hv||((p.hf||1)<0?'L':'R');}
function flipCtx(pose){if((pose.bf||1)<0){ctx.translate(2*pose.x,0);ctx.scale(-1,1);}}
function mirrorX(pose,px){return (pose.bf||1)<0?2*pose.x-px:px;}
// ukuran karakter: diskalakan dari titik tanah di bawah pinggul
function charXf(ch,pose){const s=ch.look.size||1;ctx.translate(pose.x,GROUND);ctx.scale(s,s);ctx.translate(-pose.x,-GROUND);}
function toChar(ch,pose,px,py){const s=ch.look.size||1;return [pose.x+(px-pose.x)/s,GROUND+(py-GROUND)/s];}
function drawStool(p){
  const s=p.seat||0;if(s<0.02||p.sx===undefined)return;
  const cx=p.sx-4*(p.bf||1),top=262;
  ctx.save();ctx.globalAlpha=Math.min(1,s);ctx.fillStyle='#8a5a34';
  ctx.fillRect(cx-21,top,42,8);ctx.fillRect(cx-18,top+8,5,GROUND-top-8);ctx.fillRect(cx+13,top+8,5,GROUND-top-8);
  ctx.restore();
}
function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim();}

// ---------- objek / properti ----------
function objSize(o){const k=(o.base||1);return [o.img.width*k,o.img.height*k];}
function drawObj(o,st){
  if(!o.img)return;
  const [w,h]=objSize(o);
  ctx.save();ctx.translate(st.x,st.y);ctx.rotate((st.r||0)*D2R);ctx.scale(st.s??1,st.s??1);ctx.globalAlpha*=(st.a??1);
  ctx.drawImage(o.img,-w/2,-h/2,w,h);ctx.restore();
}
function attachPoint(w,part){
  const j=w[part];
  if(part==='head'){if(j.cx!==undefined)return {x:j.cx,y:j.cy,a:j.a+Math.PI};const c=rot(0,24,j.a);return {x:j.x+c[0],y:j.y+c[1],a:j.a+Math.PI};}
  if(part==='chest')return {x:(j.x+j.ex)/2,y:(j.y+j.ey)/2,a:j.a+Math.PI};
  return {x:j.ex,y:j.ey,a:j.a};
}
function hitObj(wx,wy){
  for(const layer of ['front','back']){
    for(let i=objs.length-1;i>=0;i--){
      const o=objs[i];if(o.attach||(o.layer||'front')!==layer||!o.img)continue;
      const st=objAt(o,frame),[w,h]=objSize(o),s=st.s??1;
      const q=rot(wx-st.x,wy-st.y,-(st.r||0)*D2R);
      if(Math.abs(q[0])<=w*s/2+6&&Math.abs(q[1])<=h*s/2+6)return i;
    }
  }
  return -1;
}

function camAt(f){
  const c=camAtF(f);
  if(camFollow){const p=poseAtK(keys,f);return {x:p.x,y:c.y,z:c.z};}
  return c;
}
function render(){
  const live=playing||exporting,cam=camAt(frame);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle=css('--panel')||'#fff';ctx.fillRect(0,0,W,H);
  if(bg.img&&bg.screen){       // background menempel layar, selalu penuh
    const s=Math.max(W/bg.img.width,H/bg.img.height),iw=bg.img.width*s,ih=bg.img.height*s;
    ctx.drawImage(bg.img,(W-iw)/2,(H-ih)/2,iw,ih);
  }
  ctx.save();
  ctx.translate(W/2,H/2);ctx.scale(cam.z,cam.z);ctx.translate(-cam.x,-cam.y);
  if(bg.img&&!bg.screen){const iw=bg.img.width*bg.s,ih=bg.img.height*bg.s;ctx.drawImage(bg.img,bg.x-iw/2,bg.y-ih/2,iw,ih);}
  else if(!bg.img){ctx.fillStyle=css('--ground');ctx.fillRect(-3000,GROUND,7000,800);}
  objs.forEach(o=>{if(!o.attach&&o.layer==='back')drawObj(o,objAt(o,frame));});

  let activePose=null,activeW=null;
  chars.forEach((ch,i)=>{
    const pose=poseAtK(ch.keys,frame);
    const lm=typeof lipAt==='function'&&lipAt(ch.id,frame);if(lm)pose.mouth=lm;
    ctx.save();charXf(ch,pose);
    drawStool(pose);
    const isAct=i===active,partSel=isAct&&!live&&sel!=='cam'&&sel!=='bg'&&sel!=='obj'&&sel!=='look';
    if(isAct&&onion&&!live&&partSel){
      const ks=sortedKeys(ch.keys),prev=ks.filter(k=>k<frame).pop(),next=ks.find(k=>k>frame);
      if(prev!==undefined)drawPose(ch.keys[prev],0.18,'#2b6cd9',ch);
      if(next!==undefined)drawPose(ch.keys[next],0.18,'#2bb36c',ch);
    }
    if(!isAct&&!live&&chars.length>1&&sel!=='cam')ctx.globalAlpha=0.85;
    const w=drawPose(pose,1,null,ch);ctx.globalAlpha=1;
    // objek yang ditempel ke karakter ini (mis. dipegang di tangan)
    objs.forEach(o=>{
      if(!o.attach||o.attach.char!==ch.id||!w[o.attach.part])return;
      const ap=attachPoint(w,o.attach.part);
      ctx.save();flipCtx(pose);ctx.translate(ap.x,ap.y);ctx.rotate(ap.a);drawObj(o,objAt(o,frame));ctx.restore();
    });
    if(isAct){activePose=pose;activeW=w;}
    if(partSel)drawSelection(pose,w);
    ctx.restore();
  });
  objs.forEach(o=>{if(!o.attach&&(o.layer||'front')==='front')drawObj(o,objAt(o,frame));});
  if(!live&&sel==='obj'&&objs[selObj]&&!objs[selObj].attach&&objs[selObj].img){
    const o=objs[selObj],st=objAt(o,frame),[w,h]=objSize(o),s=st.s??1;
    ctx.save();ctx.translate(st.x,st.y);ctx.rotate((st.r||0)*D2R);ctx.strokeStyle=css('--accent');ctx.lineWidth=2/cam.z;ctx.setLineDash([5,4]);
    ctx.strokeRect(-w*s/2-3,-h*s/2-3,w*s+6,h*s+6);ctx.restore();
  }
  ctx.restore();
  updateUI(activePose||poseAt(frame));
}
function drawSelection(pose,w){
  const acc=css('--accent');
  ctx.save();flipCtx(pose);ctx.strokeStyle=acc;ctx.fillStyle=acc;ctx.lineWidth=2;
  if(sel==='root'){
    ctx.beginPath();ctx.arc(pose.x,pose.y,13,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.moveTo(pose.x-22,pose.y);ctx.lineTo(pose.x+22,pose.y);ctx.moveTo(pose.x,pose.y-22);ctx.lineTo(pose.x,pose.y+22);ctx.stroke();
  }else if(w[sel]){
    const j=w[sel];
    ctx.setLineDash([4,3]);ctx.beginPath();
    if(sel==='head'){if(j.cx!==undefined)ctx.arc(j.cx,j.cy,j.rad+3,0,Math.PI*2);else{const c=rot(0,24,j.a);ctx.arc(j.x+c[0],j.y+c[1],25,0,Math.PI*2);}}
    else{ctx.moveTo(j.x,j.y);ctx.lineTo(j.ex,j.ey);}
    ctx.stroke();ctx.setLineDash([]);
    ctx.beginPath();ctx.arc(j.x,j.y,5,0,Math.PI*2);ctx.fill();
    if(ikOn&&IK[sel]){ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(j.ex,j.ey,10,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
      ctx.beginPath();ctx.moveTo(j.ex-5,j.ey);ctx.lineTo(j.ex+5,j.ey);ctx.moveTo(j.ex,j.ey-5);ctx.lineTo(j.ex,j.ey+5);ctx.stroke();}
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(j.x,j.y,2,0,Math.PI*2);ctx.fill();
  }
  ctx.restore();
}

function distSeg(px,py,x1,y1,x2,y2){
  const dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy;
  let t=l?((px-x1)*dx+(py-y1)*dy)/l:0;t=Math.max(0,Math.min(1,t));
  return Math.hypot(px-(x1+t*dx),py-(y1+t*dy));
}
function hitTest(w,px,py,ch){
  const th=ch?thick(ch):1;let best=null,bd=12;
  for(const id of HIT_ORDER){
    const p=P[id],j=w[id];let d;
    if(id==='head'){if(j.cx!==undefined)d=Math.hypot(px-j.cx,py-j.cy)-j.rad;else{const c=rot(0,24,j.a);d=Math.hypot(px-j.x-c[0],py-j.y-c[1])-22;}}
    else d=distSeg(px,py,j.x,j.y,j.ex,j.ey)-p.w*th/2;
    if(d<bd){bd=d;best=id;}
  }
  return best;
}
