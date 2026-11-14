// Inverse kinematics dua tulang (hukum cosinus) untuk tangan & kaki
// ---------- IK (two-bone, hukum cosinus) ----------
const IK={armF_l:['armF_u','armF_l',-1],armB_l:['armB_u','armB_l',-1],legF_l:['legF_u','legF_l',1],legB_l:['legB_u','legB_l',1]};
function unwrap(old,n){return Math.round((old+((((n-old)%360)+540)%360-180))*10)/10;}
function solveIK(k,limb,tx,ty){
  const [uid,lid,bend]=IK[limb],w=computeWorld(k),U=P[uid],L=P[lid],j=w[uid];
  const L1=U.len,L2=L.len,dx=tx-j.x,dy=ty-j.y;
  const d=Math.max(Math.abs(L1-L2)+0.01,Math.min(L1+L2-0.01,Math.hypot(dx,dy)));
  const aT=Math.atan2(-dx,dy);
  const alpha=Math.acos((L1*L1+d*d-L2*L2)/(2*L1*d));
  const beta=Math.acos((L1*L1+L2*L2-d*d)/(2*L1*L2));
  const a1=aT-bend*alpha,rel=bend*(Math.PI-beta);
  k.r[uid]=unwrap(k.r[uid]||0,(a1-w[U.parent].a)*R2D-U.base);
  k.r[lid]=unwrap(k.r[lid]||0,rel*R2D-L.base);
}
