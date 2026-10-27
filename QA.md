# QA INVENTRA — perbaikan pasca-audit

## Hasil yang benar-benar dijalankan

- `npm test`: **52 tes lulus, 7 file**. Cakupan: domain, IndexedDB simulasi, worker lifecycle, pagination, dan komponen Vue dengan jsdom.
- `npm run build`: TypeScript strict termasuk `noUnusedLocals`/`noUnusedParameters` dan bundle produksi berhasil.
- `npm audit --json`: **0 vulnerabilities** saat pemeriksaan pasca-penambahan alat tes.
- `npm run format:check`: berhasil; seluruh source sesuai Prettier.

## Perbaikan dan bukti regresi

| Audit | Perbaikan                                                                                                     | Bukti otomatis                                                                                                                       |
| ----- | ------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| F-01  | Snapshot, ekspor ringkas UTF-8 dan impor berbagi batas 64 MiB; input diproses worker                          | Roundtrip backup valid lebih dari 10 MiB, boundary ukuran, lifecycle worker                                                          |
| F-02  | Data tersimpan tidak ditolak akibat tanggal perangkat mundur; transaksi baru tetap melarang tanggal mendatang | Regresi jam/tanggal dengan fake timers                                                                                               |
| F-03  | Koneksi dibuka lazy dan kegagalan tidak disimpan permanen; panel pemulihan tersedia pada error                | Retry setelah akses pulih, raw corrupt snapshot tidak berubah, penggantian eksplisit, komponen error                                 |
| F-04  | Satuan terkunci setelah ada histori                                                                           | Perubahan satuan ditolak; nama/harga tetap dapat diedit                                                                              |
| F-05  | Timestamp dinormalisasi UTC dan dibandingkan menurut instant                                                  | Offset yang menyembunyikan saldo negatif ditolak                                                                                     |
| F-06  | Set/Map untuk referensi, duplikasi dan pengelompokan histori                                                  | Suite domain serta benchmark lokal; parsing impor di worker                                                                          |
| F-07  | Halaman pagination di-clamp ketika dataset menyusut                                                           | Regresi 12 barang menjadi 8, kemudian kosong                                                                                         |
| F-08  | Drawer inert saat tertutup, fokus/Escape, nama kontrol, kontras dan target sentuh                             | Tes DOM untuk inert, expanded, Escape, dan pemulihan fokus; review CSS                                                               |
| F-09  | Aturan redirect invalid dihapus; gunakan fallback SPA bawaan Pages                                            | Wrangler lokal: root + 6 deep link HTTP 200, MIME/byte aset JS/CSS/worker sesuai, CSP worker tersedia, tanpa warning aturan redirect |
| F-10  | Unused imports dibersihkan; kontrol data, worker, unduhan dan composable diekstrak; route lazy                | TypeScript memblokir unused locals/parameters; build terpisah                                                                        |

Benchmark Node lokal pada data yang sama dengan audit: 5.000 produk, 20.000 mutasi, validasi **111 ms** pada satu eksekusi setelah perbaikan (audit sebelumnya 1.218 ms). Ini pengukuran Node pada mesin lokal, bukan SLA atau hasil iPhone. Validasi/penulisan snapshot saat commit masih memakai main thread dan seluruh snapshot.

Emulator Cloudflare Pages lokal memverifikasi root dan enam deep link mengembalikan HTML 200, tiga aset JavaScript (termasuk worker) dan CSS mempunyai MIME/isi sesuai build, serta CSP memuat `worker-src self`. Ini bukan deployment publik atau bukti eksekusi worker pada browser.

Tidak ada data IndexedDB pengguna yang digunakan/dihapus. Tes storage memakai fake-indexeddb dengan nama database acak. Tes komponen memakai DOM simulasi dan store terisolasi. Ekspor mentah pemulihan bukan backup normal siap impor; simpan untuk pemeriksaan manual sebelum mengganti data rusak atau legacy yang terlalu besar.

## Belum terverifikasi — gate sebelum publikasi

Browser tidak tersedia pada sesi ini. jsdom tidak membuktikan layout, native Web Worker, unduhan/upload nyata, fokus Safari, atau pengalaman iPhone. Tidak ada klaim E2E browser/Lighthouse/deployment berhasil.

- Desktop 1440 px, tablet 768 px, iPhone 390/320 px: tidak ada overflow halaman; tabel dapat digulir; target sentuh nyaman.
- Tab/Shift+Tab/Escape, drawer, modal, screen reader, zoom teks dan reduced motion pada browser nyata.
- Tambah kategori → barang stok 10 → masuk 5 → keluar 3 → saldo 12; refresh dan buka tab kedua.
- Stock out 13 ditolak tanpa perubahan; simulasi refresh saat commit dan dua operasi dari tab berbeda.
- Ekspor normal → reset kosong → refresh tetap kosong → impor → histori/saldo pulih.
- Impor JSON rusak, relasi putus, timestamp offset tidak konsisten dan versi asing ditolak tanpa mengganti data.
- Gangguan izin IndexedDB → retry; corrupt snapshot → ekspor mentah → restore eksplisit.
- CSV dengan koma, kutip dan awalan formula pada aplikasi spreadsheet; cetak laporan pada A4 landscape.
- Domain Cloudflare final: HTTPS, refresh deep link, CSP worker, MIME aset, cache serta tidak ada request data ke layanan eksternal.

## Penyempurnaan berikutnya

Suite E2E browser dan pemeriksaan visual masih perlu lingkungan browser. Halaman Workspace masih dapat dipecah lebih lanjut. Dependency ikon masih memakai paket Lucide lama yang deprecated (tidak ada advisory npm saat audit); migrasi ikon dan perluasan backend/idempotency berada di tahap berikutnya. Tidak ada autentikasi atau sinkronisasi cloud.
