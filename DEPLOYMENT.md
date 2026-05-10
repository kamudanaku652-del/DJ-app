# WALKER PRO DJ - Deployment & Monetization Guide

## 1. Deploy ke Website (GitHub Pages vs Vercel)
### Jika menggunakan GitHub Pages (Default):
*   **Link**: `https://kamudanaku652-del.github.io/DJ-app/`
*   **Penting**: Pastikan di file `vite.config.ts` baris `base` berisi `'/DJ-app/'`.

### Jika menggunakan Vercel (Rekomendasi untuk Iklan):
*   Vercel lebih mudah disetujui AdSense/Adsterra.
*   **Cara Pindah**: 
    1. Ubah `base: '/DJ-app/'` menjadi `base: '/'` di file `vite.config.ts`.
    2. Import proyek di Vercel.
    3. Anda akan dapat link bersih seperti `walker-dj.vercel.app`.

## 2. Cara Menjadi App (PWA)
Ini adalah cara termudah agar aplikasi bisa "diinstall" di HP tanpa ribet build APK:
1. Buka link website Anda (Vercel/GitHub Pages) di Chrome (Android) atau Safari (iOS).
2. Di Chrome: Klik **titik tiga** di pojok kanan atas, lalu pilih **"Install App"** atau **"Tambahkan ke Layar Utama"**.
3. Di Safari: Klik tombol **Share** (kotak panah atas), lalu pilih **"Add to Home Screen"**.
4. Aplikasi akan muncul di menu HP Anda seperti aplikasi asli!

## 3. Cara Menjadi APK Murni (Android)
Jika Anda benar-benar butuh file `.apk`:
1. **Export ke ZIP** dari AI Studio (Menu Settings).
2. Install **Node.js** dan **Android Studio** di laptop.
3. Di terminal folder proyek, jalankan:
   ```bash
   npm install
   npm run build
   npx cap add android
   npx cap sync
   ```
4. Buka folder `android` menggunakan **Android Studio** dan klik **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

## 4. Monetisasi (Cara Dapat Uang)
Aplikasi ini sudah saya siapkan untuk monetisasi:
*   **Adsterra / AdSense Ready**: Sudah ada area iklan di bagian paling bawah. 
    *   **Caranya**: Daftar di Adsterra, ambil kode script iklan banner, lalu tempel di `src/App.tsx` pada bagian `Adsterra Ads Area`.
*   **Pro Version**: Tombol **"GO PRO"** di header membuka toko virtual. Jika diklik (simulasi bayar), iklan akan hilang otomatis. 
*   **Keuntungan Vercel**: Link Vercel (atau custom domain) jauh lebih profesional dan lebih mudah disetujui oleh jaringan iklan manapun.

---
Dibuat dengan ❤️ oleh AI Studio Assistant.
