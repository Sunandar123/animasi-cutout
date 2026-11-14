// Perintah teks -> animasi otomatis (klip gerakan + state machine)
// ---------- PERINTAH TEKS -> ANIMASI OTOMATIS ----------
const RUN=[
 {y:213,r:{torso:15,head:-8,chest:-4,armF_u:45,armF_l:-95,armB_u:-50,armB_l:-95,legF_u:-48,legF_l:25,legB_u:35,legB_l:55}},
 {y:200,r:{torso:15,head:-8,chest:2,armF_u:0,armF_l:-95,armB_u:0,armB_l:-95,legF_u:10,legF_l:25,legB_u:-55,legB_l:100}},
 {y:213,r:{torso:15,head:-8,chest:-4,armF_u:-50,armF_l:-95,armB_u:45,armB_l:-95,legF_u:35,legF_l:55,legB_u:-48,legB_l:25}},
 {y:200,r:{torso:15,head:-8,chest:2,armF_u:0,armF_l:-95,armB_u:0,armB_l:-95,legF_u:-55,legF_l:100,legB_u:10,legB_l:25}},
];
function mk(x,y,r,o){const base={};PARTS.forEach(p=>base[p.id]=0);return Object.assign({x,y,r:Object.assign(base,r),belly:0,hv:'R',seat:0},o||{});}
function buildFromCommands(text){
  const B={t:0,keys:{},x:60,bf:1,state:'stand',log:[],unk:[]};
  const put=(dt,p)=>{B.t+=dt;p.bf=B.bf;B.keys[B.t]=p;};
  const last=()=>clone(B.keys[B.t]);
  const stand=o=>mk(B.x,208,clone(DEFAULT.r),o);
  const crouch=seat=>mk(B.x-19*B.bf,228,{torso:22,chest:8,head:-15,legF_u:-50,legF_l:70,legB_u:-45,legB_l:65,armF_u:-45,armF_l:-30,armB_u:-35,armB_l:-30},seat?{seat:1,sx:B.x-44*B.bf}:{});
  const sit=()=>mk(B.x-44*B.bf,252,{torso:4,chest:2,legF_u:-86,legF_l:86,legB_u:-82,legB_l:82,armF_u:-35,armF_l:-55,armB_u:-30,armB_l:-55},{seat:1,sx:B.x-44*B.bf});
  const lean=()=>mk(B.x-36*B.bf,248,{torso:30,chest:8,head:-15,legF_u:-75,legF_l:85,legB_u:-72,legB_l:82,armF_u:-50,armF_l:-30,armB_u:-40,armB_l:-30},{seat:1,sx:B.x-44*B.bf});
  const gsit=()=>mk(B.x-30*B.bf,293,{chest:5,legF_u:-90,legB_u:-86,armF_u:-20,armF_l:-20,armB_u:20,armB_l:-10});
  const lie=()=>mk(B.x-30*B.bf,291,{torso:-90,legB_u:4,armF_u:-5,armB_u:5});
  put(0,stand());
  const A={
    bangun(){
      if(B.state==='stand')return false;
      if(B.state==='lie'){put(14,gsit());B.state='gsit';}
      if(B.state==='sit'){put(8,lean());put(10,stand({sx:B.x-44*B.bf}));}
      if(B.state==='gsit'){put(10,crouch(false));put(10,stand());}
      B.state='stand';return true;
    },
    duduk(){
      if(B.state==='stand'){put(8,crouch(true));put(8,sit());B.state='sit';return true;}
      if(B.state==='lie'){put(14,gsit());B.state='gsit';return true;}
      return false;
    },
    tidur(){
      if(B.state==='lie')return false;
      if(B.state==='sit')A.bangun();
      if(B.state==='stand'){put(8,crouch(false));put(10,gsit());}
      put(14,lie());B.state='lie';return true;
    },
    jalan(n,run){
      A.bangun();
      const cyc=run?RUN:[contactA,passA,contactB,passB],per=run?4:6,dx=(run?28:20)*B.bf;
      let ph=0;put(per,mk(B.x,cyc[0].y,clone(cyc[0].r)));
      for(let i=0;i<n*2;i++){ph=(ph+1)%4;B.x+=dx;put(per,mk(B.x,cyc[ph].y,clone(cyc[ph].r),{belly:cyc[ph].belly||0}));}
      B.x+=dx*0.5;put(per+4,stand());return true;
    },
    lompat(n){
      A.bangun();
      for(let i=0;i<n;i++){
        put(6,crouch(false));
        put(8,mk(B.x+30*B.bf,150,{torso:6,legF_u:-45,legF_l:65,legB_u:-25,legB_l:55,armF_u:-160,armF_l:-10,armB_u:-150,armB_l:-10}));
        B.x+=60*B.bf;put(8,crouch(false));put(8,stand());
      }
      return true;
    },
    lambai(n){
      A.bangun();
      const arm=(u,l)=>stand({hv:'F',r:Object.assign(clone(DEFAULT.r),{armF_u:u,armF_l:l})});
      put(6,stand({hv:'F'}));put(6,arm(-150,-30));
      for(let i=0;i<n;i++){put(5,arm(-155,25));put(5,arm(-150,-45));}
      put(6,stand({hv:'F'}));put(3,stand());return true;
    },
    balik(){A.bangun();B.bf*=-1;put(3,stand());return true;},
    bicara(n){
      const seq=['A','S','E','O','S','A','X','E'],steps=Math.max(1,Math.round(n*FPS/3));
      for(let i=0;i<steps;i++)put(3,Object.assign(last(),{mouth:seq[i%seq.length]}));
      put(3,Object.assign(last(),{mouth:'X'}));return true;
    },
    diam(n){put(Math.max(1,Math.round(n*FPS)),last());return true;},
  };
  const VERBS=[
    [/^(ber)?jalan|^maju|^melangkah/,'jalan','langkah',4],
    [/^(ber)?lari/,'lari','langkah',6],
    [/^duduk/,'duduk'],
    [/^(bangun|berdiri)/,'bangun'],
    [/^(tidur|baring|berbaring|rebahan)/,'tidur'],
    [/^(lompat|loncat|melompat)/,'lompat','x',1],
    [/^(lambai|melambai|dadah|dada)/,'lambai','x',3],
    [/^(diam|tunggu|istirahat)/,'diam','dtk',1],
    [/^(balik|berbalik|putar|mundur)/,'balik'],
    [/^(bicara|berbicara|ngomong|bilang)/,'bicara','dtk',2],
  ];
  text.toLowerCase().split(/,|;|\n|\blalu\b|\bterus\b|\bkemudian\b|\bdan\b/).map(t=>t.trim()).filter(Boolean).forEach(tok=>{
    const v=VERBS.find(([re])=>re.test(tok));
    if(!v){B.unk.push(tok);return;}
    const num=tok.match(/\d+(\.\d+)?/);const n=num?Math.min(Number(num[0]),20):v[3];
    const name=v[1];const ok=name==='lari'?A.jalan(n,true):A[name](n);
    B.log.push(ok?(name+(v[2]?' '+n+(v[2]==='x'?'×':' '+v[2]):'')):'('+name+': sudah)');
  });
  put(12,last());
  return B;
}
const cmdIn=document.getElementById('cmdIn'),cmdMsg=document.getElementById('cmdMsg');
function runCommands(){
  const B=buildFromCommands(cmdIn.value);
  if(!B.log.length){cmdMsg.textContent=B.unk.length?'Perintah tidak dikenal: '+B.unk.join(', '):'Ketik perintah dulu.';return;}
  if(playing)stop();
  keys=B.keys;FRAMES=Math.max(12,B.t);frame=0;sel='root';buildChips();buildSliders();
  cmdMsg.textContent='✓ '+B.log.join(' → ')+' · '+(FRAMES/FPS).toFixed(1).replace('.',',')+' dtk'+(B.unk.length?' · tidak dikenal: '+B.unk.join(', '):'');
  play();
}
document.getElementById('cmdGo').onclick=runCommands;
cmdIn.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();runCommands();}});
(function(){const el=document.getElementById('cmdChips');
  ['jalan 3','lari 4','duduk','bangun','tidur','lompat','lambai','balik','bicara 2','diam 1'].forEach(c=>{
    const b=document.createElement('button');b.className='chip cmdc';b.textContent='+ '+c;
    b.onclick=()=>{cmdIn.value=(cmdIn.value.trim()?cmdIn.value.trim().replace(/,$/,'')+', ':'')+c;};
    el.appendChild(b);
  });
})();
