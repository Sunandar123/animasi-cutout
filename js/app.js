// Inisialisasi aplikasi (dimuat paling akhir)
buildChips();buildSliders();
if(!loadLocal())render();

// ---------- PWA: offline + tombol install ----------
if('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(()=>{});
let installEvt=null;
const bInstall=document.getElementById('bInstall');
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;bInstall.hidden=false;});
bInstall.onclick=async()=>{if(!installEvt)return;installEvt.prompt();await installEvt.userChoice;installEvt=null;bInstall.hidden=true;};
window.addEventListener('appinstalled',()=>{bInstall.hidden=true;});
