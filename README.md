# INVENTRA — Smart Inventory Management Dashboard

Demo portofolio inventaris berbahasa Indonesia. Vue 3 Composition API, TypeScript, Vite, Vue Router, dan IndexedDB native. Data fiktif, tanpa backend, autentikasi, atau layanan database berbayar.

## Menjalankan

Memerlukan **Node.js 22.12+** (lihat `.node-version`). Node 16 tidak didukung.

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
npm run format:check
```

`npm run build` menjalankan pemeriksaan TypeScript dan menghasilkan `dist/`. Lockfile disertakan untuk instalasi yang konsisten.

Code style seluruh source dan konfigurasi mengikuti `.prettierrc.json`: indentasi 2 spasi, single quote pada JavaScript/TypeScript, semicolon eksplisit, dan lebar baris 100 karakter. Jalankan `npm run format` untuk merapikan atau `npm run format:check` untuk memeriksa format tanpa mengubah file. Dependency, hasil build, dan lockfile yang dihasilkan otomatis dikecualikan lewat `.prettierignore`.

## Fitur MVP yang diimplementasikan

- Dashboard: jenis barang aktif, total unit, stok rendah/habis, grafik masuk/keluar 7/30 hari, aktivitas terbaru.
- Barang: tambah/edit/arsip/aktifkan kembali, kode unik, kategori, satuan, harga modal opsional, minimum stok, saldo awal; pencarian, filter, pengurutan dan pagination.
- Kategori: tambah/edit/hapus, warna kategori; kategori terpakai termasuk pada barang arsip tidak dapat dihapus.
- Transaksi: masuk/keluar, tanggal, catatan, validasi stok dan saldo historis. Histori permanen, tidak ada edit/hapus transaksi.
- Laporan: saldo terkini, nilai persediaan berdasarkan harga modal, mutasi dengan rentang tanggal, CSV, CSS cetak A4 landscape. Filter tanggal hanya berlaku pada mutasi; ringkasan stok selalu saldo terkini, bukan saldo historis per tanggal.
- Pengaturan: backup JSON, impor dengan validasi dan konfirmasi penggantian data, reset contoh, hapus seluruh data.
- UI: sidebar desktop, drawer mobile, tabel yang dapat digulir, modal dengan focus trap/Escape/pemulihan fokus, notifikasi, empty/loading/error states, reduced motion, skip link dan label aksesibel.

Fitur opsional berikut **belum diimplementasikan**: pengelolaan pemasok/pelanggan, barcode, lampiran/foto barang, multiwarehouse, transfer gudang, penilaian FIFO/rata-rata modal, saldo historis laporan, autentikasi, sinkronisasi server, offline app shell/PWA, dark mode, dan peran pengguna.

## Struktur

```text
src/
  App.vue                     shell navigasi, status loading/error
  main.ts                     router dan bootstrap
  style.css                   design system dan breakpoint/cetak
  store.ts                    state reaktif bersama dan orkestrasi persistence
  components/
    Workspace.vue             halaman dan form
    Modal.vue                 dialog aksesibel
  domain/
    inventory.ts              model, kontrak repository, aturan bisnis, validasi
    inventory.test.ts         pengujian aturan dan use case
  data/
    repository.ts             adapter IndexedDB
    repository.test.ts        pengujian integrasi database
    seed.ts                   data fiktif relatif terhadap hari inisialisasi
public/
  _headers                    header keamanan Cloudflare
  _redirects                  fallback SPA
```

Komponen hanya mengirim input ke fungsi domain. Domain tidak mengakses IndexedDB maupun Vue. Store menggunakan kontrak `InventoryRepository`; adapter persistence dapat diganti tanpa mengubah markup komponen. State Vue reaktif cukup untuk demo kecil sehingga Pinia tidak ditambahkan. Lucide menyediakan ikon konsisten (ISC), Vue/Vite/router dan alat tes memakai lisensi open source; tidak ada aset kantor, gambar pihak ketiga, font remote, atau tracker.

## Model dan keputusan stok

- Category `1 → N` Product melalui `categoryId`.
- Product `1 → N` Movement melalui `productId`.
- Product menyimpan `stock` sebagai saldo materialisasi. Movement adalah sumber kebenaran audit; saldo wajib sama dengan penjumlahan semua mutasi produk.
- Stok awal dibuat sebagai mutasi masuk, bukan nilai tanpa jejak histori.
- Setiap transaksi mempunyai UUID. Kuantitas dan stok berupa safe integer; satuan pecahan belum didukung.
- Histori diurutkan menurut tanggal bisnis lalu waktu pencatatan. Tidak boleh ada saldo negatif pada titik mana pun; transaksi bertanggal mundur yang melanggar aturan ditolak walaupun saldo akhir cukup.
- Transaksi tercatat tidak dapat diubah/hapus. Koreksi memakai transaksi lawan yang baru dan catatan alasan. Ini menjaga histori sederhana tanpa mekanisme pembatalan kompleks.
- Barang diarsipkan, tidak dihapus permanen; histori tetap dapat ditelusuri. Barang arsip tidak dapat ditransaksikan.
- Harga modal merupakan harga pada produk saat ini, bukan akuntansi nilai transaksi historis.

## IndexedDB dan konsistensi

Database `inventra-demo`, schema versi `1`, object store `inventory`, key `snapshot`. Snapshot memuat `version: 1`, produk, kategori dan histori. Skema snapshot dipilih agar operasi lintas entitas atomik tanpa library tambahan. Ini sesuai skala demo; validasi dan penulisan seluruh snapshot berbiaya linear dan bukan rancangan untuk jutaan transaksi.

Data contoh diisi **hanya di `onupgradeneeded` ketika database dibuat**. Database kosong setelah penghapusan data oleh aplikasi tetap kosong setelah refresh. Reset contoh hanya dilakukan lewat tindakan eksplisit.

Setiap mutasi membaca keadaan terkini dan menulis snapshot tervalidasi dalam satu transaksi `readwrite`. UI berubah setelah commit berhasil. IndexedDB menyerialkan transaksi sehingga dua tab tidak kehilangan pembaruan. BroadcastChannel memberi tahu tab lain untuk membaca snapshot terbaru; kegagalan sinkronisasi diberitahukan. Browser tanpa BroadcastChannel tetap mendapat konsistensi penulisan; muat ulang untuk melihat perubahan tab lain.

Kegagalan buka/baca menampilkan error dan tombol coba lagi. Kegagalan tulis mempertahankan data lama serta menampilkan pesan pada form. Upgrade berikutnya harus memakai versi database baru dan migrasi dalam `versionchange`; backup dengan versi yang tidak dikenal ditolak, tidak dimigrasikan diam-diam. Koneksi ditutup saat versi lain diminta. Backup disarankan sebelum upgrade besar.

## Backup, privasi dan reset

Backup JSON memuat seluruh histori dan barang arsip. Impor maksimum 10 MB, 10.000 barang, 1.000 kategori, 100.000 mutasi. Divalidasi struktur, versi, tipe, kode unik, ID unik, referensi, kategori, angka, tanggal, saldo akhir dan saldo historis sebelum konfirmasi dan kembali sebelum commit. Batas ini adalah batas proteksi input, bukan jaminan performa untuk snapshot sebesar itu.

Impor mengganti data, tidak menggabungkan. Reset dan hapus data membutuhkan konfirmasi. Ekspor backup lebih dahulu jika data ingin dipertahankan. CSV menggunakan escaping kutip dan mitigasi formula spreadsheet.

Tidak ada password, akun, autentikasi palsu atau data yang dikirim ke server. Browser/perangkat/origin berbeda memiliki data berbeda. Mode privat atau penghapusan data situs dapat menghapus inventaris. Jangan memakai demo sebagai inventaris produksi atau menyimpan informasi sensitif. Header CSP ditambahkan untuk deployment, termasuk pembatasan skrip, frame, dan koneksi ke origin sendiri. CSP masih memperbolehkan inline style untuk visualisasi dinamis Vue; tidak ada inline script.

## Design system

Light mode dengan latar netral hijau pucat, surface putih, aksen emerald `#087f5b`, sudut 6–13 px, border tipis, font sistem lokal. Status stok memakai teks dan warna; ikon bukan satu-satunya penanda. Dashboard menonjolkan KPI, arus stok, dan perhatian operasional. Desktop menggunakan sidebar tetap, tablet menyusun ulang grid, mobile memakai drawer dan tabel gulir horizontal agar informasi tidak terpotong. Dialog dan kontrol mempunyai label, focus state dan navigasi keyboard. Kontras/zoom/screen reader tetap perlu diverifikasi manual.

## Pengujian dan status verifikasi

Jalankan `npm test`. Tes mencakup mutasi masuk/keluar, stok negatif, backdating, validasi barang dan kategori, CRUD/arsip, konsistensi histori, import tidak valid, backup roundtrip, seed sekali, persistence lintas instance, rollback, dan concurrent write. IndexedDB pada suite memakai `fake-indexeddb`; ini bukan pengujian engine browser asli.

Hasil terverifikasi terakhir dicatat di `QA.md`. Pemeriksaan visual responsive, focus/keyboard, refresh browser asli, download/upload file dan end-to-end **belum dijalankan** karena koneksi browser otomatis tidak tersedia pada sesi implementasi. Tidak ada klaim E2E berhasil.

## Deployment Cloudflare Pages

Build command `npm run build`, output directory `dist`, Node `22` (atau lebih baru sesuai engines). Panduan resmi: https://developers.cloudflare.com/pages/framework-guides/deploy-a-vue-site/

1. Gunakan repository Git pribadi milik Anda dan commit source beserta `package-lock.json`; jangan commit `node_modules`, `.env` atau kredensial.
2. Hubungkan repository ke Cloudflare Pages melalui akun Cloudflare Anda, pilih branch produksi dan konfigurasi build di atas. Atur `NODE_VERSION=22` jika diperlukan.
3. Alternatif: jalankan build lokal dan unggah folder `dist` melalui Direct Upload di Cloudflare Pages.
4. Setelah deployment, verifikasi URL publik, refresh langsung `/barang`, header keamanan, mutasi/persistence dan backup pada domain final.

`public/_redirects` menyediakan fallback Vue Router. Tidak ada secret yang diperlukan di frontend. Mengganti domain/origin akan membuat penyimpanan browser baru; pindahkan data memakai backup JSON jika diperlukan.

**Belum dipublikasikan:** tidak ada akun, project atau akses deployment Cloudflare yang disediakan dalam sesi ini. Tidak ada URL publik yang diklaim.

## Roadmap full-stack

Pertahankan model/use case domain dan ganti operasi store dengan service aplikasi yang memanggil endpoint API. Kontrak repository callback saat ini cocok untuk atomisitas lokal; API harus menggunakan command bisnis (`createProduct`, `recordMovement`, dll.), bukan mengunduh lalu mengganti seluruh snapshot. UI dapat tetap memakai form dan model presentasi yang sama, tetapi orkestrasi store perlu adapter service.

Di PostgreSQL: tabel categories/products/movements, foreign key, unique index kode, check quantity positif, saldo produk dalam transaksi server dengan row lock atau update bersyarat. Server menjadi otoritas stok; tambahkan idempotency key, autentikasi nyata, RBAC, audit actor, tenant isolation, validasi server, backup terjadwal dan observabilitas. Jangan mengandalkan validasi frontend atau saldo yang dikirim klien. Migrasi dari JSON demo melalui endpoint impor tervalidasi.

Tahap berikutnya yang perlu disepakati sebelum perluasan: kebutuhan satuan pecahan, metode penilaian persediaan, pembatalan transaksi formal, multiwarehouse, model akses pengguna dan kebijakan retensi. MVP sengaja tidak menambahkan kompleksitas tersebut.
