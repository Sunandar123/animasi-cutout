// Mesh deformation: badan bertekstur di-skin ke tulang Pinggul & Dada + morph perut
// ---------- MESH DEFORMATION ----------
const TW=56,TH=144,MC=[-14,-4.67,4.67,14],MR=9,ML=72;
// tekstur baju dibuat per warna karakter (disimpan di cache)
const texCache={};
function shade(hex,f){const n=parseInt(hex.slice(1),16),c=[n>>16,(n>>8)&255,n&255].map(v=>Math.max(0,Math.min(255,Math.round(f<1?v*f:v+(255-v)*(f-1)))));return '#'+c.map(v=>v.toString(16).padStart(2,'0')).join('');}
function texFor(look){
  const key=look.shirt+look.stripe;if(texCache[key])return texCache[key];
  const tex=document.createElement('canvas');tex.width=TW;tex.height=TH;const t=tex.getContext('2d');
  t.fillStyle=look.shirt;t.fillRect(0,0,TW,TH);
  t.fillStyle=look.stripe;for(let y=10;y<124;y+=20)t.fillRect(0,y,TW,7);
  t.fillStyle=shade(look.shirt,0.8);t.fillRect(0,0,TW,7);
  t.fillStyle='#5a3a22';t.fillRect(0,126,TW,18);
  t.fillStyle='#e8c35a';t.fillRect(3,129,11,12);
  return texCache[key]=tex;
}
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
function meshVerts(pose,w,fat){
  fat=fat||1;
  const t=w.torso,c=w.chest,belly=pose.belly||0,V=[];
  for(let r=0;r<MR;r++){
    const y=r*ML/(MR-1);
    const wc=smooth((y-18)/30);                       // bobot tulang dada (skinning)
    const bump=Math.sin(Math.PI*Math.max(0,Math.min(1,(y-4)/40)));
    for(const x0 of MC){
      const xf=x0*fat,x=x0<0?xf*(1+belly*0.55*bump):xf*(1+belly*0.12*bump);   // morph perut + lebar badan
      const a=rot(x,y,t.a),b=rot(x,y-35,c.a);
      V.push({x:lerp(t.x+a[0],c.x+b[0],wc),y:lerp(t.y+a[1],c.y+b[1],wc),u:(x0+14)/28*TW,v:(ML-y)/ML*TH});
    }
  }
  return V;
}
function meshTris(){const T=[],n=MC.length;for(let r=0;r<MR-1;r++)for(let c=0;c<n-1;c++){const i=r*n+c;T.push([i,i+1,i+n+1],[i,i+n+1,i+n]);}return T;}
const TRIS=meshTris();
function drawTexTri(p0,p1,p2,tex){
  const cx=(p0.x+p1.x+p2.x)/3,cy=(p0.y+p1.y+p2.y)/3;
  ctx.save();ctx.beginPath();
  [p0,p1,p2].forEach((p,i)=>{const dx=p.x-cx,dy=p.y-cy,l=Math.hypot(dx,dy)||1,e=0.8;const X=p.x+dx/l*e,Y=p.y+dy/l*e;i?ctx.lineTo(X,Y):ctx.moveTo(X,Y);});
  ctx.closePath();ctx.clip();
  const du1=p1.u-p0.u,dv1=p1.v-p0.v,du2=p2.u-p0.u,dv2=p2.v-p0.v;
  const dx1=p1.x-p0.x,dy1=p1.y-p0.y,dx2=p2.x-p0.x,dy2=p2.y-p0.y;
  const det=du1*dv2-du2*dv1;if(!det){ctx.restore();return;}
  const a=(dx1*dv2-dx2*dv1)/det,c=(dx2*du1-dx1*du2)/det,b=(dy1*dv2-dy2*dv1)/det,d=(dy2*du1-dy1*du2)/det;
  ctx.transform(a,b,c,d,p0.x-a*p0.u-c*p0.v,p0.y-b*p0.u-d*p0.v);
  ctx.drawImage(tex,0,0);ctx.restore();
}
function drawBodyMesh(pose,w,ghost,ch){
  const V=meshVerts(pose,w,ch.look.fat),tex=texFor(ch.look);
  if(ghost){
    ctx.fillStyle=ghost;ctx.beginPath();
    TRIS.forEach(([a,b,c])=>{ctx.moveTo(V[a].x,V[a].y);ctx.lineTo(V[b].x,V[b].y);ctx.lineTo(V[c].x,V[c].y);ctx.closePath();});
    ctx.fill();return;
  }
  TRIS.forEach(([a,b,c])=>drawTexTri(V[a],V[b],V[c],tex));
  if(showMesh){
    ctx.save();ctx.lineWidth=0.8;ctx.strokeStyle='rgba(255,255,255,.85)';ctx.beginPath();
    TRIS.forEach(([a,b,c])=>{ctx.moveTo(V[a].x,V[a].y);ctx.lineTo(V[b].x,V[b].y);ctx.lineTo(V[c].x,V[c].y);ctx.closePath();});
    ctx.stroke();ctx.fillStyle='#2b6cd9';V.forEach(p=>{ctx.beginPath();ctx.arc(p.x,p.y,1.8,0,Math.PI*2);ctx.fill();});ctx.restore();
  }
}
