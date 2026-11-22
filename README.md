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
js/scene.js       karakter (tambah, tampilan, gambar sendiri) & objek
js/foto.js        karakter dari foto: AI MediaPipe (hapus background + deteksi sendi), mesh rig
js/editor.js      interaksi: seret, slider, timeline, tombol
js/perintah.js    perintah teks -> klip gerakan otomatis
js/suara.js       audio, rekam mikrofon, lip-sync otomatis
js/proyek.js      simpan/buka proyek, simpan otomatis, background, ekspor video
js/app.js         inisialisasi + daftar service worker (dimuat paling akhir)
manifest.json     data PWA (nama, ikon, warna)
sw.js             service worker: bisa dibuka offline
icons/            ikon aplikasi
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

## PWA & APK

- Buka situsnya di Chrome HP, tekan **📲 Install** (atau menu ⋮ → *Install app*).
- Untuk file APK: masukkan URL situs di pwabuilder.com → *Package for stores* → *Android*.
  Simpan baik-baik file *signing key* yang ikut diunduh; kunci itu wajib dipakai untuk update APK berikutnya.

## Versi file (anti-cache)

Setiap file CSS/JS di `index.html` diberi `?v=<versi>`. Setiap rilis, nomor versi itu diganti,
supaya browser & Cloudflare otomatis mengambil file baru, bukan file lama dari cache.
