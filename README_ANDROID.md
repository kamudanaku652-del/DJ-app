# WALKER PRO DJ - Mobile Build Guide

Aplikasi ini sudah dikonfigurasi menggunakan **Capacitor** untuk bisa menjadi Aplikasi Android (APK).

## Cara Mendapatkan APK via GitHub (Sangat Direkomendasikan)

Karena repositori ini sudah terhubung ke GitHub, Anda bisa mendapatkan APK secara otomatis:

1. **Push perubahan** ke GitHub (klik tombol Sync/Deploy di AI Studio).
2. Buka repositori Anda di GitHub: `https://github.com/kamudanaku652-del/DJ-app`
3. Klik tab **"Actions"**.
4. Anda akan melihat workflow bernama **"Build Android APK"** sedang berjalan.
5. Setelah selesai (centang hijau), klik pada run tersebut.
6. Scroll ke bawah ke bagian **"Artifacts"**, dan Anda bisa mendownload `app-debug.apk`.

## Cara Build Manual (Jika ingin di komputer sendiri)

1. **Download Project**: Buka menu Settings di AI Studio, pilih "Export to ZIP".
2. **Ekstrak ZIP** di komputer Anda.
3. Install **Node.js** dan **Android Studio**.
4. Di terminal folder project, jalankan:
   ```bash
   npm install
   npm run build
   npx cap sync
   ```
5. Buka folder `android` menggunakan **Android Studio**.
6. Klik **Build > Build Bundle(s) / APK(s) > Build APK(s)**.

---
Dibuat dengan ❤️ oleh AI Studio Assistant.
