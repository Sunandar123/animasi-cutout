// Adegan: tambah/atur karakter (tampilan, ukuran, gambar bagian tubuh sendiri) dan objek/properti
function idbPut(k,v){try{if(typeof idb!=='undefined')idb.put(k,v).catch(()=>{});}catch(e){}}
function idbDel(k){try{if(typeof idb!=='undefined')idb.del(k).catch(()=>{});}catch(e){}}
function loadImg(src){return new Promise((res,rej)=>{const im=new Image();im.onload=()=>res(im);im.onerror=rej;im.src=src;});}
function cleanName(s){return (s||'').replace(/[:,;]/g,'').trim().slice(0,20);}
function uniqueName(base){let n=base,i=2;const has=x=>chars.some(c=>c.name.toLowerCase()===x.toLowerCase());while(has(n))n=base+' '+(i++);return n;}

// ---------- karakter ----------
function addChar(){
  const p=LOOK_PRESETS[chars.length%LOOK_PRESETS.length],{name,...lk}=p;
  const last=poseAtK(chars[chars.length-1].keys,frame);
  const ch=newChar(uniqueName(name),lk,Math.round(last.x+90),chars.length%2?-1:1);
  chars.push(ch);setActive(chars.length-1);sel='look';
  buildChips();buildSliders();render();
  say('Karakter "'+ch.name+'" ditambahkan. Atur warna & ukurannya di panel 🎨 Tampilan.');
}
function dupChar(){
  const ch=curChar(),c=newChar(uniqueName(ch.name),clone(ch.look));
  c.keys=clone(ch.keys);Object.values(c.keys).forEach(k=>{k.x+=60;if(k.sx!==undefined)k.sx+=60;});
  Object.entries(ch.parts).forEach(([pid,cfg])=>{const {img,...rest}=cfg;c.parts[pid]=Object.assign(clone(rest),{img});idbPut('img:'+c.id+':'+pid,cfg.src);});
  chars.push(c);setActive(chars.length-1);sel='look';buildChips();buildSliders();render();
}
function delChar(){
  if(chars.length<=1)return;
  const ch=curChar();
  Object.keys(ch.parts).forEach(pid=>idbDel('img:'+ch.id+':'+pid));
  objs.forEach(o=>{if(o.attach&&o.attach.char===ch.id)o.attach=null;});
  chars.splice(active,1);setActive(Math.min(active,chars.length-1));
  if(typeof audioTracks!=='undefined')audioTracks.forEach(t=>{if(t.char===ch.id)t.char=chars[0].id;});
  if(typeof computeLip==='function'){computeLip();renderTracks();}
  sel='root';buildChips();buildSliders();render();say('Karakter "'+ch.name+'" dihapus.');
}
function moveChar(d){       // urutan tampil: yang paling kanan di daftar tampil paling depan
  const j=active+d;if(j<0||j>=chars.length)return;
  [chars[active],chars[j]]=[chars[j],chars[active]];setActive(j);buildChips();render();
}
function buildLookPanel(ch){
  const nm=document.createElement('input');nm.className='txt';nm.value=ch.name;nm.placeholder='Nama karakter';
  nm.oninput=()=>{const v=cleanName(nm.value);if(v){ch.name=v;buildChips();}};
  slEl.appendChild(nm);
  const pr=addRow();
  LOOK_PRESETS.forEach(p=>addBtn(pr,p.name,()=>{const {name,...lk}=p;ch.look=Object.assign({},LOOK0,lk);buildSliders();render();}));
  const grid=document.createElement('div');grid.className='colors';
  [['skin','Kulit'],['hair','Rambut'],['shirt','Baju'],['stripe','Garis baju'],['pants','Celana'],['shoe','Sepatu']].forEach(([k,l])=>{
    const lb=document.createElement('label');lb.innerHTML='<input type="color"><span></span>';
    lb.lastChild.textContent=l;const ip=lb.firstChild;ip.value=ch.look[k];ip.oninput=()=>{ch.look[k]=ip.value;render();};
    grid.appendChild(lb);
  });
  slEl.appendChild(grid);
  addSliders([
    {global:true,label:'Ukuran',min:50,max:150,unit:'%',get:()=>(ch.look.size||1)*100,set:(k,v)=>ch.look.size=v/100},
    {global:true,label:'Gemuk',min:60,max:180,unit:'%',get:()=>(ch.look.fat||1)*100,set:(k,v)=>ch.look.fat=v/100},
  ]);
  const row=addRow();
  addBtn(row,'⬅ Ke belakang',()=>moveChar(-1));addBtn(row,'Ke depan ➡',()=>moveChar(1));
  addBtn(row,'Duplikat',()=>dupChar());
  if(chars.length>1)addBtn(row,'Hapus karakter',()=>delChar());
  addNote('Nama dipakai di perintah, mis. "'+ch.name.toLowerCase()+': jalan 3". Untuk gambar sendiri: pilih bagian tubuhnya (chip di atas), lalu tekan 🖼.');
}

// ---------- gambar bagian tubuh sendiri ----------
let partTarget=null;
const fPart=document.getElementById('fPart');
async function setPartImage(ch,pid,src,cfg){
  const img=await loadImg(src);
  ch.parts[pid]=Object.assign({px:0.5,py:UP_PARTS[pid]?0.92:0.06,s:1,r:0,mouth:true},cfg||{},{src,img});
}
fPart.onchange=()=>{
  const f=fPart.files[0];fPart.value='';if(!f||!partTarget)return;
  const ch=curChar(),pid=partTarget;
  shrinkImage(f,async src=>{
    try{await setPartImage(ch,pid,src);idbPut('img:'+ch.id+':'+pid,src);buildChips();buildSliders();render();
      say('Gambar '+P[pid].name+' dipasang. Geser "Titik sendi" sampai pas dengan sendinya.');}
    catch(e){say('Gambar tidak bisa dibaca.');}
  },800);
};
function buildPartImagePanel(ch,pid){
  const cfg=ch.parts[pid],row=addRow();
  addBtn(row,cfg?'🖼 Ganti gambar':'🖼 Pakai gambar sendiri',()=>{partTarget=pid;fPart.click();});
  if(!cfg){addNote('Upload PNG transparan untuk '+P[pid].name+'. Gambar dalam posisi berdiri (lengan/kaki mengarah ke bawah, kepala & badan tegak).');return;}
  addBtn(row,'Hapus gambar',()=>{delete ch.parts[pid];idbDel('img:'+ch.id+':'+pid);buildChips();buildSliders();render();});
  addSliders([
    {global:true,label:'Sendi X',min:0,max:100,unit:'%',get:()=>cfg.px*100,set:(k,v)=>cfg.px=v/100},
    {global:true,label:'Sendi Y',min:0,max:100,unit:'%',get:()=>cfg.py*100,set:(k,v)=>cfg.py=v/100},
    {global:true,label:'Skala',min:20,max:300,unit:'%',get:()=>cfg.s*100,set:(k,v)=>cfg.s=v/100},
    {global:true,label:'Putar',min:-180,max:180,unit:'°',get:()=>cfg.r,set:(k,v)=>cfg.r=v},
  ]);
  if(pid==='head'){
    const lb=document.createElement('label');lb.className='chk';
    lb.innerHTML='<input type="checkbox"> Tampilkan mulut bawaan (untuk lip-sync)';
    const cb=lb.querySelector('input');cb.checked=cfg.mouth!==false;cb.onchange=()=>{cfg.mouth=cb.checked;render();};
    slEl.appendChild(lb);
  }
  addNote('Sendi X/Y = titik di gambar yang menempel ke sendi (mis. bahu untuk lengan atas, leher untuk kepala).');
}

// ---------- objek / properti ----------
let objReplace=null;
const fObj=document.getElementById('fObj');
fObj.onchange=()=>{
  const f=fObj.files[0];fObj.value='';if(!f)return;
  shrinkImage(f,async src=>{
    try{
      const img=await loadImg(src);
      if(objReplace){const o=objReplace;objReplace=null;o.src=src;o.img=img;o.base=100/Math.max(img.width,img.height);idbPut('img:'+o.id,src);}
      else{
        const c=camAt(frame),o={id:uid('o'),name:cleanName(f.name.replace(/\.[^.]+$/,''))||'Objek',src,img,base:100/Math.max(img.width,img.height),
          keys:{[frame]:{x:Math.round(c.x),y:Math.round(c.y),r:0,s:1,a:1}},attach:null,layer:'front'};
        objs.push(o);selObj=objs.length-1;sel='obj';idbPut('img:'+o.id,src);
        say('Objek "'+o.name+'" ditambahkan. Seret untuk memindah, atau tempel ke tangan karakter.');
      }
      buildChips();buildSliders();render();
    }catch(e){say('Gambar tidak bisa dibaca.');}
  },1000);
};
const ATTACH_PARTS=[['armF_l','tangan depan'],['armB_l','tangan belakang'],['head','kepala'],['chest','badan'],['legF_l','kaki depan']];
function buildObjPanel(o){
  const nm=document.createElement('input');nm.className='txt';nm.value=o.name;nm.placeholder='Nama objek';
  nm.oninput=()=>{const v=cleanName(nm.value);if(v){o.name=v;buildChips();}};
  slEl.appendChild(nm);
  const lim=o.attach?150:1200,ens=()=>ensureObjKey(o);
  addSliders([
    {label:o.attach?'Geser X':'Posisi X',min:o.attach?-lim:-600,max:lim,ensure:ens,get:()=>objAt(o,frame).x,set:(k,v)=>k.x=v},
    {label:o.attach?'Geser Y':'Posisi Y',min:o.attach?-lim:-400,max:o.attach?lim:800,ensure:ens,get:()=>objAt(o,frame).y,set:(k,v)=>k.y=v},
    {label:'Rotasi',min:-180,max:180,unit:'°',ensure:ens,get:()=>objAt(o,frame).r,set:(k,v)=>k.r=v},
    {label:'Skala',min:10,max:400,unit:'%',ensure:ens,get:()=>objAt(o,frame).s*100,set:(k,v)=>k.s=v/100},
    {label:'Tampak',min:0,max:100,unit:'%',ensure:ens,get:()=>objAt(o,frame).a*100,set:(k,v)=>k.a=v/100},
  ]);
  const at=document.createElement('label');at.className='sl';at.innerHTML='<span>Tempel ke</span><select class="txt"></select>';
  const sl=at.querySelector('select');
  sl.add(new Option('— tidak ditempel —',''));
  chars.forEach(c=>ATTACH_PARTS.forEach(([pid,l])=>sl.add(new Option(c.name+' · '+l,c.id+'|'+pid))));
  sl.value=o.attach?o.attach.char+'|'+o.attach.part:'';
  sl.onchange=()=>{
    const c=camAt(frame);
    if(sl.value){const [cid,part]=sl.value.split('|');o.attach={char:cid,part};Object.values(o.keys).forEach(k=>{k.x=0;k.y=0;});}
    else{o.attach=null;Object.values(o.keys).forEach(k=>{k.x=Math.round(c.x);k.y=Math.round(c.y);});}
    buildSliders();render();
  };
  slEl.appendChild(at);
  if(!o.attach){
    const row=addRow();
    const b1=addBtn(row,'Di belakang karakter',()=>{o.layer='back';buildSliders();render();});
    const b2=addBtn(row,'Di depan karakter',()=>{o.layer='front';buildSliders();render();});
    (o.layer==='back'?b1:b2).classList.add('on');
  }
  const row2=addRow();
  addBtn(row2,'Ganti gambar',()=>{objReplace=o;fObj.click();});
  addBtn(row2,'Hapus objek',()=>{objs.splice(objs.indexOf(o),1);idbDel('img:'+o.id);selObj=-1;sel='root';buildChips();buildSliders();render();});
  addNote(o.attach?'Objek ikut bergerak dengan bagian tubuh. Geser X/Y untuk mengatur posisi di tangan.':'Seret objek di kanvas untuk memindah. Posisi, rotasi, skala & tampak tersimpan per keyframe.');
}
