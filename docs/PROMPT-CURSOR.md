# PROMPT-CURSOR.md

Seluruh kode aplikasi ISLI Ops ditulis oleh **Cursor**, bukan oleh agent chat.
Berkas ini berisi prompt siap-tempel untuk setiap tahap proyek, sudah diisi
nomor aturan, angka golden, dan definisi selesai yang konkret.

> **Agen utama repo ini sebenarnya Cline** (`.clinerules/`). Kalau kamu pakai
> Cursor, `.cursor/rules/00-pagar-keras.mdc` yang terbaca otomatis. Kalau dua
> sumber bertabrakan, **`.clinerules/` yang menang** -- itu yang lebih lengkap.

---

## Isi

| Bagian | Untuk apa |
|---|---|
| [Cara pakai Cursor di repo ini](#0-cara-pakai-cursor-di-repo-ini) | setelan, mode, disiplin |
| [PROMPT A](#prompt-a--bootstrap-sesi-baru) | buka sesi baru / ganti komputer |
| [PROMPT B](#prompt-b--sinkronkan-aturan-ke-cursor) | salin `.clinerules` jadi rules Cursor |
| [PROMPT 0](#prompt-0--irisan-0-kerangka-berjalan) | Irisan 0 kerangka + auth |
| [PROMPT 1](#prompt-1--irisan-1-fondasi-uang--pajak) | uang & pajak |
| [PROMPT 2](#prompt-2--irisan-2-penomoran) | penomoran job & invoice |
| [PROMPT 3](#prompt-3--irisan-3-master-data) | master data |
| [PROMPT 4](#prompt-4--irisan-4-job--costing-inti-produk) | job + costing (inti) |
| [PROMPT 5](#prompt-5--irisan-5-approval--penguncian) | approval & gembok |
| [PROMPT 6](#prompt-6--irisan-6-invoice-customer) | invoice customer |
| [PROMPT 7](#prompt-7--irisan-7-invoice-vendor--anti-dobel-bayar) | invoice vendor |
| [PROMPT 8](#prompt-8--irisan-8-laporan--analisis) | laporan (8a-8e) |
| [PROMPT 9](#prompt-9--irisan-9-migrasi-data-historis) | migrasi historis |
| [PROMPT 10](#prompt-10--irisan-10-persiapan-go-live) | go-live |
| [PROMPT R1-R10](#prompt-r1--review-rencana-sebelum-kode-ditulis) | review, debug, migrasi, eskalasi |
| [Kalimat terlarang](#kalimat-yang-tidak-boleh-kamu-tulis-ke-cursor) | anti-pola |
| [Tanda Cursor ngawur](#tanda-cursor-mulai-ngawur--hentikan) | rem darurat |
| [Peta blocker](#peta-blocker-irisan--pertanyaan-terbuka) | irisan vs pertanyaan |
| [Checklist PR](#checklist-sebelum-merge) | gerbang merge |

---

## 0. Cara pakai Cursor di repo ini

**Setelan yang wajib:**

1. **Plan mode / Ask dulu, Agent mode belakangan.** Semua prompt di bawah
   dimulai dengan minta rencana. Baru setelah rencananya kamu baca dan setuju,
   ketik `lanjut, kerjakan rencana itu`.
2. **Matikan auto-run / YOLO mode.** Repo ini punya perintah berbahaya
   (`db:push` sudah diblokir, tapi migrasi tetap bisa merusak data).
3. **Satu irisan, satu branch, satu PR.** `git switch -c slice-4-costing`.
   Jangan pernah dua irisan dalam satu percakapan.
4. **Checkpoint tiap file selesai.** Kalau Cursor mulai menyimpang, `Restore
   checkpoint` jauh lebih murah daripada membetulkan hasil ngawur.
5. **`@`-mention berkas yang relevan** di setiap prompt. Cursor tidak akan
   membaca 25 dokumen sendiri. Prompt di bawah sudah menyebut berkasnya --
   tambahkan `@` di depannya saat menempel.
6. **Model:** pakai model penalaran terkuat yang kamu punya untuk Irisan 1, 4,
   5, dan 6 (uang, pajak, state machine). Irisan 3 dan 8e boleh model cepat.
7. **Konteks panjang bukan teman.** Kalau percakapan sudah lewat ~30 balasan,
   buka percakapan baru dan tempel PROMPT A lagi.

**Yang tidak boleh kamu lakukan:**

- Jangan minta Cursor mengubah `.clinerules/`, `.cursor/rules/`, `fixtures/`,
  atau `docs/DOMAIN-RULES.md`. Itu sumber kebenaran, bukan bahan negosiasi.
- Jangan minta "bikinin sistem ISLI". Hasilnya pasti ngarang.
- Jangan pernah menerima jawaban "sudah saya sesuaikan test-nya supaya hijau".

**Perintah verifikasi yang berlaku di repo ini:**

```
pnpm install
pnpm typecheck     # tsc --noEmit
pnpm lint          # biome check .
pnpm test          # vitest, kecuali *.golden.test.ts
pnpm test:golden   # vitest run tests/golden
pnpm test:e2e      # playwright
pnpm verify        # keempatnya sekaligus -- ini gerbang PR
pnpm db:generate   # bikin SQL migrasi
pnpm db:migrate    # jalankan migrasi
pnpm db:seed       # isi data contoh
pnpm db:push       # DILARANG, sudah diblokir di package.json
```

---

## PROMPT A -- bootstrap sesi baru

Tempel ini **setiap kali** buka percakapan baru di Cursor. Jangan langsung
minta fitur.

```
Jangan tulis kode apa pun di balasan ini. Ini orientasi.

Baca berkas berikut, seluruhnya:
@AGENTS.md
@.cursor/rules/00-pagar-keras.mdc
@.clinerules/00-guardrails.md
@.clinerules/03-money-and-tax.md
@.clinerules/04-testing.md
@.clinerules/06-db-migrations.md
@docs/CONTEXT.md
@docs/ARCHITECTURE.md
@docs/DOMAIN-RULES.md
@docs/ERD.md
@docs/STATE-MACHINE.md
@docs/RBAC.md
@docs/BUILD-PLAN.md
@docs/OPEN-QUESTIONS.md
@docs/DESIGN-SYSTEM.md

Lalu jawab singkat, satu per satu:

A. Uang disimpan dalam tipe apa, satuan apa, dan fungsi apa yang WAJIB dipakai
   untuk menghitung pajak?
B. Berapa PPN_RATE_BP dan PPH23_RATE_BP, dan pembulatannya ke arah mana?
C. Apa yang terjadi kalau golden test merah? Apa yang DILARANG kamu lakukan?
D. Bagaimana cara benar mengubah skema database di repo ini? Perintah mana yang
   diblokir dan kenapa?
E. Bagaimana cara benar memeriksa izin? Tulis contoh kode satu baris.
F. Irisan mana yang sedang aktif menurut docs/BUILD-PLAN.md, dan pertanyaan
   terbuka mana yang memblokirnya?
G. Sebutkan 3 hal yang kalau kamu lakukan berarti kamu melanggar pagar keras.

Kalau ada jawaban yang tidak kamu temukan di berkas, bilang "tidak ketemu" --
jangan menebak. Setelah itu berhenti dan tunggu instruksi saya.
```

Kalau ada satu saja jawaban yang salah, **jangan lanjut ke prompt irisan.**
Suruh dia baca ulang berkas yang bersangkutan.

---

## PROMPT B -- sinkronkan aturan ke Cursor

Sekali saja, kalau kamu memutuskan Cursor jadi agen utama (bukan Cline).

```
Plan mode.

Repo ini menyimpan aturan agen di dua tempat:
- .clinerules/*.md  -> lengkap, untuk Cline
- .cursor/rules/00-pagar-keras.mdc -> ringkas, untuk Cursor

Tugas: pecah isi .clinerules/ menjadi berkas .cursor/rules/*.mdc yang setara,
supaya Cursor memuat aturan yang sama lengkapnya.

WAJIB
- Satu berkas .mdc per topik, dengan frontmatter description + alwaysApply.
- ISI ATURAN DISALIN APA ADANYA. Kamu penyalin, bukan penyunting.
  Tidak boleh meringkas, melunakkan, atau "memperbaiki" satu kalimat pun.
- Berkas .clinerules/ TIDAK BOLEH diubah, dihapus, atau dipindah.
- Pertahankan catatan bahwa kalau bertabrakan, .clinerules/ yang menang.

SELESAI KALAU
- Setiap larangan di .clinerules/ punya padanan di .cursor/rules/
- Tunjukkan tabel pemetaan: berkas .clinerules -> berkas .mdc

Tunjukkan rencananya dulu.
```

---

## PROMPT 0 -- Irisan 0: kerangka berjalan

Sasaran: satu alur tipis tembus dari layar sampai database, plus login.
Belum ada fitur bisnis apa pun.

```
Plan mode. Jangan tulis kode sebelum saya bilang lanjut.

Baca berurutan:
@AGENTS.md
@docs/ARCHITECTURE.md (struktur folder & bagian auth)
@docs/BUILD-PLAN.md (Slice 0)
@docs/RBAC.md
@.cursor/rules/00-pagar-keras.mdc
@src/db/schema/index.ts
@src/lib/authz/index.ts
@src/app/page.tsx
@scripts/seed.ts
@.env.example

KERJAKAN: Slice 0 dari docs/BUILD-PLAN.md.

Yang SUDAH ADA di repo (jangan dibuat ulang, jangan ditimpa):
- Next.js App Router + TypeScript strict, tailwind, biome, vitest, playwright,
  drizzle.config.ts, .github workflow, husky
- src/db/schema/index.ts termasuk tabel `users` (email, nama, role, aktif)
- src/lib/authz/index.ts -> can() / assertCan()
- src/lib/money, src/lib/tax, src/lib/costing, src/lib/job-number
- src/app/page.tsx -> daftar job read-only dari Postgres
- scripts/seed.ts -> 4 user: indra(OWNER), niken(MANAGER), fairol(STAFF),
  lana(STAFF)

Yang BELUM ADA dan harus kamu buat:
1. Login & logout dengan Supabase Auth (@supabase/ssr). Email + password.
   Tidak ada pendaftaran sendiri, tidak ada magic link, tidak ada OAuth.
   Catatan: login Google Workspace masih pertanyaan terbuka (Q59) -- jangan
   dibangun sekarang.
2. Jembatan sesi -> peran: sesi Supabase Auth dicocokkan ke baris tabel `users`
   LEWAT EMAIL. Sediakan getCurrentUser() dan requireUser() yang mengembalikan
   { id, email, nama, role }. requireUser() redirect ke /login kalau tidak ada
   sesi, dan MENOLAK user dengan aktif = false.
3. middleware.ts di root: semua rute wajib sesi, kecuali /login dan aset statis.
4. Halaman daftar job wajib login. Tampilkan nama + peran user yang masuk, dan
   tombol keluar.
5. Perbarui .env.example kalau ada env var baru yang benar-benar dibutuhkan.
6. Satu test Playwright: buka halaman utama tanpa sesi -> mendarat di /login.

WAJIB
- Izin per-aksi tetap lewat can()/assertCan() dari src/lib/authz/index.ts.
  Middleware hanya menjawab "sudah login atau belum" -- BUKAN RBAC per aksi.
- Kredensial salah menampilkan pesan Indonesia yang tidak membocorkan apakah
  email itu terdaftar.
- Warna & tipografi hanya token docs/DESIGN-SYSTEM.md. Tidak ada bg-blue-500,
  tidak ada shadow, tidak ada gradien, tidak ada emoji sebagai ikon.
- Baris `users` yang aktif = false tidak boleh bisa masuk.

DILARANG
- Jangan bikin modul invoice, approval, laporan, atau CRUD master data.
- Jangan bikin tabel baru. Skema sudah final di docs/ERD.md.
- Jangan pakai any, @ts-ignore, atau non-null assertion (!) pada hasil query.
- Jangan menaruh perhitungan uang di komponen React.
- Jangan menambah dependency baru tanpa ADR (dan @supabase/ssr sudah ada).
- Jangan mempercantik UI. Fungsional dulu.

SELESAI KALAU
- pnpm install && pnpm verify hijau seluruhnya
- Login dengan indra@isli.co.id berhasil, halaman job tampil, nama + peran
  terlihat, tombol keluar bekerja, kembali ke /login
- Membuka halaman job tanpa sesi -> redirect /login
- Akun yang ada di tabel users tapi aktif = false ditolak
- pnpm test:e2e hijau

CATATAN PENTING soal akun: seed hanya mengisi tabel `users` (peran). Supaya
bisa benar-benar login, akun Supabase Auth dengan email yang sama persis harus
ada. Tuliskan langkah pembuatannya di README atau scripts/, jangan diam-diam.

Tunjukkan rencananya dulu: daftar berkas yang akan dibuat/diubah, dan
keputusan teknis yang kamu ambil. Jangan tulis kode sebelum saya bilang lanjut.
```

---


---

## PROMPT 1 -- Irisan 1: fondasi uang & pajak

Irisan paling menentukan benar-salahnya seluruh sistem. Pakai model penalaran
terkuat. Tidak ada UI di sini sama sekali.

```
Plan mode. Jangan tulis kode sebelum saya bilang lanjut.

Baca:
@docs/DOMAIN-RULES.md -> R3.1, R3.2, R3.3, R3.4, R3.5, R3.6, R3.7, R4.1, R4.2, R4.3
@docs/adr/0002-uang-integer-rupiah.md
@docs/adr/0007-definisi-gp-dan-ppn.md
@.clinerules/03-money-and-tax.md
@src/lib/money/index.ts
@src/lib/tax/index.ts
@src/lib/costing/index.ts
@tests/golden/invoice-tax.golden.test.ts
@tests/golden/job-costing.golden.test.ts
@fixtures/README.md

KERJAKAN Irisan 1: lengkapi dan buktikan fondasi uang & pajak.

Cakupan:
1. src/lib/money -- rupiah BIGINT bulat: tambah, kurang, applyRateBp(base, bp),
   pembulatan KE ATAS (ceiling) sesuai R3.6, formatIdr(), fromDb()/toDb().
2. src/lib/tax -- ppn (PPN_RATE_BP = 110 atas DPP, R3.1),
   dpp (baris reimburse DIKELUARKAN dari DPP, R3.2),
   pph23 (PPH23_RATE_BP = 200, default TIDAK aktif, R3.5),
   grand total sesuai rumus R3.3.
3. src/lib/terbilang -- angka rupiah ke huruf Indonesia: nol, belasan, ribuan
   bertingkat, jutaan, dan akhiran "rupiah".
4. src/lib/costing -- GP dan NETT sebagai DUA metrik terpisah (R4.2 + ADR-0007):
   GP = selling sebelum pajak - cost. NETT = selling setelah pajak - cost.
   Validasi at-cost: baris reimburse WAJIB selling == buying (R4.3).

ATURAN YANG MENGIKAT (jangan ditafsir ulang)
- Tidak ada float. Tidak ada desimal. Tidak ada Number untuk uang.
- Semua pajak lewat applyRateBp(base, bp). Jangan pernah base * 0.011.
- pph23Applicable selalu eksplisit per invoice/job. JANGAN pernah disimpulkan
  dari data lain (nama customer, besar nilai, dsb) -- itu centang manual.
- Pembulatan ke ATAS. Kalau ada tempat yang tidak bisa ceiling, tulis alasannya
  di komentar dan laporkan ke saya.
- Reimburse/at-cost tidak kena PPN dan keluar dari DPP.

TEST WAJIB (tulis test SEBELUM implementasi)
- Golden invoice Materee -> grand total HARUS 23.848.600
- Golden invoice Diametral -> grand total HARUS 131.429.434
- Golden costing per job cocok, tanpa toleransi
- terbilang: minimal 12 kasus, termasuk 0, 11, 111, 1.000.000, 23.848.600
- properti: applyRateBp tidak pernah menghasilkan desimal

DILARANG
- Mengubah angka apa pun di fixtures/. Selamanya.
- toBeCloseTo, epsilon, it.skip, it.todo, melunakkan nilai harapan.
- Menyentuh src/app/** atau membuat UI apa pun di irisan ini.
- Menambah dependency uang (dinero.js, big.js, decimal.js) tanpa ADR baru.

SELESAI KALAU
- pnpm test:golden hijau SELURUHNYA
- pnpm verify hijau
- Kamu bisa menjelaskan baris per baris dari mana angka 23.848.600 muncul

CATATAN soal selisih Rp 1 pada Diametral: dulu dibiarkan merah karena aturan
pembulatan belum diketahui. Q05 SUDAH DIJAWAB 13 Agu 2026 -- pembulatan KE ATAS.
Jadi selisih itu seharusnya HILANG sekarang. Kalau masih meleset Rp 1, itu bug
pembulatan di kode kita. JANGAN tutup dengan toleransi. Telusuri.

Tunjukkan rencananya dulu, termasuk daftar test yang akan kamu tulis.
```

---

## PROMPT 2 -- Irisan 2: penomoran

```
Plan mode. Jangan tulis kode sebelum saya bilang lanjut.

Baca:
@docs/DOMAIN-RULES.md -> R1.1, R1.2, R1.3, R1.4, R1.5, R2.1, R2.2, R2.3, R2.4
@docs/ERD.md -> tabel job_sequence
@src/lib/job-number/index.ts
@tests/unit/job-number.test.ts
@.clinerules/06-db-migrations.md

KERJAKAN Irisan 2: penomoran job & invoice.

Cakupan:
1. Nomor job format ISLI-YY.MM-NNN (R1.1).
2. job_sequence dengan 3 scope TERPISAH: DOM, EXP, IMP (R1.2).
   Reset BULANAN, per scope (R1.3, jawaban Q11).
3. Alokasi nomor pakai row lock di dalam transaksi (SELECT ... FOR UPDATE atau
   UPSERT yang benar-benar serial). DILARANG MAX(nomor)+1 tanpa lock.
4. Nomor invoice: INVDOM / INVEXP / INVIMP, bulan ROMAWI, counter terpisah per
   tipe, reset bulanan (R2.1, R2.3, R2.4, jawaban Q12).
5. Bulan Romawi = bulan INVOICE, bukan bulan job (R2.2). Ini sering salah --
   test khusus: job Juli yang di-invoice Agustus -> VIII.

TEST WAJIB
- Konkurensi: 50 permintaan bersamaan pada scope sama -> 50 nomor unik, 0 duplikat
- Regresi: ISLI-26.05-001 DOM dan ISLI-26.05-001 EXP boleh hidup bersamaan
- Ganti bulan -> kembali ke 001. Ganti tahun -> YY ikut berubah.
- Romawi I..XII, dan kasus bulan invoice != bulan job

DILARANG
- Mengambil nomor di luar transaksi
- Menyimpan nomor terpakai di memori aplikasi
- UUID atau timestamp sebagai pengganti counter
- Mengarang aturan untuk job yang dibatalkan -- itu Q16, BELUM DIJAWAB.
  Kalau desainmu terbentur ke sana, BERHENTI dan tanya saya.

SELESAI KALAU
- Test konkurensi 50 paralel hijau, dijalankan 3 kali berturut-turut
- pnpm verify hijau

Tunjukkan rencananya dulu, khususnya mekanisme lock yang kamu pilih dan alasannya.
```

---

## PROMPT 3 -- Irisan 3: master data

```
Plan mode. Jangan tulis kode sebelum saya bilang lanjut.

Baca:
@docs/ERD.md -> Master data, charge_code
@docs/DOMAIN-RULES.md -> R15.1, R15.2, R15.3, R15.4, R15.5
@docs/RBAC.md
@fixtures/charge-codes.csv
@fixtures/customers-raw.csv
@fixtures/vendors-raw.csv
@fixtures/README.md
@.clinerules/06-db-migrations.md

KERJAKAN Irisan 3: master data.

Cakupan:
1. Skema + migrasi: customer, vendor, charge_code, port, ship_line sesuai
   docs/ERD.md. Jangan menambah kolom yang tidak ada di sana.
2. charge_codes.kategori: FIXED | OPSIONAL (R15.5). Default kode baru OPSIONAL.
3. charge_codes.butuh_vendor (R15.3) sebagai VALIDASI aplikasi, bukan CHECK
   constraint database (R15.4).
4. Seed charge code dari fixtures/charge-codes.csv.
5. Import customer & vendor -- hanya baris yang SUDAH dinormalisasi.
6. CRUD + RBAC: masterdata.edit hanya OWNER & MANAGER.
7. Deteksi duplikat nama: peringatan kemiripan, bukan penolakan otomatis
   (kasus MATEREE / MATEREE NUSANTARA / PT. MATEREE NUSANTARA UTAMA).
8. Soft delete. Tidak ada hapus permanen -- kewajiban simpan 10 tahun.

DILARANG MUTLAK
- Jangan mengisi kolom _TODO di fixtures/. Jangan menebak NPWP.
- Jangan menebak pph23_applicable untuk customer mana pun.
- Jangan menandai satu pun kode biaya sebagai FIXED. Daftar lengkapnya Q76,
  BELUM DIJAWAB. Semua masuk OPSIONAL sampai Bu Niken menjawab. Meskipun kamu
  merasa "jelas Ocean Freight itu FIXED" -- tetap jangan.
- Jangan menormalisasi nama customer/vendor otomatis (Q25 belum dijawab).
  Tandai kandidat duplikat, manusia yang memutuskan.
- drizzle-kit push dilarang. db:generate -> baca SQL -> db:migrate.

SELESAI KALAU
- Migrasi jalan bersih di database kosong dan aman kalau diulang
- pnpm db:seed mengisi 43 kode biaya, semuanya OPSIONAL
- STAFF ditolak saat mengubah master data, dibuktikan test
- pnpm verify hijau

Tunjukkan rencananya dulu, termasuk SQL migrasi yang akan dihasilkan.
```
## PROMPT 4 -- Irisan 4: job + costing (inti produk)

Ini gerbang terpenting di seluruh proyek. Kalau irisan ini salah, semua
laporan dan semua invoice ikut salah. Pakai model terkuat, kerjakan pelan.

```
Plan mode. Jangan tulis kode sebelum saya bilang lanjut.

Baca:
@docs/DOMAIN-RULES.md -> R4.1, R4.2, R4.3, R5.1, R5.2, R5.3, R8.1, R8.2, R10 (matriks leg lengkap), R11, R15
@docs/ERD.md -> job, charge_line, cost_reallocations
@docs/adr/0006-pemindahan-biaya-antar-job.md
@docs/adr/0007-definisi-gp-dan-ppn.md
@docs/RBAC.md
@docs/DESIGN-SYSTEM.md
@src/lib/costing/index.ts
@src/lib/money/index.ts
@fixtures/golden-jobs.csv
@fixtures/golden-job-reimburse.csv
@tests/golden/job-costing.golden.test.ts

KERJAKAN Irisan 4: job + costing.

Cakupan:
1. Skema + migrasi job dan charge_line sesuai docs/ERD.md.
2. Form buat job. Validasi kombinasi leg sesuai matriks R10:
   - EXPORT & IMPORT: kombinasi di luar matriks DITOLAK KERAS.
   - DOMESTIK: di luar default 1+2+3 DIIZINKAN, tapi wajib mengisi
     leg_override_alasan. Dua tingkat penegakan ini JANGAN dicampur (R10).
3. Editor charge line: selling & buying berdampingan, cepat dengan keyboard
   (Enter = baris baru, Tab antar kolom, tanpa mouse untuk input massal).
4. Kurs USD disimpan PER JOB (R8.1), konversi memakai kurs job itu (R8.2).
   Sumber kurs adalah Q15, belum dijawab -- kurs diinput manual, jangan panggil
   API kurs apa pun.
5. Validasi at-cost: baris reimburse selling == buying (R4.3), ditolak kalau tidak.
6. Pencadangan / actual / selisih per charge line (R5.1).
7. GP dan GP% otomatis (R4.1/R4.2), plus NETT terpisah.
8. Realokasi biaya antar job (R5.3, ADR-0006 Opsi B):
   - tabel cost_reallocations
   - alasan tertulis WAJIB
   - approval MANAJER yang BUKAN pembuat, sebelum berlaku
   - jejak audit penuh
   - GP asli dan GP setelah realokasi ditampilkan BERDAMPINGAN per job
   - realokasi ke job asalnya sendiri (origin_job_id = destination_job_id) DITOLAK
9. Job non-shipment (R11): boleh ada, GP bisa 0.

ATURAN YANG MENGIKAT
- Semua uang BIGINT rupiah bulat. Tidak ada perhitungan uang di komponen React --
  komponen hanya memformat. Kalau butuh hitung di sana, berarti ada fungsi
  server yang belum dibuat.
- Semua angka tabular-nums, rata kanan, toLocaleString("id-ID").
- Margin (GP/NETT) BOLEH dilihat semua peran -- R-A6 sudah DICABUT 13 Agu 2026.
- Soft delete saja. Tidak ada DELETE.
- Setiap perubahan yang berdampak angka menulis audit_log (append-only).

TEST WAJIB
- tests/golden/reconcile-jobs: 75 job dari fixtures, selisih Rp 0. Bukan
  "mendekati nol". NOL.
- Matriks leg: satu test per kombinasi sah dan per kombinasi tidak sah.
- Domestik di luar default tanpa alasan -> ditolak; dengan alasan -> diterima.
- Realokasi: ke diri sendiri ditolak; tanpa alasan ditolak; disetujui oleh
  pembuatnya sendiri ditolak; jumlah biaya total dua job sebelum dan sesudah
  realokasi TETAP SAMA.
- At-cost: selling != buying ditolak.
- Konversi USD: pembulatan ke atas, hasil integer.

DILARANG
- Jangan sentuh invoice, approval state machine, atau laporan. Bukan irisan ini.
- Jangan mengubah fixtures. Jangan melunakkan test.
- Jangan memakai float sekalipun untuk GP%.  Simpan basis point atau hitung saat tampil.
- Kalau ada baris di fixtures/golden-jobs.csv yang tidak konsisten, TANDAI dan
  laporkan ke saya. Jangan perbaiki diam-diam.

SELESAI KALAU
- tests/golden/reconcile-jobs hijau dengan selisih Rp 0
- pnpm verify hijau
- Kamu bisa menunjukkan satu job contoh: selling, cost, GP, GP%, NETT, dan
  jelaskan tiap angkanya dari mana

Tunjukkan rencananya dulu. Sebutkan juga bagian mana dari rencana ini yang
paling mungkin salah, dan bagaimana test-nya akan menangkap kesalahan itu.
```

---

## PROMPT 5 -- Irisan 5: approval & penguncian

```
Plan mode. Jangan tulis kode sebelum saya bilang lanjut.

Baca:
@docs/STATE-MACHINE.md -> bagian 1 (Job), seluruh tabel transisi + invariant J-INV-1..6
@docs/DOMAIN-RULES.md -> R6.1, R6.2, R6.3, R6.4
@docs/RBAC.md -> matriks izin lengkap + R-A1
@docs/ERD.md -> approval, audit_log, cost_reopen_request
@docs/adr/0004-authz-terpusat.md
@src/lib/authz/index.ts
@tests/unit/authz.test.ts

KERJAKAN Irisan 5: state machine approval & penguncian.

Cakupan:
1. State machine job PERSIS seperti tabel di docs/STATE-MACHINE.md:
   DRAFT -> SUBMITTED -> APPROVED_L1 -> FINAL, plus CANCELLED,
   UNLOCK_REQUESTED. Tidak ada status tambahan yang kamu karang.
2. Approval L1 (MANAGER) dan Final (OWNER). Approver != maker (J-INV-5, R-A1).
3. J-INV-1: job FINAL menolak SEMUA perubahan charge line, header, dan kurs.
4. J-INV-2: unlock SELALU kembali ke DRAFT, tidak pernah ke APPROVED_L1, dan
   MERESET seluruh approval ke nol (R6.2) lewat mekanisme cycle.
5. J-INV-3: job yang invoice-nya sudah ISSUED tidak boleh di-unlock.
   J-INV-4: job yang invoice-nya PAID tidak boleh di-unlock sama sekali (R6.3).
6. Buka gembok biaya (R6.4, formalisasi transkrip 2): tabel cost_reopen_requests,
   WAJIB unggah berita_acara_file_url sebelum pengajuan bisa dikirim, keputusan
   WAJIB Owner dan Owner itu bukan pengaju.
7. J-INV-6: setiap transisi menulis satu baris audit_log berisi aktor, status
   lama, status baru, alasan, timestamp. audit_log append-only.

TEST WAJIB
- Setiap tanda X di matriks docs/RBAC.md punya test yang membuktikan penolakan.
  Tidak ada pengecualian. Kalau ada 12 X, ada minimal 12 test.
- Maker mencoba approve pekerjaannya sendiri -> ditolak di L1 DAN di Final.
- FINAL lalu coba edit charge line -> ditolak.
- Unlock -> status DRAFT dan semua approval hilang, cycle bertambah.
- Unlock pada job dengan invoice ISSUED -> ditolak. Dengan invoice PAID -> ditolak.
- Pengajuan reopen TANPA berita_acara_file_url -> DITOLAK, berapa pun nilainya.
  Kata klien: "mau 100 mau sejuta pun tetap harus ada informasi". Tulis test
  dengan nilai Rp 100 supaya niat itu terekam.
- Reopen diputuskan oleh pengajunya sendiri -> ditolak.
- audit_log: coba UPDATE dan DELETE -> harus gagal.

DILARANG
- Jangan pernah membandingkan role === "OWNER". Selalu assertCan(...).
- Jangan menambah transisi, status, atau jalan pintas yang tidak ada di
  docs/STATE-MACHINE.md.
- Jangan bikin "mode admin" atau bypass apa pun.
- Format berita acara adalah Q79 dan BELUM DIJAWAB. Terima berkas apa pun
  (PDF/JPG/PNG) untuk sekarang, JANGAN memaksakan template. Catat di
  docs/OPEN-QUESTIONS.md bahwa validasi format menunggu Q79.
- Q56 (kalau MANAGER yang bikin job, siapa approval 1) dan Q57 (Pak Indra cuti,
  siapa approval final) BELUM DIJAWAB. Jangan mengarang delegasi otomatis.
  Kalau desainmu terbentur ke sana, BERHENTI dan tanya saya.

SELESAI KALAU
- Semua X di RBAC.md terbukti ditolak lewat test
- Semua invariant J-INV-1..6 punya test
- pnpm verify hijau

Tunjukkan rencananya dulu, dalam bentuk tabel transisi yang akan kamu
implementasikan, supaya saya bisa membandingkan dengan docs/STATE-MACHINE.md
baris per baris.
```

---

## PROMPT 6 -- Irisan 6: invoice customer

```
Plan mode. Jangan tulis kode sebelum saya bilang lanjut.

Baca:
@docs/STATE-MACHINE.md -> bagian 2 (Customer Invoice) + invariant I-INV-1..5
@docs/DOMAIN-RULES.md -> R2.1, R2.2, R3.1, R3.2, R3.3, R9.1, R9.2, R9.4, R9.4b, R12, R16 (seluruhnya)
@docs/ERD.md -> customer_invoice, invoice_line, customer_invoice_addendum
@docs/adr/0005-pdf-invoice-server-side.md
@docs/IDENTITAS-ISLI.md
@docs/DESIGN-SYSTEM.md
@skills/isli-invoice-render
@src/lib/tax/index.ts

KERJAKAN Irisan 6: invoice customer.

Cakupan:
1. Skema + migrasi customer_invoice, invoice_line, customer_invoice_addendum.
2. Prasyarat penerbitan (R9.4): job harus FINAL DAN POD sudah diterima.
   Pengecualian R9.4b: boleh terbit sebelum POD kalau ada approval khusus --
   simpan issued_before_pod + early_issue_approved_by. Ini TIDAK melonggarkan
   R9.4 secara umum: jalur normal tetap wajib POD.
3. I-INV-1: saat issue, angka pajak DIBEKUKAN. Perubahan aturan pajak di masa
   depan tidak boleh mengubah invoice lama. Simpan nilai, bukan hitung ulang.
4. I-INV-2: nomor invoice yang dibatalkan TIDAK PERNAH dipakai ulang.
5. I-INV-3: PAID terminal. Tidak ada jalan kembali.
6. I-INV-4: baris at-cost menghasilkan Invoice Reimburse TERPISAH tanpa PPN.
7. I-INV-5: OVERDUE adalah turunan dari tanggal, BUKAN kolom status. Jangan
   disimpan sebagai state.
8. Jatuh tempo: DIINPUT MANUAL oleh tim ISLI saat invoice dibuat. Tidak ada
   rumus otomatis (jawaban Q07 & Q08, 13 Agu 2026). Jangan bikin kalkulator TOP.
9. PDF server-side (ADR-0005): kop, logo, terbilang, rincian pajak, sesuai
   identitas ISLI. Kalau NPWP/alamat belum lengkap di docs/IDENTITAS-ISLI.md,
   ambil dari pengaturan -- JANGAN hardcode dan JANGAN menebak.
10. Invoice susulan/koreksi (R16): tabel customer_invoice_addendum, nomor
    tercetak IDENTIK dengan invoice asal + label pembeda wajib, alasan wajib,
    approval sebelum berlaku, addendum_seq berurutan.

TEST WAJIB
- Job belum FINAL -> issue ditolak. POD belum ada -> ditolak, kecuali jalur
  R9.4b dengan approver terisi.
- Angka pajak invoice ISSUED tidak berubah walau tarif di kode diubah.
- Nomor invoice yang dibatalkan tidak muncul lagi untuk invoice berikutnya.
- Baris at-cost -> Invoice Reimburse terpisah, PPN nol.
- OVERDUE dihitung dari tanggal, tidak ada kolom status OVERDUE di skema.
- Dua addendum berurutan pada satu invoice asal (seq 1 dan 2) tidak bentrok.
- Addendum tanpa alasan -> ditolak. Tanpa approval -> tidak berlaku.
- PDF: uji banding visual dengan 2 invoice asli klien.

BLOCKER YANG HARUS KAMU HORMATI
- Q69 BELUM DIJAWAB: apakah selisih invoice susulan kena PPN/PPh lagi.
  Default sistem: KENA, dihitung sebagai transaksi pajak baru yang berdiri
  sendiri. Bangun dengan default itu, tapi TARUH di satu tempat yang mudah
  diubah, dan tandai dengan komentar "menunggu Q69". Jangan sebar asumsinya
  ke banyak berkas.
- Q70 (approval addendum: Manager saja atau sampai Owner) dan Q71 (label
  "SUSULAN-1" terlihat customer atau internal) BELUM DIJAWAB. Pakai yang paling
  ketat: approval sampai Owner, label TERCETAK. Tandai keduanya di komentar.
- Q78 (siapa boleh approve invoice sebelum POD) BELUM DIJAWAB. Pakai OWNER
  sementara, tandai.

DILARANG
- Jangan menghitung ulang pajak invoice yang sudah ISSUED, dalam keadaan apa pun.
- Jangan bikin credit note. Itu Phase 2, di luar scope.
- Jangan hardcode NPWP, alamat, atau nomor rekening ISLI di kode.
- Jangan pakai float untuk pajak.

SELESAI KALAU
- pnpm verify hijau
- PDF invoice contoh cocok dengan invoice asli klien, termasuk terbilang
- Semua invariant I-INV-1..5 punya test

Tunjukkan rencananya dulu, plus daftar tempat di mana asumsi Q69/Q70/Q71/Q78
kamu taruh, supaya mudah dicabut nanti.
```

---

## PROMPT 7 -- Irisan 7: invoice vendor & anti dobel bayar

```
Plan mode. Jangan tulis kode sebelum saya bilang lanjut.

Baca:
@docs/STATE-MACHINE.md -> bagian 3 (Vendor Invoice) + invariant V-INV-*
@docs/DOMAIN-RULES.md -> R7.1, R7.2, R7.3, R5.1, R17 (seluruhnya)
@docs/ERD.md -> vendor_invoice, vendor_invoice_addendum
@docs/RBAC.md

KERJAKAN Irisan 7: invoice vendor & pencegahan dobel bayar.

Cakupan:
1. Skema + migrasi vendor_invoice dengan UNIQUE(vendor_id, vendor_invoice_no) (R7.1).
2. Peringatan nomor mirip: kasus nyata klien 01A vs 01B -- nomor beda tipis,
   tagihan sama, hampir dibayar dua kali. Tampilkan peringatan berdasarkan
   kemiripan nomor + vendor + nilai, sebelum simpan.
3. Verifikasi invoice vendor -> mengisi kolom actual di charge line (R5.1).
4. Status bayar WAJIB terlihat sebelum tombol bayar bisa ditekan (R7.2).
5. V-INV-3: pembayaran kedua atas invoice yang sama DITOLAK.
6. V-INV-4: charge line terkunci setelah invoice vendor PAID.
7. Rekap pembayaran per vendor per bulan (R7.3).
8. Addendum invoice vendor (R17): tabel vendor_invoice_addendum, nomor sama
   dipecah antar bulan, kuota belum dibayar dijaga supaya total addendum tidak
   melebihi nilai invoice asal (R17.3).

TEST WAJIB
- Skenario 01A/01B: input kedua HARUS gagal atau minimal terhalang peringatan
  keras. Tulis test dengan data mirip aslinya.
- Nomor vendor invoice sama untuk vendor sama -> ditolak database.
- Nomor sama untuk vendor BERBEDA -> boleh.
- Bayar dua kali -> ditolak.
- Edit charge line setelah PAID -> ditolak.
- Total addendum > nilai invoice asal -> ditolak (R17.3).

BLOCKER
- Q77 BELUM DIJAWAB: level approval addendum vendor. Pakai yang paling ketat
  (Manager/Owner, != pembuat) dan tandai dengan komentar "menunggu Q77".

DILARANG
- Jangan mengandalkan validasi UI saja untuk keunikan nomor. Constraint database
  wajib ada.
- Jangan menormalisasi nomor invoice vendor otomatis (menghapus spasi, huruf
  besar-kecil) tanpa menyimpan nomor aslinya apa adanya.
- Jangan menyentuh state machine job.

SELESAI KALAU
- Test 01A/01B hijau
- Semua V-INV-* punya test
- pnpm verify hijau

Tunjukkan rencananya dulu.
```

---

## PROMPT 8 -- Irisan 8: laporan & analisis

Irisan paling besar di seluruh rencana. **Jangan dikerjakan sekaligus.** Ada
lima sub-irisan; tempel satu per satu, merge, baru lanjut.

### 8a -- fondasi periode

```
Plan mode. Jangan tulis kode sebelum saya bilang lanjut.

Baca:
@docs/DOMAIN-RULES.md -> R14.1, R14.5, R14.6
@docs/ERD.md -> indeks tambahan untuk halaman peringkat
@tests/golden/summary-2026.golden.test.ts

KERJAKAN Irisan 8a: fondasi periode laporan.

Cakupan:
1. Komponen pemilih rentang bulan A -> bulan B, state TERSIMPAN DI URL (R14.1)
   supaya bisa di-bookmark dan di-share.
2. SATU fungsi agregasi yang dipakai bersama SELURUH halaman laporan. Bukan satu
   query per halaman. Ini yang menjaga angka antar halaman tidak beda.
3. Semua angka DIHITUNG, bukan disimpan (R14.5). Tidak ada tabel ringkasan.

TEST WAJIB
- Rentang Apr-Jul 2026 == GOLDEN_APR_JUL_2026, persis
- Rentang Jun-Jun == angka Juni saja
- Rentang kosong (bulan tanpa job) -> nol, bukan error
- Rentang terbalik (B sebelum A) -> ditolak dengan pesan jelas

BLOCKER
- Q68 BELUM DIJAWAB: dasar periode laporan -- ETD, tanggal job dibuat, atau
  tanggal invoice? Ketiganya bisa beda bulan, dan ini MENENTUKAN apakah angka
  kita cocok dengan rekap Bu Niken. Buat basis tanggal itu SATU KONSTANTA yang
  bisa diganti satu tempat, default ETD, dan tandai "menunggu Q68".
  Jangan menyebar pilihan tanggal ke banyak query.

SELESAI KALAU
- Golden summary hijau, dan mengubah rentang mengubah hasil sesuai harapan
- pnpm verify hijau

Tunjukkan rencananya dulu.
```

### 8b -- rekap dasar

```
Plan mode. Kerjakan Irisan 8b, memakai fungsi agregasi dari 8a. Jangan bikin
fungsi agregasi kedua.

Baca: @docs/DOMAIN-RULES.md R7.3, R14.x  @docs/DESIGN-SYSTEM.md  @docs/RBAC.md

Cakupan:
- Dashboard GP: bulan x segmen
- Rekap pembayaran vendor per bulan (R7.3)
- Rekap PPh 23 & PPN -- DIHITUNG, bukan tabel tersimpan
- Pencarian job -> satu halaman tampilan lengkap

WAJIB
- Semua angka tabular-nums, rata kanan, toLocaleString("id-ID")
- Warna hanya token DESIGN-SYSTEM. Warna semantik hanya untuk teks, angka,
  garis tepi, dan titik 6px -- TIDAK PERNAH sebagai latar blok
- Tidak ada shadow, gradien, atau emoji sebagai ikon
- Tidak ada perhitungan uang di dalam komponen React

SELESAI KALAU total di dashboard == total dari fungsi agregasi 8a untuk rentang
yang sama, dibuktikan test.

Tunjukkan rencananya dulu.
```

### 8c -- peringkat multi-sumbu

```
Plan mode. Kerjakan Irisan 8c.

Baca: @docs/DOMAIN-RULES.md R14.2, R14.3, R14.6

Cakupan:
- Tab pendapatan: peringkat customer, segmen, sales, rute
- Tab belanja: peringkat vendor, DIBERI LABEL TERPISAH supaya tidak tercampur
  dengan pendapatan
- Tiap baris: jumlah job, selling, cost, GP, GP%, tanggal pertama & terakhir (R14.3)

TEST WAJIB
- Mengubah rentang MENGUBAH urutan peringkat (bukan cuma angkanya)
- Jumlah seluruh baris peringkat == total agregat rentang itu

BLOCKER
- Q66: rute masih teks bebas (JKT-BTM, PRW-PALU). Belum dinormalisasi jadi
  master pelabuhan. Peringkat rute BISA pecah karena salah ketik. Tampilkan apa
  adanya + hitung berapa varian mirip, JANGAN menggabungkan otomatis.
- Q67: sales masih kode 3 huruf (KIM, VIN, RIK, YUD), belum jelas siapa.
  Tampilkan kodenya, jangan mengarang nama.
- Q41: data per job (SO BULAN *.xlsx) BELUM diterima. Kerjakan rancangan +
  test memakai fixtures. Jangan mengarang data.

Tunjukkan rencananya dulu.
```

### 8d -- drill-down berlapis

```
Plan mode. Kerjakan Irisan 8d.

Baca: @docs/DOMAIN-RULES.md R14.4

Cakupan: peringkat -> daftar job -> costing -> invoice & pembayaran.
Setiap lapisan mewarisi rentang periode dan sumbu yang sedang aktif (dari URL).

TEST WAJIB (ini inti irisan ini)
- Total di setiap lapisan SAMA dengan lapisan di atasnya. Klik customer
  peringkat 1 -> jumlah selling seluruh job yang muncul == angka selling di
  baris peringkat itu. Sampai rupiah terakhir.
- Drill-down dengan rentang yang berbeda tidak pernah menampilkan job di luar
  rentang.

Tunjukkan rencananya dulu.
```

### 8e -- export

```
Plan mode. Kerjakan Irisan 8e: export Excel.

WAJIB
- Export mengikuti rentang DAN sumbu yang sedang aktif, bukan seluruh data
- Angka keluar sebagai angka, bukan teks
- Total di berkas Excel == total di layar, dibuktikan test
- Dependency baru untuk menulis xlsx WAJIB lewat ADR dulu. Kalau belum ada ADR,
  BERHENTI dan bilang ke saya.

Tunjukkan rencananya dulu.
```

---

## PROMPT 9 -- Irisan 9: migrasi data historis

```
Plan mode. Jangan tulis kode sebelum saya bilang lanjut.

Baca:
@docs/RECONCILIATION-REPORT.md
@docs/SOURCE-PROVENANCE.md
@fixtures/golden-jobs.csv
@fixtures/README.md
@.clinerules/06-db-migrations.md

KERJAKAN Irisan 9: importer data historis.

Cakupan:
1. Importer dari fixtures/golden-jobs.csv ke tabel job + charge_line.
2. Baris tidak konsisten DITANDAI (kolom status import + alasan), BUKAN
   diperbaiki diam-diam, BUKAN dilewati diam-diam.
3. Laporan hasil import: berapa masuk, berapa ditandai, alasan apa saja,
   dan total rupiah per status.
4. Rekonsiliasi akhir terhadap angka di docs/RECONCILIATION-REPORT.md.
5. Import harus bisa dijalankan ulang tanpa menduplikasi data (idempoten).

ATURAN YANG MENGIKAT
- Importer tidak boleh MENGARANG nilai yang kosong. Kosong tetap kosong + ditandai.
- Importer tidak boleh membulatkan supaya cocok. Kalau tidak cocok, laporkan.
- Nomor job historis dipakai apa adanya, tidak dialokasikan ulang oleh counter.
  Pastikan counter job_sequence diset supaya nomor baru tidak menabrak historis.
- Semua yang diimpor tercatat di audit_log sebagai import, dengan sumber berkasnya.

SELESAI KALAU
- Selisih rekonsiliasi = Rp 0, atau setiap rupiah selisih PUNYA baris penjelasan
- Import dijalankan dua kali -> jumlah baris tetap sama
- pnpm verify hijau

Tunjukkan rencananya dulu, plus daftar jenis inkonsistensi yang kamu antisipasi.
```

---

## PROMPT 10 -- Irisan 10: persiapan go-live

```
Plan mode. Jangan tulis kode sebelum saya bilang lanjut.

Baca: @docs/NFR.md  @docs/BUILD-PLAN.md (Slice 10)  @docs/RBAC.md

KERJAKAN Irisan 10: persiapan go-live.

Cakupan:
1. Backup otomatis aktif, terjadwal, dan terbukti menghasilkan berkas.
2. RESTORE DIUJI SUNGGUHAN (AVL-4) -- bukan "seharusnya bisa". Tulis prosedurnya
   di docs/RUNBOOK.md dan buktikan sekali dari nol ke database baru.
3. Pembuatan user & peran untuk 4 akun nyata.
4. Materi pelatihan singkat (1 halaman per peran, bahasa Indonesia, tanpa jargon
   teknis).
5. Rencana periode paralel: sistem + Excel jalan bersamaan 1 bulan.
6. Skrip rekonsiliasi bulan pertama -> harus Rp 0.

WAJIB
- docs/RUNBOOK.md berisi: cara restore, cara reset password, apa yang dilakukan
  kalau sistem mati di jam kerja (Q61 masih terbuka -- tulis prosedur sementara
  dan tandai).
- Tidak ada kredensial produksi di repo. Sekali pun.

SELESAI KALAU
- Restore terbukti berhasil ke database kosong dan datanya lengkap
- Rekonsiliasi bulan paralel pertama = Rp 0

Tunjukkan rencananya dulu.
```

---

## PROMPT R1 -- review rencana sebelum kode ditulis

Tempel ini **setelah** Cursor menunjukkan rencana, sebelum kamu bilang lanjut.
Ini prompt paling murah dan paling sering menyelamatkan.

```
Jangan tulis kode. Sekarang serang rencanamu sendiri.

1. Sebutkan 5 cara rencana ini bisa GAGAL di produksi ISLI (bukan gagal test).
2. Bagian mana yang kamu TEBAK, bukan kamu baca dari dokumen? Sebut baris
   dokumennya untuk yang kamu baca, dan akui yang kamu tebak.
3. Aturan mana di docs/DOMAIN-RULES.md yang PALING MUNGKIN kamu langgar tanpa
   sadar di rencana ini?
4. Perhitungan uang mana yang bisa menghasilkan pecahan sen atau pembulatan
   ke bawah?
5. Apakah ada tempat di rencana ini yang menghitung uang di dalam komponen React?
6. Test mana yang akan MENANGKAP tiap kegagalan di poin 1? Kalau ada kegagalan
   yang tidak tertangkap test, tambahkan test-nya ke rencana.
7. Berkas apa saja yang akan kamu sentuh di luar cakupan irisan ini? Kalau ada,
   jelaskan kenapa, atau keluarkan dari rencana.

Setelah itu tulis ulang rencananya, versi final. Masih jangan tulis kode.
```

---

## PROMPT R2 -- review sebelum merge

```
Jangan tulis kode dulu. Periksa pekerjaanmu sendiri seperti auditor yang
dibayar untuk mencari kesalahan.

Untuk setiap poin, jawab dengan mengutip kode yang bersangkutan:

1. Ada float di jalur uang? Ada Number untuk rupiah? Tunjukkan tiap tempatnya.
2. Ada perbandingan role === "..." langsung, di mana pun? Harus assertCan().
3. Ada perhitungan uang di dalam komponen React?
4. Setiap tanda X di docs/RBAC.md yang tersentuh irisan ini: tunjukkan test
   yang membuktikan penolakannya.
5. Setiap invariant di docs/STATE-MACHINE.md yang tersentuh: tunjukkan test-nya.
6. Ada nilai harapan test yang kamu ubah selama irisan ini? Kalau ada,
   tunjukkan dan jelaskan. Kalau menyentuh fixtures/, itu pelanggaran -- kembalikan.
7. Ada toBeCloseTo, epsilon, it.skip, it.todo, atau test yang di-comment?
8. Ada any, @ts-ignore, atau non-null assertion (!) baru?
9. Ada warna Tailwind bawaan (bg-blue-500, slate, emerald, amber, rose)?
   Ada shadow? Gradien? Emoji sebagai ikon?
10. Ada angka yang tidak tabular-nums / tidak rata kanan / tidak pakai
    toLocaleString("id-ID")?
11. Ada DELETE keras, atau UPDATE/DELETE ke audit_log?
12. Ada dependency baru? Ada ADR-nya?
13. Ada asumsi yang kamu ambil karena pertanyaan klien belum dijawab? Daftarkan
    beserta nomor Q-nya dan lokasi berkasnya.

Lalu jalankan pnpm verify dan tempelkan keluarannya apa adanya, tanpa diringkas.
```

---

## PROMPT R3 -- saat golden test merah

```
Golden test [nama] merah.

JANGAN ubah angka yang diharapkan.
JANGAN ubah apa pun di fixtures/.
JANGAN pakai toBeCloseTo, epsilon, it.skip, atau it.todo.

Lakukan ini, berurutan:
1. Tampilkan nilai yang diharapkan vs yang keluar, sampai satuan rupiah.
2. Pecah perhitungannya per langkah: subtotal, DPP, PPN, PPh 23, grand total.
   Tunjukkan angka tiap langkah dari kode kita.
3. Bandingkan dengan angka di dokumen sumber klien, langkah per langkah.
   Tunjukkan langkah PERTAMA yang mulai berbeda.
4. Tentukan: bug di kode kita, atau aturan bisnisnya memang belum jelas.
5. Kalau bug -> perbaiki, jelaskan akar masalahnya dalam satu paragraf.
6. Kalau aturan belum jelas -> BERHENTI, tulis pertanyaannya ke
   docs/OPEN-QUESTIONS.md dengan format yang sama seperti pertanyaan lain,
   lalu tunggu saya.

Konteks: pembulatan proyek ini KE ATAS (R3.6, jawaban Q05 13 Agu 2026). Selisih
Rp 1 pada invoice Diametral dulu dibiarkan karena aturan itu belum diketahui --
sekarang seharusnya sudah tidak ada lagi. Kalau masih Rp 1, itu bug pembulatan.
```

---

## PROMPT R4 -- migrasi database

```
Saya butuh perubahan skema: [jelaskan].

Baca @.clinerules/06-db-migrations.md dan @docs/ERD.md dulu.

Prosedur WAJIB, tanpa jalan pintas:
1. Ubah src/db/schema/*.ts
2. pnpm db:generate
3. TAMPILKAN SQL yang dihasilkan ke saya, apa adanya, sebelum dijalankan
4. Tunggu persetujuan saya
5. Baru pnpm db:migrate
6. Perbarui docs/ERD.md supaya cocok dengan skema baru

DILARANG
- pnpm db:push / drizzle-kit push (sudah diblokir, jangan dicari akalnya)
- DROP COLUMN atau DROP TABLE tanpa persetujuan tertulis dari saya
- Mengubah tipe kolom uang dari BIGINT
- Migrasi yang tidak bisa dijalankan di database yang sudah ada isinya

Kalau perubahan ini menghapus atau mengubah data yang sudah ada, BERHENTI dan
jelaskan dampaknya dulu.
```

---

## PROMPT R5 -- ada yang tidak jelas di tengah kerja

```
BERHENTI menulis kode.

Kamu baru menyentuh hal yang belum diputuskan. Jangan menebak.

Lakukan ini:
1. Rumuskan pertanyaannya dalam satu kalimat, dalam bahasa yang bisa dijawab
   orang non-teknis (Pak Indra / Bu Niken / Fairol).
2. Sebutkan siapa yang paling mungkin tahu jawabannya.
3. Sebutkan aturan R-xx atau tabel ERD yang terdampak.
4. Tulis 2-3 kemungkinan jawaban, dan APA BEDANYA di kode untuk masing-masing.
5. Tambahkan ke docs/OPEN-QUESTIONS.md dengan format yang sama seperti
   pertanyaan lain di sana (nomor Q berikutnya, kolom penanggung jawab, kolom
   aturan terkait, status "menunggu").
6. Kalau irisan ini masih bisa jalan dengan asumsi sementara: pakai asumsi yang
   PALING KETAT, taruh di SATU tempat, beri komentar "menunggu Qxx", dan
   laporkan lokasinya ke saya.
7. Kalau tidak bisa jalan tanpa jawaban: berhenti total, laporkan ke saya.

Jangan lanjut sebelum saya balas.
```

---

## PROMPT R6 -- jawaban klien baru masuk

```
Ada jawaban baru dari klien.

Pertanyaan: [Qxx]
Jawaban: [tempel jawabannya apa adanya, jangan diringkas]
Sumber: [rapat/WA/telepon, tanggal]

Jangan tulis kode dulu. Lakukan pelacakan dampak:
1. Perbarui docs/OPEN-QUESTIONS.md: tandai terjawab + tanggal + isi jawaban.
2. Perbarui aturan terkait di docs/DOMAIN-RULES.md, ubah statusnya dari
   BELUM DIKETAHUI / DUGAAN / USULAN menjadi DIJAWAB, dengan tanggal.
3. Cari SEMUA tempat di kode yang memakai asumsi lama (grep komentar
   "menunggu Qxx"). Daftarkan berkas + barisnya.
4. Cari test yang mengunci asumsi lama.
5. Kalau jawabannya bertentangan dengan ADR yang sudah Accepted, JANGAN ubah ADR
   itu -- buat ADR baru yang menggantikannya (superseded), sesuai docs/adr/README.md.
6. Baru setelah daftar dampak itu saya setujui: ubah kode dan test.

Tunjukkan daftar dampaknya dulu.
```

---

## PROMPT R7 -- audit kepatuhan tampilan

```
Jangan tambah fitur. Audit kepatuhan visual seluruh berkas di src/app dan
src/components terhadap @docs/DESIGN-SYSTEM.md.

Untuk setiap pelanggaran, tampilkan: berkas, baris, apa yang salah, penggantinya.

Yang dicari:
- Warna Tailwind bawaan: blue, slate, gray, emerald, amber, rose, dan sejenisnya
- box-shadow / shadow-* pada elemen UI (harus hairline 1px #e0e0e0)
- Gradien
- Emoji sebagai ikon
- Warna semantik dipakai sebagai LATAR BLOK (hanya boleh untuk teks, angka,
  garis tepi, titik 6px)
- Angka tanpa tabular-nums, tidak rata kanan, atau tanpa toLocaleString("id-ID")
- Istilah dagang yang diterjemahkan ke Indonesia (job, invoice, vendor, freight,
  trucking, dooring, vessel, THC, LSS, THD, POD, FCL, LCL, ETD, TOP, GP, NETT
  HARUS tetap seperti aslinya)
- Antarmuka yang malah berbahasa Inggris

Benahi satu per satu setelah saya setujui daftarnya. Jangan sekalian refactor.
```

---

## PROMPT R8 -- audit test RBAC & invariant

```
Jangan tambah fitur. Buat tabel kepatuhan test.

Kolom: izin/invariant | sumber (RBAC.md atau STATE-MACHINE.md) | ada test? |
berkas test | nama test

Barisnya: SEMUA izin di docs/RBAC.md (untuk tiap peran, termasuk yang bertanda
X), plus SEMUA invariant J-INV-1..6, I-INV-1..5, dan V-INV-*.

Tandai baris yang belum punya test. Jangan menulis test-nya dulu -- saya mau
lihat besarnya lubang lebih dulu.
```

---

## PROMPT R9 -- performa & NFR

```
Baca @docs/NFR.md.

Jangan optimasi apa pun sebelum diukur. Lakukan ini:
1. Buat skrip yang mengisi database dengan 100 job/bulan x 36 bulan (3.600 job)
   plus charge line yang wajar per job, dari data acak yang bentuknya realistis.
2. Ukur waktu muat: halaman daftar job, dashboard GP, halaman peringkat rentang
   12 bulan, dan drill-down 3 lapis.
3. Tampilkan angkanya + query mana yang paling lambat (EXPLAIN ANALYZE).
4. Baru usulkan indeks atau perubahan query. Satu per satu, dengan angka
   sebelum-sesudah.

DILARANG
- Menambah cache untuk menutupi query yang lambat
- Menyimpan angka agregat di tabel ringkasan (R14.5 melarangnya)
- Mengubah hasil demi kecepatan
```

---

## PROMPT R10 -- rem darurat / rollback

```
STOP. Berhenti sekarang.

Jangan tulis, ubah, atau hapus satu berkas lagi.

1. Daftarkan SEMUA berkas yang kamu sentuh di percakapan ini.
2. Untuk masing-masing, satu baris: apa yang kamu ubah dan kenapa.
3. Mana yang di luar cakupan irisan yang saya minta?
4. Ada nilai test, fixtures, atau berkas aturan (.clinerules, .cursor/rules,
   docs/DOMAIN-RULES.md) yang kamu ubah? Sebutkan persis.
5. Usulkan perintah git untuk mengembalikan HANYA perubahan yang di luar cakupan.

Jangan jalankan apa pun sebelum saya setujui.
```

---

## Kalimat yang tidak boleh kamu tulis ke Cursor

| Jangan tulis | Kenapa berbahaya | Ganti dengan |
|---|---|---|
| "bikinin sistem ISLI" | terlalu besar, hasilnya mengarang | satu irisan dari `docs/BUILD-PLAN.md` |
| "perbaiki semua error" | dia akan mematikan test | tunjukkan error spesifiknya |
| "buat test-nya hijau" | dia akan mengubah nilai harapan | "cari kenapa merah, jangan ubah angkanya" |
| "terserah kamu" | keputusan diam-diam yang tidak tercatat | putuskan, atau minta dia bertanya |
| "sekalian rapikan yang lain" | refactor liar di luar cakupan | satu irisan, satu tujuan |
| "pakai best practice" | dia menimpa konvensi repo | tunjuk berkas contoh di repo ini |
| "kayaknya begini" | dia mengubah tebakanmu jadi kode | jadikan pertanyaan Q di `OPEN-QUESTIONS.md` |
| "cepetan" | dia melewati test | tidak ada penggantinya. Jangan. |

---

## Tanda Cursor mulai ngawur -- hentikan

Begitu lihat salah satu dari ini, tempel **PROMPT R10** detik itu juga:

1. Mengubah angka di `fixtures/` dengan alasan apa pun.
2. Menambahkan `toBeCloseTo`, epsilon, `it.skip`, `it.todo`, atau meng-comment test.
3. Menulis `role === "OWNER"` alih-alih `assertCan(...)`.
4. Memakai `Number`, float, atau desimal untuk rupiah.
5. Menghitung uang di dalam komponen React.
6. Menjalankan atau mengusulkan `drizzle-kit push`.
7. Membuat tabel atau kolom yang tidak ada di `docs/ERD.md`.
8. Menyentuh `.clinerules/`, `.cursor/rules/`, atau `docs/DOMAIN-RULES.md`.
9. Mengisi kolom `_TODO` di fixtures, NPWP, atau `pph23_applicable` dengan tebakan.
10. Menandai kode biaya sebagai `FIXED` padahal Q76 belum dijawab.
11. Bilang "kemungkinan besar aturannya begini" lalu lanjut menulis kode.
12. Mengerjakan dua irisan sekaligus, atau menyentuh berkas di luar cakupan.
13. Menambah dependency tanpa ADR.
14. Bilang sudah menjalankan test padahal tidak menempelkan keluarannya.
15. `UPDATE` atau `DELETE` ke `audit_log`, atau hapus keras data apa pun.

---

## Peta blocker: irisan vs pertanyaan terbuka

Irisan boleh dikerjakan meski ada blocker, **tapi asumsinya wajib ditaruh di
satu tempat dan ditandai** `menunggu Qxx`.

| Irisan | Pertanyaan yang menggantung | Sikap sementara |
|---|---|---|
| 0 | Q59 login Google Workspace, Q62 2FA Owner | email+password dulu, jangan bangun OAuth |
| 1 | Q13 PPN selalu 1,1%?, Q14 bukti potong PPh 23 | 1,1% dan PPh 23 default nonaktif |
| 2 | Q16 nomor job batal hangus/dipakai ulang | jangan tangani kasus batal; berhenti kalau terbentur |
| 3 | **Q76 kode FIXED**, Q64/Q65 field buying wajib, Q25 normalisasi nama | semua kode `OPSIONAL`; duplikat hanya ditandai |
| 4 | Q15 sumber kurs USD | kurs diinput manual per job, tanpa API |
| 5 | **Q79 format berita acara**, Q56/Q57 pengganti approver | terima berkas apa pun; jangan bikin delegasi otomatis |
| 6 | **Q69 pajak selisih addendum**, Q70 level approval, Q71 label tercetak, Q78 approver pra-POD | ambil yang paling ketat, tandai lokasinya |
| 7 | Q77 approval addendum vendor | Manager/Owner, bukan pembuat |
| 8 | **Q41 berkas SO BULAN**, Q68 dasar periode, Q66 rute, Q67 sales | rancang + test pakai fixtures; dasar periode = satu konstanta |
| 9 | Q22 wajib migrasi historis?, Q37 baris terhapus | impor + tandai, jangan perbaiki diam-diam |
| 10 | Q61 prosedur sistem mati, Q34 retensi/backup | tulis prosedur sementara di RUNBOOK, tandai |

Selain itu, ini **wajib beres sebelum go-live**, bukan sebelum kode:
ADR-0007 `Accepted`, `RECONCILIATION-REPORT.md` dipresentasikan, `charge-codes.csv`
divalidasi Bu Niken, NPWP customer/vendor terisi, identitas ISLI diterima,
scope Phase 1 disetujui tertulis.

---

## Checklist sebelum merge

Jangan merge sebelum **semua** ini benar. Tempel PROMPT R2 untuk memeriksanya.

- [ ] `pnpm verify` hijau, keluarannya ditempel apa adanya (bukan diringkas Cursor)
- [ ] `pnpm test:golden` hijau, dan tidak ada satu pun berkas `fixtures/` berubah
- [ ] Tidak ada float / `Number` di jalur uang
- [ ] Tidak ada perhitungan uang di komponen React
- [ ] Tidak ada `role === "..."`; semua lewat `can()` / `assertCan()`
- [ ] Setiap tanda `X` di `docs/RBAC.md` yang tersentuh punya test penolakan
- [ ] Setiap invariant `J-INV-*` / `I-INV-*` / `V-INV-*` yang tersentuh punya test
- [ ] Tidak ada `any`, `@ts-ignore`, atau `!` baru
- [ ] Tidak ada `toBeCloseTo`, epsilon, `it.skip`, `it.todo`, test di-comment
- [ ] Warna & tipografi hanya token `docs/DESIGN-SYSTEM.md`; tanpa shadow/gradien/emoji
- [ ] Angka: `tabular-nums`, rata kanan, `toLocaleString("id-ID")`
- [ ] Migrasi lewat `db:generate` -> SQL dibaca -> `db:migrate`; `docs/ERD.md` ikut diperbarui
- [ ] Soft delete saja; `audit_log` tidak pernah di-`UPDATE`/`DELETE`
- [ ] Tidak ada dependency baru tanpa ADR
- [ ] Semua asumsi sementara tercatat di `docs/OPEN-QUESTIONS.md` + komentar `menunggu Qxx`
- [ ] `CHANGELOG.md` diperbarui, satu irisan satu entri
- [ ] Kotak centang irisan di `docs/BUILD-PLAN.md` baru dicentang **setelah** ini semua lolos

---

## Pembagian tugas di proyek ini

| Peran | Siapa | Kerjanya |
|---|---|---|
| Menulis & menjalankan kode aplikasi | **Cursor** (atau Cline) | irisan demi irisan dari `docs/BUILD-PLAN.md`, pakai prompt di berkas ini |
| Menyiapkan dokumen, ADR, pertanyaan, dan prompt | **agent chat** | `docs/*.md`, `docs/OPEN-QUESTIONS.md`, berkas ini |
| Menjawab pertanyaan bisnis | **Pak Indra / Bu Niken / Fairol** | isi jawaban ke `docs/OPEN-QUESTIONS.md` |
| Memutuskan urutan & membuka gerbang | **Pak Indra** | `docs/BUILD-PLAN.md` |

Agent chat **tidak** menulis kode aplikasi. Kalau butuh kode, ambil prompt di
berkas ini dan jalankan di Cursor.
