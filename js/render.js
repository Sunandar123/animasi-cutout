// Menggambar karakter, kursi, onion skin, overlay seleksi, hit test
function drawPose(pose,alpha,ghost){
  const w=computeWorld(pose);
  const hv=headView(pose),hf=hv==='L'?-1:1;
  ctx.save();flipCtx(pose);ctx.globalAlpha=alpha;ctx.lineCap='round';
  for(const id of DRAW_ORDER){
    const p=P[id],j=w[id];
    const col=ghost||p.c;
    if(id==='torso'){drawBodyMesh(pose,w,ghost);continue;}
    if(id==='head'){
      const c=rot(0,24,j.a);
      ctx.fillStyle=ghost||SKIN;ctx.beginPath();ctx.arc(j.x+c[0],j.y+c[1],22,0,Math.PI*2);ctx.fill();
      if(!ghost){
        const at=(x,y)=>{const v=rot(x,y,j.a);return [j.x+v[0],j.y+v[1]];};
        const dot=(x,y,r,c)=>{const q=at(x,y);ctx.fillStyle=c;ctx.beginPath();ctx.arc(q[0],q[1],r,0,Math.PI*2);ctx.fill();};
        const seg=(x1,y1,x2,y2,wd,c)=>{const a=at(x1,y1),b=at(x2,y2);ctx.strokeStyle=c;ctx.lineWidth=wd;ctx.beginPath();ctx.moveTo(a[0],a[1]);ctx.lineTo(b[0],b[1]);ctx.stroke();};
        const HAIR='#3a2a20',ms=pose.mouth||'X';
        // bentuk mulut (drawing swap): X tutup, S kecil, A lebar, E/I pipih, O/U bulat
        const mouth=(lx,ly,sx)=>{
          const q=at(lx,ly);ctx.save();ctx.translate(q[0],q[1]);ctx.rotate(j.a);
          const M={S:[5,2.6],A:[7,7],E:[8.5,3],O:[4.6,5.6]}[ms];
          if(!M){ctx.strokeStyle='#8a4a3a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(-3.5*sx,0);ctx.lineTo(3.5*sx,0);ctx.stroke();}
          else{
            ctx.fillStyle='#5a1f1a';ctx.beginPath();ctx.ellipse(0,0,M[0]/2*sx,M[1]/2,0,0,Math.PI*2);ctx.fill();
            if(ms==='A'||ms==='O'){ctx.fillStyle='#d9736a';ctx.beginPath();ctx.ellipse(0,-M[1]*0.22,M[0]*0.28*sx,M[1]*0.18,0,0,Math.PI*2);ctx.fill();}
          }
          ctx.restore();
        };
        if(hv==='F'){
          dot(-22,25,4.5,SKIN);dot(22,25,4.5,SKIN);
          dot(-8,28,2.8,'#2a2a2e');dot(8,28,2.8,'#2a2a2e');
          mouth(0,14,1);
          seg(-15,40,15,40,12,HAIR);
        }else if(hv==='B'){
          dot(-22,25,4.5,SKIN);dot(22,25,4.5,SKIN);
          const c=at(0,26);ctx.fillStyle=HAIR;ctx.beginPath();ctx.arc(c[0],c[1],21,0,Math.PI*2);ctx.fill();
        }else{
          dot(-21*hf,22,5,SKIN);
          dot(-10*hf,28,2.8,'#2a2a2e');
          mouth(-8*hf,13,0.65);
          seg(-14*hf,40,16*hf,34,12,HAIR);
          dot(6*hf,24,4.5,SKIN);
        }
      }
      continue;
    }
    ctx.strokeStyle=col;ctx.lineWidth=p.w;
    ctx.beginPath();ctx.moveTo(j.x,j.y);ctx.lineTo(j.ex,j.ey);ctx.stroke();
    if(id==='legF_l'||id==='legB_l'){
      const f=rot(15,0,j.a);ctx.strokeStyle=ghost||SHOE;ctx.lineWidth=10;
      ctx.beginPath();ctx.moveTo(j.ex-f[0]*0.2,j.ey-f[1]*0.2);ctx.lineTo(j.ex+f[0],j.ey+f[1]);ctx.stroke();
    }
    if(id==='armF_l'||id==='armB_l'){
      ctx.fillStyle=ghost||SKIN;ctx.beginPath();ctx.arc(j.ex,j.ey,6.5,0,Math.PI*2);ctx.fill();
    }
  }
  ctx.restore();
  return w;
}

function headView(p){return p.hv||((p.hf||1)<0?'L':'R');}
function flipCtx(pose){if((pose.bf||1)<0){ctx.translate(2*pose.x,0);ctx.scale(-1,1);}}
function mirrorX(pose,px){return (pose.bf||1)<0?2*pose.x-px:px;}
function drawStool(p){
  const s=p.seat||0;if(s<0.02||p.sx===undefined)return;
  const cx=p.sx-4*(p.bf||1),top=262;
  ctx.save();ctx.globalAlpha=Math.min(1,s);ctx.fillStyle='#8a5a34';
  ctx.fillRect(cx-21,top,42,8);ctx.fillRect(cx-18,top+8,5,GROUND-top-8);ctx.fillRect(cx+13,top+8,5,GROUND-top-8);
  ctx.restore();
}
function css(v){return getComputedStyle(document.documentElement).getPropertyValue(v).trim();}

function camAt(pose){const c=camOf(pose);return camFollow?{x:pose.x,y:c.y,z:c.z}:c;}
function render(){
  const live=playing||exporting;
  const pose=poseAt(frame),cam=camAt(pose);
  const lm=typeof lipAt==='function'&&lipAt(frame);if(lm)pose.mouth=lm;
  ctx.setTransform(dpr,0,0,dpr,0,0);
  ctx.fillStyle=css('--panel')||'#fff';ctx.fillRect(0,0,W,H);
  ctx.save();
  ctx.translate(W/2,H/2);ctx.scale(cam.z,cam.z);ctx.translate(-cam.x,-cam.y);
  if(bg.img){const iw=bg.img.width*bg.s,ih=bg.img.height*bg.s;ctx.drawImage(bg.img,bg.x-iw/2,bg.y-ih/2,iw,ih);}
  else{ctx.fillStyle=css('--ground');ctx.fillRect(-3000,GROUND,7000,800);}
  drawStool(pose);
  if(onion&&!live){
    const ks=sortedKeys();
    const prev=ks.filter(k=>k<frame).pop(), next=ks.find(k=>k>frame);
    if(prev!==undefined) drawPose(keys[prev],0.18,'#2b6cd9');
    if(next!==undefined) drawPose(keys[next],0.18,'#2bb36c');
  }
  const w=drawPose(pose,1,null);
  if(!live&&sel!=='cam'&&sel!=='bg'){
    const acc=css('--accent');
    ctx.save();flipCtx(pose);ctx.strokeStyle=acc;ctx.fillStyle=acc;ctx.lineWidth=2;
    if(sel==='root'){
      ctx.beginPath();ctx.arc(pose.x,pose.y,13,0,Math.PI*2);ctx.stroke();
      ctx.beginPath();ctx.moveTo(pose.x-22,pose.y);ctx.lineTo(pose.x+22,pose.y);ctx.moveTo(pose.x,pose.y-22);ctx.lineTo(pose.x,pose.y+22);ctx.stroke();
    }else{
      const j=w[sel];
      ctx.setLineDash([4,3]);ctx.beginPath();
      if(sel==='head'){const c=rot(0,24,j.a);ctx.arc(j.x+c[0],j.y+c[1],25,0,Math.PI*2);}
      else{ctx.moveTo(j.x,j.y);ctx.lineTo(j.ex,j.ey);}
      ctx.stroke();ctx.setLineDash([]);
      ctx.beginPath();ctx.arc(j.x,j.y,5,0,Math.PI*2);ctx.fill();
      if(ikOn&&IK[sel]){ctx.setLineDash([3,3]);ctx.beginPath();ctx.arc(j.ex,j.ey,10,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
        ctx.beginPath();ctx.moveTo(j.ex-5,j.ey);ctx.lineTo(j.ex+5,j.ey);ctx.moveTo(j.ex,j.ey-5);ctx.lineTo(j.ex,j.ey+5);ctx.stroke();}
      ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(j.x,j.y,2,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
  updateUI(pose);
}

function distSeg(px,py,x1,y1,x2,y2){
  const dx=x2-x1,dy=y2-y1,l=dx*dx+dy*dy;
  let t=l?((px-x1)*dx+(py-y1)*dy)/l:0;t=Math.max(0,Math.min(1,t));
  return Math.hypot(px-(x1+t*dx),py-(y1+t*dy));
}
function hitTest(w,px,py){
  let best=null,bd=12;
  for(const id of HIT_ORDER){
    const p=P[id],j=w[id];let d;
    if(id==='head'){const c=rot(0,24,j.a);d=Math.hypot(px-j.x-c[0],py-j.y-c[1])-22;}
    else d=distSeg(px,py,j.x,j.y,j.ex,j.ey)-p.w/2;
    if(d<bd){bd=d;best=id;}
  }
  return best;
}
