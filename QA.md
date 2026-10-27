# QA INVENTRA

## Otomatis

- Build: `npm run build` — pemeriksaan TypeScript dan bundle produksi.
- Unit/integrasi: `npm test` — domain dan repository IndexedDB dengan fake-indexeddb.
- Audit: `npm audit` — hasil terakhir tidak menemukan kerentanan.

Hasil eksekusi akhir sesi implementasi: **25 tes lulus dalam 2 file**, TypeScript dan build produksi berhasil, `npm audit` melaporkan **0 vulnerabilities**. Tidak ada suite browser E2E pada versi ini.

## Checklist browser sebelum publikasi — belum dijalankan

- Desktop 1440 px, tablet 768 px, mobile 390 dan 320 px: tanpa overflow halaman; tabel dapat digulir; drawer dapat ditutup; tombol tidak terpotong.
- Tab/Shift+Tab pada modal tidak keluar dialog, Escape menutup, fokus kembali ke tombol pembuka, label dan pesan error terbaca screen reader.
- Tambah kategori → tambah barang stok awal 10 → masuk 5 → keluar 3 → saldo 12; histori memuat semua operasi.
- Coba keluar 13: ditolak tanpa perubahan saldo maupun histori. Coba tanggal mundur sebelum stok awal: ditolak.
- Edit barang tidak mengubah saldo; kode duplikat ditolak. Arsip menyimpan histori dan tidak muncul pada pilihan transaksi; aktifkan ulang.
- Hapus kategori terpakai: ditolak. Hapus kategori kosong: berhasil setelah konfirmasi.
- Refresh halaman dan buka tab kedua: data bertahan; perubahan tersinkron. Coba transaksi bersamaan pada dua tab.
- Ekspor JSON → hapus data → refresh masih kosong → impor JSON → data dan histori kembali.
- Impor file salah format, versi asing, ID duplikat, referensi putus, saldo palsu, tanggal tidak valid: ditolak, data lama tetap utuh.
- CSV dengan koma/kutip/awalan formula; impor di aplikasi spreadsheet dan pastikan teks tidak dieksekusi sebagai formula.
- Filter tanggal mutasi dan cetak laporan: data sesuai filter, header kolom terbaca, kontrol tidak dicetak.
- Cancel pada konfirmasi reset/hapus/import tidak mengubah data.
- Simulasi penolakan IndexedDB, quota penuh, storage cleanup dan tab dengan schema berbeda.
- Domain Cloudflare: HTTPS, refresh URL `/barang`, aset/CSP berjalan tanpa console error, tidak ada request data ke layanan eksternal.
