# Animasi 2D Cut-out

Aplikasi web sederhana untuk membuat animasi karakter 2D: tulang + pivot, keyframe dan interpolasi, IK, mesh deformation, serta perintah teks yang otomatis menjadi gerakan (`jalan 3, duduk, bangun`).

Murni HTML + CSS + JavaScript, tanpa framework, tanpa build, dan tanpa database.

## Struktur

```
index.html        halaman utama
css/style.css     tampilan
js/karakter.js    data tulang (PARTS), pose, state, interpolasi keyframe
js/mesh.js        mesh badan bertekstur (skinning + morph perut)
js/ik.js          inverse kinematics tangan & kaki
js/render.js      menggambar karakter, kursi, onion skin, hit test
js/editor.js      interaksi: seret, slider, timeline, tombol
js/perintah.js    perintah teks -> klip gerakan otomatis
js/proyek.js      simpan/buka proyek, simpan otomatis, background, ekspor video
js/app.js         inisialisasi (dimuat paling akhir)
```

Urutan `<script>` di `index.html` penting, karena file berikutnya memakai variabel dari file sebelumnya.

## Pasang di server (aaPanel)

Pertama kali:

```bash
cd /www/wwwroot/animasi.kylnet.my.id
git clone https://github.com/Sunandar123/animasi-cutout.git .
```

Update berikutnya:

```bash
cd /www/wwwroot/animasi.kylnet.my.id && git pull
```

## Menambah perintah baru

1. Tambahkan gerakannya di objek `A` dalam `buildFromCommands()` (`js/perintah.js`).
2. Daftarkan kata kuncinya di array `VERBS`.
