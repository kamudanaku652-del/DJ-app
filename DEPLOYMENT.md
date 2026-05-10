# WALKER PRO DJ - Deployment & Monetization Guide

## 1. Deploy ke Website (GitHub Pages)
Setiap kali Anda klik **Deploy/Sync**, aplikasi akan terupdate otomatis di website.
Link: `https://kamudanaku652-del.github.io/DJ-app/`

## 2. Cara Menjadi APK (Android)
Karena build di awan (GitHub) seringkali lambat, cara terbaik adalah build di komputer sendiri:
1. **Export ke ZIP** dari AI Studio (Menu Settings).
2. Install **Node.js** dan **Android Studio**.
3. Di terminal folder proyek, jalankan:
   ```bash
   npm install
   npm run build
   npx cap add android
   npx cap sync
   ```
4. Buka folder `android` menggunakan **Android Studio** dan klik **Build APK**.

## 3. Monetisasi (Cara Dapat Uang)
Aplikasi ini sudah saya siapkan untuk monetisasi:
*   **Adsterra / AdSense Ready**: Sudah ada area iklan di bagian paling bawah. 
    *   **Caranya**: Daftar di Adsterra, ambil kode script iklan banner, lalu tempel di `src/App.tsx` pada bagian `Adsterra Ads Area`.
*   **Pro Version**: Tombol **"GO PRO"** di header membuka toko virtual. Jika diklik (simulasi bayar), iklan akan hilang otomatis. Ini bisa Anda hubungkan ke sistem pembayaran asli nanti.
*   **Saran**: Adsterra lebih mudah untuk GitHub Pages dibanding Google AdSense.

---
Dibuat dengan ❤️ oleh AI Studio Assistant.
