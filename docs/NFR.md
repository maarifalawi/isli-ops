# Kebutuhan Non-Fungsional

**Revisi 13 Agu 2026** — angka tebakan diganti angka dari klien.

---

## Skala nyata

| Ukuran | Nilai | Sumber |
|---|---|---|
| User | **4** | klien |
| User bersamaan | 4 (puncak) | turunan |
| Job per bulan | tidak tentu; ± 19 dari data Apr–Jul | data + klien |
| Baris biaya per job | 14–24 | job sheet |
| Lokasi | 1 kantor, Bekasi | klien |
| Zona waktu | WIB saja | turunan |
| Mata uang tampilan | IDR | klien |
| Mata uang input | IDR **dan USD** + kurs per job | ⚠️ data |

> **Ini sistem kecil.** 4 user, ± 19 job/bulan, satu kantor. Jangan bangun
> untuk skala yang tidak ada. Tidak perlu microservice, tidak perlu antrian
> pesan, tidak perlu cache berlapis, tidak perlu replika baca.
>
> Rancang untuk **100 job/bulan** sebagai ruang tumbuh. Itu sudah 5× dan tetap
> ringan untuk satu Postgres.

---

## Responsif — wajib, bukan tambahan

Pak Indra menyetujui lewat **laptop dan HP**. Approval adalah jalur paling
genting di seluruh sistem, dan sebagian besar terjadi di HP.

| Titik | Lebar | Yang harus jalan |
|---|---|---|
| Ponsel | 360–430 px | approval, lihat job, notifikasi |
| Tablet | 768 px | semua kecuali entri massal |
| Laptop | 1280 px+ | semua |

**Aturan:** halaman approval dirancang **mobile-first**. Kalau approval tidak
nyaman dilakukan dengan satu tangan sambil berdiri, rancangannya gagal.

Tabel job yang lebarnya 20 kolom **tidak boleh** cuma dikasih scroll horizontal
di HP. Di layar kecil dia berubah jadi kartu.

---

## PWA — satu keputusan, tiga masalah selesai

Karena harus responsif, aplikasinya dibuat sebagai PWA:

| Dapat | Nilai |
|---|---|
| Push notification ke HP | gratis, tanpa Meta, tanpa BSP |
| Ikon di layar utama | terasa seperti aplikasi |
| Tetap satu basis kode | tidak perlu aplikasi Android terpisah |

Menggantikan WhatsApp API yang biayanya ± Rp 500rb/bulan.
Lihat `docs/JAWABAN-KLIEN.md`.

---

## Kinerja

| Operasi | Target | Batas |
|---|---|---|
| Muat daftar job | < 500 ms | 1 s |
| Buka detail job | < 300 ms | 800 ms |
| Simpan job (24 baris) | < 600 ms | 1,5 s |
| Buat PDF invoice | < 2 s | 5 s |
| Laporan bulanan | < 1,5 s | 4 s |
| Login | < 1 s | 2 s |

Diukur pada **4G Indonesia**, bukan wifi kantor. Pak Indra membuka ini dari HP.

---

## Retensi — 10 tahun, diwajibkan hukum

**UU KUP Pasal 28 ayat (11):** dokumen dasar pembukuan wajib disimpan
**10 tahun di Indonesia**, termasuk yang elektronik.

Konsekuensi yang mengikat rancangan:

| Aturan | Penerapan |
|---|---|
| Tidak ada hapus permanen | `deleted_at TIMESTAMPTZ`, tanpa `DELETE` |
| Audit tidak boleh dipangkas | `REVOKE UPDATE, DELETE ON audit_log` |
| Lampiran ikut 10 tahun | jangan pakai penyimpanan yang auto-kedaluwarsa |
| Cadangan bisa dipulihkan | uji pemulihan, bukan cuma bikin cadangan |
| Data disimpan **di Indonesia** | ⚠️ pengaruhi pilihan region — lihat di bawah |

> ⚠️ **"disimpan di Indonesia"** perlu ditafsirkan. Kalau ditafsirkan ketat,
> Supabase region Singapura bisa dipersoalkan. Praktik umum menerima cloud
> asing selama datanya bisa diakses dari Indonesia, tapi ini **pertanyaan
> untuk konsultan pajak ISLI, bukan untuk developer.** (**Q60**)

---

## Ketersediaan

Belum dibahas dengan klien. Usulan awal, perlu disetujui:

| Aspek | Usulan |
|---|---|
| Jam kritis | Sen–Jum 08.00–17.00 WIB |
| Target uptime | 99% jam kerja (≈ 2 jam turun/bulan) |
| Cadangan | harian otomatis, simpan 30 hari + bulanan 10 tahun |
| RPO | 24 jam |
| RTO | 4 jam |
| Saat sistem mati | 🔴 **belum ada prosedur** (**Q61**) |

> Q61 bukan pertanyaan teknis. Kalau sistem mati jam 10 pagi dan ada 3 invoice
> harus keluar hari itu, orang akan **kembali ke Excel** — lalu datanya tidak
> pernah masuk kembali. Itulah cara sistem mati pelan-pelan.
> Harus ada prosedur tertulis, sekalipun isinya "tunggu".

---

## Keamanan

| Aspek | Ketentuan |
|---|---|
| Autentikasi | email + kata sandi, sesi 12 jam |
| Kata sandi | minimal 12 karakter, dicek ke daftar bocor |
| 2FA | 🔴 perlu untuk OWNER? (**Q62**) |
| Transport | HTTPS saja, HSTS aktif |
| Otorisasi | terpusat, di server (ADR-0004) |
| Jejak audit | siapa, apa, kapan, dari mana, nilai lama → baru |
| Rahasia | variabel lingkungan, tidak pernah masuk repo |
| Unggahan | validasi tipe, batas 10 MB, pindai nama berkas |

---

## Kemudahan dirawat — naik jadi kebutuhan utama

Klien menyatakan sistem akan **diserahkan setelah go-live**. Itu memindahkan
"kode yang gampang dibaca" dari nilai bagus jadi **syarat**.

| Aturan | Alasan |
|---|---|
| Utamakan kode membosankan | penerus mungkin lebih junior |
| Tanpa abstraksi pintar | tidak ada yang bisa ditanyai nanti |
| Komentar untuk aturan bisnis | "kenapa", bukan "apa" |
| Dokumen bahasa Indonesia | pembacanya orang Indonesia |
| `RUNBOOK.md` wajib | deploy, cadangan, pulih, ganti kata sandi |
| Kepemilikan akun jelas | 🔴 hosting atas nama siapa? (**Q51**) |

> Kalau serah terima tidak direncanakan, hasilnya sistem yang tidak ada yang
> berani sentuh. Enam bulan kemudian orang balik ke Excel. Persis seperti
> proyek sebelumnya.

---

## Aksesibilitas & bahasa

| Aspek | Ketentuan |
|---|---|
| Bahasa antarmuka | Indonesia |
| Format angka | `1.234.567` (titik ribuan) |
| Format tanggal | `13 Agu 2026` |
| Mata uang | `Rp 1.234.567` tanpa desimal |
| Sasaran sentuh | minimal 44×44 px |
| Kontras | WCAG AA |

---

## Yang sengaja TIDAK dikejar

| Bukan target | Alasan |
|---|---|
| Offline penuh | 1 kantor, internet stabil |
| Skala horizontal | 4 user |
| Multi-tenant | 1 perusahaan |
| Real-time kolaboratif | tidak ada yang edit job bersamaan |
| i18n | Indonesia saja |
| Dark mode | belum diminta |
| Aplikasi Android/iOS | PWA sudah cukup |

Setiap baris di tabel ini adalah **pekerjaan yang tidak dikerjakan** — dan
itulah cara menghindari scope creep yang menenggelamkan proyek sebelumnya.
