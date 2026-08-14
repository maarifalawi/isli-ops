# PRD — ISLI Operations System

> **Status:** DRAFT v0.1 — menunggu jawaban 🔴 di `OPEN-QUESTIONS.md`.
> Bagian bertanda ⚠️ belum boleh dikunci.

## 1. Masalah

ISLI menjalankan seluruh operasi freight forwarding di atas Excel manual.
Konsekuensi yang **terbukti dari data klien sendiri**, bukan asumsi:

| Bukti | Dampak |
|---|---|
| `SUMMARY 2026!F19` merujuk GP satu job, bukan subtotal bulan | Laporan GP Apr–Jul understated **Rp 22.500.000** (257,65 jt dilaporkan vs 280,15 jt seharusnya) |
| `DOM!Q91` = 18.700.000 tapi `O91−P91` = 28.900.000 | Selisih **Rp 10.200.000** di dalam satu file |
| Job `ISLI-26.08-005` punya 2 versi costing | GP 15,57% vs 9,12% untuk job yang sama |
| 16 tabrakan nomor job antar segmen | Nomor job tidak bisa jadi kunci unik |
| Link ke file eksternal per job (`'[1]04-003'!$E$16`) | Satu job = satu file; rawan broken link |
| 2 baris ETD bertahun **2006** | Tidak ada validasi input |
| `MATEREE` vs `MATEREE NUSANTARA` vs `PT. MATEREE NUSANTARA UTAMA` | Rekap per customer/vendor tidak akurat |

Kutipan pemilik:
> *"Transaksi udah mulai banyak, tingkat kepercayaan atas hal manual bagi saya
> agak mulai diragukan."*

## 2. Tujuan

**Tujuan tunggal Phase 1:** setiap job punya satu angka GP yang benar,
dapat ditelusuri, dan tidak bisa diubah diam-diam.

Metrik keberhasilan:

| Metrik | Target |
|---|---|
| Selisih GP antara sistem dan rekonsiliasi manual | Rp 0 |
| Waktu Pak Indra melihat GP satu job dari nomor job | < 10 detik |
| Job yang bisa dibongkar tanpa jejak audit | 0 |
| Invoice vendor terbayar dua kali | 0 (dicegah sistem) |
| Waktu tutup laporan bulanan | dari berhari-hari → langsung |

## 3. Pengguna

⚠️ Menunggu Q17.

| Role | Kebutuhan utama |
|---|---|
| **Owner** (Pak Indra) | Lihat GP per job & per bulan. Approval final. Tidak mau detail. |
| **Finance Manager** (Bu Niken) | Aturan pajak, kontrol pembayaran vendor, rekap PPh 23/PPN. |
| **Manager** | Approval tahap 1. |
| **Ops Staff** | Input job, costing, update status pengiriman. |
| **Finance/AP Staff** | Input invoice vendor, eksekusi pembayaran. |

## 4. Ruang lingkup Phase 1 — REKOMENDASI

> Klien menyerahkan penentuan scope. Rekomendasi berikut dipilih dengan satu
> kriteria: **cakupan terkecil yang sudah menghasilkan satu angka GP yang bisa
> dipercaya dari ujung ke ujung.** Menambah apa pun di luar ini memperbesar
> risiko tanpa menambah kepercayaan.

### IN SCOPE

| # | Fitur | Alasan masuk |
|---|---|---|
| F1 | Master data: customer, vendor, charge code, port, ship line | Tanpa ini rekap apa pun salah |
| F2 | Buat Job + nomor otomatis 3-scope | Identitas segalanya |
| F3 | Costing: Selling & Buying berbasis charge line | Inti nilai produk |
| F4 | Pencadangan vs Actual + selisih | Kebutuhan nyata yang tidak disebut di brief lisan |
| F5 | GP & GP% otomatis per job | Tujuan tunggal |
| F6 | Approval Maker → Manager → Owner, dengan reset penuh saat unlock | Permintaan eksplisit Pak Indra |
| F7 | Terbitkan invoice customer (PDF, kop ISLI, terbilang, PPN/PPh) | Ujung dari job |
| F8 | Catat invoice vendor + cegah dobel bayar | Permintaan eksplisit Bu Niken |
| F9 | Dashboard GP per bulan per segmen | Pengganti `SUMMARY 2026` |
| F10 | Audit log penuh + RBAC | Syarat kepercayaan |
| F11 | Import data historis Apr–Jul 2026 | Sistem kosong = tidak dipakai |
| F12 | **Filter rentang periode bebas** (bulan A → bulan B) di semua laporan | Permintaan eksplisit klien 13 Agu 2026 (R14.1) |
| F13 | **Halaman peringkat multi-sumbu** — customer, segmen, sales, rute, vendor — dengan drill-down berlapis | Permintaan eksplisit klien 13 Agu 2026 (R14.2–R14.4) |
| F14 | **Field wajib pada baris buying**, kewajiban vendor per kode biaya | Permintaan eksplisit klien 13 Agu 2026 (R15) |

### OUT OF SCOPE — ditulis eksplisit agar agent tidak melebar

| Tidak dikerjakan di Phase 1 | Dipindah ke |
|---|---|
| Integrasi Accurate / sistem keuangan | Phase 3 |
| Jurnal, buku besar, neraca, laporan laba rugi lengkap | Phase 3 |
| e-Faktur / e-Bupot otomatis ke DJP | Phase 2/3 |
| Portal customer | — |
| Tracking pengiriman real-time | — |
| Manajemen kas & petty cash (dropping Pak Teguh) | Phase 2 |
| Aplikasi mobile native | — (web responsif cukup) |
| Multi-perusahaan / multi-cabang | — |
| Quotation / penawaran ke customer | Phase 2 |
| Payroll, HR, aset | — |

> **Catatan penting:** Pak Indra sendiri bilang *"PNL nggak perlu, saya butuh
> laporan operasionalnya aja"*. Proyek sebelumnya dengan vendor lain gagal
> karena scope creep — *"tambah lagi, tambah lagi, tambah lagi"*.
> Daftar OUT OF SCOPE di atas adalah alat pertahanan utama proyek ini.
> Perubahan scope hanya lewat ADR baru + persetujuan tertulis.

### Peta fase

| Fase | Isi | Hasil bagi Pak Indra |
|---|---|---|
| **Phase 0** | Discovery, dokumen, rekonsiliasi | *"Ini bukti laporan Bapak salah 22,5 juta"* |
| **Phase 1** | F1–F11 | *"Mata satu"* — GP per job yang bisa dipercaya |
| **Phase 2** | AR/AP penuh, aging, kas, rekap pajak, quotation | Kontrol arus kas |
| **Phase 3** | Feeding ke sistem keuangan (Accurate) | Tutup buku otomatis |

## 5. User story + acceptance criteria

### US-01 — Buat job
> Sebagai **Ops Staff**, saya membuat job baru agar pekerjaan tercatat.

- [ ] Nomor job dibuat otomatis sesuai R1.1 dengan counter per scope (R1.2)
- [ ] Dua user membuat job bersamaan tidak menghasilkan nomor kembar
- [ ] Kombinasi leg `1+3` tanpa `2` ditolak oleh database, bukan hanya UI (R10)
- [ ] Job tanpa satu pun leg tercentang ditolak (R10)
- [ ] Job domestik default tercentang `1+2+3`
- [ ] Mengubah leg domestik dari `1+2+3` mewajibkan `leg_override_alasan`, dan alasannya masuk audit log (R10)
- [ ] ETD di luar rentang [hari ini − 1 tahun, hari ini + 1 tahun] memicu peringatan
- [ ] Job baru berstatus `DRAFT`

### US-02 — Susun costing
> Sebagai **Ops Staff**, saya mengisi selling & buying agar GP terhitung.

- [ ] Charge line hanya boleh memakai `charge_code` dari master
- [ ] Baris `is_at_cost` wajib selling == buying, kalau tidak ditolak (R4.3)
- [ ] Setiap baris buying punya `pencadangan`; `actual` boleh kosong dulu
- [ ] GP & GP% dihitung ulang otomatis tiap perubahan
- [ ] Semua nominal integer rupiah, tidak ada pecahan sen

### US-03 — Approval berjenjang
> Sebagai **Owner**, saya ingin dokumen final tidak bisa diubah diam-diam.

- [ ] `DRAFT → SUBMITTED → APPROVED_L1 → FINAL`
- [ ] Approver tidak boleh sama dengan maker
- [ ] Job `FINAL` menolak semua edit
- [ ] Unlock butuh alasan tertulis + persetujuan Owner
- [ ] Unlock **mereset semua approval ke nol** (R6.2)
- [ ] Setiap transisi tercatat di audit log dengan aktor, waktu, alasan

### US-04 — Terbitkan invoice
> Sebagai **Finance**, saya menerbitkan invoice yang benar secara pajak.

- [ ] Ditolak kalau job belum `FINAL`
- [ ] Ditolak kalau Proof of Delivery belum diterima (R9.4)
- [ ] Nomor invoice sesuai R2.1 dengan counter per tipe
- [ ] DPP mengecualikan baris reimburse (R3.2)
- [ ] PPN = 1,1% × DPP (R3.1)
- [ ] PPh 23 dipotong hanya bila flag aktif; default tidak aktif (R3.5)
- [ ] Grand total = sub total + PPN − PPh 23 (R3.3)
- [ ] Terbilang dalam bahasa Indonesia yang benar
- [ ] PDF memakai kop & logo ISLI
- [ ] Baris at-cost keluar sebagai **Invoice Reimburse** terpisah tanpa PPN
- [ ] **Uji banding:** output untuk data invoice Materee dan Diametral harus
      menghasilkan angka yang identik dengan invoice asli

### US-05 — Cegah dobel bayar vendor
> Sebagai **Finance Manager**, saya ingin mustahil bayar dua kali.

- [ ] `UNIQUE(vendor_id, vendor_invoice_no)` (R7.1)
- [ ] Nomor mirip pada vendor sama memunculkan peringatan (kasus 01A/01B)
- [ ] Status bayar tampil sebelum aksi pembayaran
- [ ] Invoice vendor yang sudah `PAID` menolak pembayaran kedua
- [ ] Rekap pembayaran per vendor per bulan tersedia (R7.3)

### US-06 — Dashboard GP
> Sebagai **Owner**, saya ingin melihat GP tanpa membuka Excel.

- [ ] Tabel bulan × segmen: selling, cost, GP, GP%
- [ ] Setiap angka bisa di-drill ke daftar job penyusunnya
- [ ] Angka dihitung dari data, bukan dari sel yang bisa salah referensi
- [ ] Cari job berdasarkan nomor → tampilkan costing, invoice, riwayat approval,
      status pembayaran (persis permintaan Pak Indra)

### US-07 — Import historis
- [ ] Import `fixtures/golden-jobs.csv` (75 job)
- [ ] Baris yang GP-nya tidak konsisten ditandai, bukan diperbaiki diam-diam
- [ ] Laporan hasil import: berhasil / ditandai / gagal + alasan

## 6. Non-goals perilaku agent

- Tidak membuat charge code, status, atau role baru tanpa masuk `CONTEXT.md`
- Tidak membuat "fitur bonus" yang tidak ada di daftar IN SCOPE
- Tidak memperbaiki data historis yang salah secara diam-diam — tandai saja


---

### US-08 — Analisis periode & peringkat *(ditambahkan 13 Agu 2026)*
> Sebagai **Owner**, saya ingin tahu customer mana yang paling besar dalam
> rentang waktu yang saya pilih sendiri, dan bisa menelusurinya sampai ke job.

- [ ] Rentang bulan A → bulan B bisa dipilih; default bulan berjalan (R14.1)
- [ ] Rentang tersimpan di URL sehingga bisa dibagikan
- [ ] Tab sumbu: customer, segmen, sales, rute (pendapatan) dan vendor (belanja)
- [ ] Peringkat **berubah** mengikuti rentang — diuji dengan dua rentang berbeda
- [ ] Tiap baris menampilkan jumlah job, selling, cost, GP, GP%, tanggal pertama & terakhir
- [ ] Klik baris → daftar job; klik job → costing; klik costing → invoice & pembayaran
- [ ] Peringkat vendor diberi label **belanja**, tidak dicampur dengan pendapatan (R14.2)
- [ ] **Test: total seluruh rentang == total `GOLDEN_APR_JUL_2026`**
- [ ] Semua agregat dihitung dari data, tidak ada tabel rekap tersimpan (R14.5)

### US-09 — Field wajib buying *(ditambahkan 13 Agu 2026)*
> Sebagai **Manajer**, saya tidak mau ada biaya masuk tanpa jelas vendornya siapa.

- [ ] Kode biaya bertanda `butuh_vendor` menolak baris tanpa vendor (R15.2)
- [ ] Baris bernilai 0 atau negatif mewajibkan keterangan
- [ ] Import historis boleh melewati aturan ini, tapi barisnya **ditandai**
