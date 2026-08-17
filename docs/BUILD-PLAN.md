# BUILD-PLAN.md

> Urutan kerja. Agent: kerjakan **satu slice sampai selesai** sebelum pindah.
> Dilarang mengerjakan dua slice bersamaan. Dilarang melompati gerbang.

---

## ⚠️ GERBANG 0 — dibuka atas keputusan Pak Indra 13 Agu 2026

> **Keputusan pemilik proyek:** mulai menulis kode sekarang, tanpa menunggu 6
> item sisa di bawah. Risiko yang diambil sadar -- proyek sebelumnya gagal
> karena scope creep, dan gerbang ini awalnya dirancang mencegah itu. Item di
> bawah TETAP wajib dituntaskan sebelum Slice 3–6 dianggap benar, terutama
> validasi 43 kode biaya dan NPWP customer/vendor -- tanpa itu invoice yang
> keluar dari sistem bisa salah pajak atau salah nama resmi.
>
> **Siapa yang menulis kodenya: Cursor, lewat `docs/PROMPT-CURSOR.md`.** Agent
> chat ini menyiapkan dokumen, jawaban, dan prompt siap-pakai -- bukan menulis
> atau menjalankan kode aplikasi itu sendiri.

Sisa item (tidak lagi memblokir kode, tapi tetap wajib sebelum go-live):

- [ ] Semua pertanyaan 🔴 di `OPEN-QUESTIONS.md` terjawab (Q01–Q12)
- [x] **gsoft dijelaskan** ✅ 13 Agu 2026 — sistem perusahaan lama Pak Indra, tidak ada kaitan dengan ISLI. **Proyek ini greenfield.** Batas "jangan lewat Irisan 4" DICABUT.
- [x] ADR-0006 (pemindahan biaya) berstatus `Accepted` ✅ 13 Agu 2026 -- Opsi B, tabel `cost_reallocations` sudah dibuat
- [ ] ADR-0007 (definisi GP) berstatus `Accepted`
- [ ] `docs/RECONCILIATION-REPORT.md` sudah dipresentasikan ke Pak Indra
- [ ] `fixtures/charge-codes.csv` divalidasi Bu Niken
- [ ] `fixtures/customers-raw.csv` & `vendors-raw.csv` dinormalisasi + NPWP terisi
- [ ] Identitas ISLI (NPWP, alamat, kontak) diterima
- [ ] Scope Phase 1 disetujui tertulis

> **Kenapa keras begini:** proyek sebelumnya gagal karena scope creep.
> Gerbang ini adalah alat pertahanannya.

---

## Slice 0 — Kerangka (walking skeleton)

**Tujuan:** satu alur tipis tembus dari UI sampai database.

- [ ] Inisiasi Next.js + TypeScript strict
- [ ] Drizzle + Postgres lokal via Docker
- [ ] Vitest + Playwright jalan
- [ ] CI: typecheck, lint, test
- [ ] Auth: login/logout, satu user OWNER
- [ ] Halaman kosong `/jobs` yang butuh login
- [ ] Deploy ke staging

**Selesai bila:** bisa login di staging dan melihat halaman kosong.
**Jangan** buat UI cantik dulu.

---

## Slice 1 — Fondasi uang & pajak (murni, tanpa UI)

**Tujuan:** aritmetika benar sebelum ada apa pun yang memakainya.

- [ ] `domain/money/` — tipe rupiah integer, penjumlahan, pembulatan
- [ ] `domain/tax/ppn.ts` — PPN 1,1% atas DPP (R3.1)
- [ ] `domain/tax/dpp.ts` — pengecualian reimburse (R3.2)
- [ ] `domain/tax/pph23.ts` — 2%, default nonaktif (R3.5)
- [ ] `domain/terbilang/` — angka ke huruf Indonesia
- [ ] `tests/golden/invoice-materee.test.ts` → **harus 23.848.600**
- [ ] `tests/golden/invoice-diametral.test.ts` → **harus 131.429.434**

**Selesai bila:** kedua golden test hijau.
Q05 SUDAH DIJAWAB (ceiling) -- Diametral seharusnya HIJAU sekarang, selisih Rp 1 sudah tidak berlaku. Kalau masih meleset, **jangan akali kodenya**, itu bug pembulatan, telusuri.

---

## Slice 2 — Penomoran

- [ ] `domain/numbering/job-number.ts` (R1.1)
- [ ] Tabel `job_sequence` 3 scope (R1.2)
- [ ] Alokasi dengan row lock
- [ ] Test konkurensi: 50 permintaan bersamaan → 0 duplikat
- [ ] Test regresi: `ISLI-26.05-001` DOM & EXP bisa hidup bersamaan
- [ ] `domain/numbering/invoice-number.ts` + bulan Romawi (R2.1, R2.2)

---

## Slice 3 — Master data

> ✅ **DITUTUP 16 Agu 2026** (Irisan 3) — rincian di `CHANGELOG.md`;
> gate `pnpm verify` hijau (typecheck + lint + biome + 163/163 vitest + golden + 3/3 Playwright).

- [x] Skema + migrasi: `customer`, `vendor`, `charge_code`, `port`, `ship_line`
- [x] Seed dari `fixtures/charge-codes.csv`
- [x] Kolom `charge_codes.kategori` (FIXED | OPSIONAL, R15.5) -- default OPSIONAL untuk kode baru
- [x] ⚠️ **Menunggu Q76** (mana dari 43 kode yang FIXED) sebelum menandai kode historis — default OPSIONAL sudah diberlakukan; penandaan kode historis tetap menunggu Q76 (tidak memblokir slice)
- [x] Import customer & vendor yang sudah dinormalisasi
- [x] CRUD sederhana + RBAC
- [x] Deteksi duplikat nama saat input

---

## Slice 4 — Job + costing ⭐ inti produk

- [ ] Skema `job` + `charge_line`
- [ ] Form buat job (validasi kombinasi leg, R10)
- [ ] Editor charge line: selling & buying, cepat dengan keyboard
- [ ] Konversi USD memakai kurs per job (R8)
- [ ] Validasi at-cost: selling == buying (R4.3)
- [ ] Hitung GP & GP% otomatis (R4.1)
- [ ] **Realokasi biaya antar job** (R5.3, ADR-0006 Opsi B): tabel `cost_reallocations`, wajib alasan + approval manajer (≠ pembuat) sebelum berlaku
- [ ] Tampilkan GP asli vs GP setelah realokasi berdampingan per job
- [ ] Test: realokasi ke job asalnya sendiri (`origin_job_id = destination_job_id`) harus ditolak
- [ ] Kolom pencadangan / actual / selisih (R5.1)
- [ ] **`tests/golden/reconcile-jobs.test.ts` — 75 job, selisih Rp 0**

**Selesai bila:** golden reconciliation hijau. Ini gerbang terpenting di proyek.

---

## Slice 5 — Approval & penguncian

- [ ] Implementasi state machine job
- [ ] Approval L1 & Final, approver ≠ maker
- [ ] Job FINAL menolak semua edit (J-INV-1)
- [ ] Alur unlock + reset penuh via `cycle` (R6.2)
- [ ] **Formalisasi R6.4 (transkrip 2):** tabel `cost_reopen_requests`, wajib unggah `berita_acara_file_url` sebelum diajukan, keputusan wajib Owner (≠ pengaju)
- [ ] ⚠️ **Menunggu Q79** (format berita acara -- bebas atau template baku) sebelum slice ini dianggap selesai
- [ ] Audit log setiap transisi
- [ ] Test authz: setiap `✗` di `RBAC.md` terbukti ditolak
- [ ] Test: pengajuan reopen tanpa `berita_acara_file_url` harus ditolak, berapa pun nilainya (klien: "mau 100 mau sejuta pun tetap harus ada informasi")

---

## Slice 6 — Invoice customer

- [ ] Skema `customer_invoice` + `invoice_line`
- [ ] Blokir bila job belum FINAL atau POD belum diterima (R9.4)
- [ ] Bekukan angka pajak saat issue (I-INV-1)
- [ ] Template PDF: kop, logo, terbilang, rincian pajak
- [ ] Invoice Reimburse terpisah (I-INV-4)
- [ ] Hitung jatuh tempo (R9.1) — **butuh Q07**
- [ ] Uji banding visual dengan 2 invoice asli
- [ ] **Invoice susulan/koreksi** (R16, baru 13 Agu 2026): tabel `customer_invoice_addendum`, nomor tercetak identik dengan invoice asal + label pembeda wajib, alasan wajib, approval Manager/Owner sebelum berlaku
- [ ] ⚠️ **Menunggu Q69** (pajak atas selisih) sebelum slice ini dianggap selesai -- kode boleh dibangun dengan default (kena pajak), tapi test akhir butuh konfirmasi Niken
- [ ] Test: dua addendum berurutan pada satu invoice asal (addendum_seq 1 dan 2) tidak saling bentrok

---

## Slice 7 — Invoice vendor & anti dobel bayar

> ✅ **SERVICE SELESAI 17 Agu 2026** (branch `iris7-invoice-vendor`) — tabel
> sudah ada sejak migrasi 0000; Irisan 7 menambah migrasi 0007 (kolom jejak
> `diterima_oleh/diverifikasi_oleh/diverifikasi_at` + `UNIQUE(charge_line_id)`
> junction, D5), modul `src/lib/vendor-invoice/` (receive/verify/pay/batal/
> unlock_paid sesuai keputusan D1–D9), guard D7/V-INV-4 di charge-line, izin
> `vendor_invoice:verify`, audit RECEIVE/VERIFY/PAY/BATAL_VENDOR, 30 test
> integrasi + unit. Rincian: `docs/HANDOFF-IRISAN-7.md`. **UI ditunda** (tidak
> ada halaman vendor invoice — service-only).

- [x] Skema `vendor_invoice` + `UNIQUE(vendor_id, vendor_invoice_no)`
- [x] Peringatan nomor mirip (kasus 01A/01B) — Levenshtein ≤ 2, warning bukan blokir (V-INV-2)
- [x] Verifikasi → isi `actual` di charge line (V-INV-5; job FINAL diizinkan — D4)
- [x] Status bayar tampil sebelum aksi bayar (R7.2/V-INV-3 — `lihatStatusPembayaran`)
- [x] Tolak pembayaran kedua (V-INV-3/R7.2)
- [x] Kunci charge line setelah PAID (V-INV-4 — guard di updateChargeLine/hapus)
- [x] **Test khusus: skenario 01A/01B harus gagal saat dobel input** (DB-level, 30/30 hijau)

---

## Slice 8 — Laporan & analisis

> Diperluas 13 Agu 2026 atas permintaan klien. Slice ini sekarang **paling besar**
> di seluruh rencana. Kalau terasa terlalu panjang, pecah di garis putus-putus.

**8a — fondasi periode**
- [ ] Komponen pemilih rentang bulan A → bulan B, tersimpan di URL (R14.1)
- [ ] Satu fungsi agregasi dipakai bersama seluruh halaman laporan
- [ ] **Test: rentang Apr–Jul == `GOLDEN_APR_JUL_2026`; rentang Jun–Jun == angka Juni saja**

**8b — rekap dasar**
- [ ] Dashboard GP: bulan × segmen
- [ ] Rekap pembayaran vendor per bulan (R7.3)
- [ ] Rekap PPh 23 & PPN (dihitung, bukan tabel tersimpan)
- [ ] Pencarian job → tampilan lengkap satu halaman

**8c — peringkat multi-sumbu** *(baru)*
- [ ] Tab pendapatan: customer, segmen, sales, rute (R14.2)
- [ ] Tab belanja: vendor, diberi label terpisah
- [ ] Tiap baris: jumlah job, selling, cost, GP, GP%, tanggal pertama & terakhir (R14.3)
- [ ] **Test: mengubah rentang mengubah urutan peringkat**

**8d — drill-down berlapis** *(baru)*
- [ ] peringkat → daftar job → costing → invoice & pembayaran (R14.4)
- [ ] **Test: total di setiap lapisan sama dengan lapisan di atasnya**

**8e — export**
- [ ] Export Excel mengikuti rentang dan sumbu yang sedang aktif

⚠️ **8c dan 8d butuh data per job.** Tidak bisa diisi sebelum `SO BULAN *.xlsx`
diterima (Q41). Rancangan dan test boleh dikerjakan lebih dulu memakai fixtures.

---

## Slice 9 — Migrasi data historis

- [ ] Importer dari `fixtures/golden-jobs.csv`
- [ ] Baris tidak konsisten **ditandai**, bukan diperbaiki diam-diam
- [ ] Laporan hasil import
- [ ] Rekonsiliasi akhir vs `RECONCILIATION-REPORT.md`

---

## Slice 10 — Persiapan go-live

- [ ] Backup otomatis aktif
- [ ] **Restore diuji sungguhan** (AVL-4)
- [ ] User & role dibuat
- [ ] Materi pelatihan singkat
- [ ] Periode paralel: sistem + Excel jalan bersamaan 1 bulan
- [ ] Rekonsiliasi bulan pertama harus Rp 0

---

## Aturan kerja untuk agent

1. **Satu slice, satu branch, satu PR.**
2. Sebelum mulai slice: baca `AGENTS.md`, `CONTEXT.md`, `DOMAIN-RULES.md`,
   dan ADR yang relevan.
3. Test ditulis **sebelum** implementasi untuk semua logika uang.
4. Setiap PR wajib hijau di: `typecheck`, `lint`, `test`, `test:golden`.
5. Menemukan hal tidak jelas → tulis di `OPEN-QUESTIONS.md` → **berhenti**.
6. Dilarang menambah dependency tanpa ADR.
7. Dilarang mengerjakan yang ada di daftar OUT OF SCOPE `PRD.md`.
