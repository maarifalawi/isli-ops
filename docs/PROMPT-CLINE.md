# Prompt untuk Cline

Cara memakai repo ini dengan Cline. Salin blok yang relevan apa adanya.

> **Aturan pokok:** jangan pernah bilang "bikinin sistem ISLI". Terlalu besar,
> Cline akan mengarang. Selalu satu irisan, dengan definisi selesai yang jelas.

---

## Sebelum mulai

1. Buka folder ini sebagai workspace Cline.
2. `.clinerules/` terbaca otomatis — jangan diubah lewat chat.
3. Mulai selalu di **Plan Mode**. Pindah ke Act hanya setelah rencananya benar.
4. Model: Claude Sonnet untuk coding, Opus saat merancang skema.

---

## PROMPT 0 — Orientasi (jalankan sekali, Plan Mode)

```
Jangan tulis kode apa pun di percakapan ini.

Baca berurutan, jangan dilompati:
1. AGENTS.md
2. docs/CONTEXT.md
3. docs/DOMAIN-RULES.md
4. docs/OPEN-QUESTIONS.md
5. docs/ERD.md
6. docs/ARCHITECTURE.md
7. docs/BUILD-PLAN.md
8. docs/RECONCILIATION-REPORT.md

Setelah itu jawab dalam bahasa Indonesia:

A. Ringkas model bisnis ISLI dalam 5 kalimat.
B. Sebutkan 3 aturan domain yang paling gampang dilanggar kalau tidak hati-hati.
C. Sebutkan semua pertanyaan berstatus MERAH yang masih terbuka, dan untuk
   tiap satu jelaskan: apakah bisa dikerjakan secara defensif, atau benar-benar
   memblokir.
D. Sebutkan 3 hal di dokumen yang menurutmu SALAH, tidak konsisten, atau
   berbahaya. Kalau tidak ada, bilang tidak ada -- jangan mengarang.
E. Sebutkan irisan pertama yang akan kamu kerjakan dan definisi selesainya.

Jangan setuju begitu saja. Kalau ada yang janggal, katakan.
```

**Kalau jawabannya dangkal atau memuji tanpa isi, jangan lanjut.** Ganti model
atau ulangi. Cline yang tidak paham konteks akan menghasilkan kode yang harus
dibuang.

---

## PROMPT 1 — Irisan 0: kerangka berjalan

```
Plan Mode. Kerjakan Irisan 0 dari docs/BUILD-PLAN.md.

TUJUAN
Satu jalur tipis yang hidup dari ujung ke ujung: login -> buat 1 job dengan
1 baris selling dan 1 baris buying -> GP tampil -> tersimpan di database ->
terbaca lagi setelah refresh. Deploy jalan.

WAJIB
- Next.js App Router, TypeScript strict, Drizzle, Postgres, Zod, Tailwind
- Semua uang BIGINT rupiah. Tidak ada float. Tipe Rupiah yang di-brand.
- Semua tarif dalam basis point: PPN_RATE_BP = 110, PPH23_RATE_BP = 200
- applyRateBp(base, bp) => Math.round(base * bp / 10_000)
- Otorisasi lewat assertCan(). Tidak boleh cek role langsung.
- Mobile-first. Uji di lebar 390px.

DILARANG
- Jangan bikin modul invoice, approval, atau laporan. Bukan sekarang.
- Jangan bikin tabel di luar yang dibutuhkan Irisan 0.
- Jangan pakai any. Jangan pakai @ts-ignore.
- Jangan tulis nilai uang sebagai number literal di komponen.

SELESAI KALAU
- pnpm typecheck && pnpm lint && pnpm test semuanya hijau
- Bisa login, buat job, lihat GP, refresh, datanya masih ada
- Ada 1 test integrasi yang membuktikan alur itu

Tunjukkan rencananya dulu. Jangan tulis kode sebelum saya bilang lanjut.
```

---

## PROMPT 2 — Irisan berikutnya (pola berulang)

Ganti bagian dalam kurung siku.

```
Plan Mode. Kerjakan Irisan [N]: [nama] dari docs/BUILD-PLAN.md.

Baca dulu:
- docs/DOMAIN-RULES.md bagian [X]
- docs/ERD.md tabel [Y]
- skills/[skill yang relevan]/SKILL.md

ATURAN YANG MENGIKAT IRISAN INI
[salin aturan R-xx yang relevan ke sini apa adanya]

SELESAI KALAU
- [kriteria konkret yang bisa dicek]
- Golden test terkait hijau
- Setiap tanda silang di docs/RBAC.md untuk fitur ini punya test

JANGAN sentuh berkas di luar cakupan irisan ini.
JANGAN ubah golden fixtures.
Kalau butuh jawaban yang belum ada di docs/OPEN-QUESTIONS.md, BERHENTI dan
tanya saya. Jangan menebak.
```

---

## PROMPT 3 — Saat golden test merah

```
Golden test [nama] merah.

JANGAN ubah angka yang diharapkan.
JANGAN pakai toBeCloseTo, epsilon, atau it.skip.
JANGAN tandai sebagai known issue.

Lakukan ini:
1. Tunjukkan nilai yang diharapkan vs yang keluar, sampai satuan rupiah
2. Telusuri mundur setiap langkah perhitungannya
3. Tentukan: bug di kode kita, atau aturan bisnisnya memang belum jelas
4. Kalau bug -> perbaiki, jelaskan akar masalahnya
5. Kalau aturan belum jelas -> BERHENTI, tulis pertanyaannya, tunggu saya

Catatan: test invoice-diametral memang sengaja merah, selisih Rp 1 (Q05).
Jangan diperbaiki sampai Q05 dijawab klien.
```

---

## PROMPT 4 — Saat pertanyaan terbuka terjawab

```
Jalankan .clinerules/workflows/answer-question.md untuk [Q-nomor].

Jawaban dari klien:
"[tempel jawaban persis apa adanya]"

Langkahnya:
1. Perbarui docs/OPEN-QUESTIONS.md -> tandai terjawab, catat tanggal
2. Pindahkan aturannya ke docs/DOMAIN-RULES.md, ganti penanda merah jadi hijau
3. Kalau ada ADR terkait, ubah dari Proposed jadi Accepted
4. Cari seluruh kode dan test yang terdampak
5. Perbarui, jalankan pnpm test
6. Laporkan apa yang berubah

Kalau jawaban klien bertentangan dengan yang sudah ada di dokumen, JANGAN diam.
Tunjukkan pertentangannya.
```

---

## PROMPT 5 — Tinjauan sebelum merge

```
Tinjau perubahan di irisan ini seolah kamu reviewer yang galak.

Cek satu per satu:
1. Ada float untuk uang? Ada number literal rupiah di komponen?
2. Ada cek role langsung, bukan lewat assertCan?
3. Ada any atau @ts-ignore?
4. Ada aturan di docs/DOMAIN-RULES.md yang bisa dilanggar lewat jalur ini?
5. Ada test yang lulus tanpa benar-benar menguji apa pun?
6. Ada TODO yang seharusnya jadi pertanyaan ke klien?
7. Di layar 390px, ada yang pecah?
8. Ada penghapusan permanen data? (harus soft delete -- wajib 10 tahun)

Untuk tiap temuan: berkas, baris, kenapa berbahaya, cara benarnya.
Kalau bersih, bilang bersih. Jangan cari-cari masalah palsu.
```

---

## Prompt tambahan yang sering dipakai

### Menambah charge code
```
Jalankan .clinerules/workflows/add-charge-code.md
Kode: [KODE]  Nama: [nama]  Kategori: [FREIGHT|TERMINAL|DARAT|DOKUMEN|INTERNAL]
Kena PPN: [ya|tidak]  At-cost: [ya|tidak]  PPh23: [ya|tidak|BELUM TAHU]
Kalau PPh23 belum tahu, isi UNKNOWN. Jangan menebak.
```

### Migrasi database
```
Jalankan .clinerules/workflows/db-migrate.md
Perubahan: [jelaskan]
Wajib reversible. Tunjukkan SQL-nya sebelum dijalankan.
Ingat: tidak boleh ada DELETE. Retensi 10 tahun (UU KUP 28 ayat 11).
```

### Cek rekonsiliasi
```
Jalankan .clinerules/workflows/verify-golden.md
Hitung total selling, cost, dan GP Apr-Jul 2026 dari database.
Bandingkan dengan fixtures/README.md.
Sistem harus menghasilkan GP 280.150.000 -- bukan 257.650.000.
Kalau keluar 257.650.000, berarti kita meniru bug Excel. Itu kegagalan.
```

---

## Kalimat yang harus dihindari

| Jangan tulis | Kenapa | Ganti dengan |
|---|---|---|
| "bikinin sistem ISLI" | terlalu besar, pasti mengarang | satu irisan dari BUILD-PLAN |
| "perbaiki semua error" | Cline akan matikan test | tunjukkan error spesifik |
| "buat secepatnya" | mengundang jalan pintas | "benar dulu, tidak usah buru-buru" |
| "terserah kamu" | keputusan diam-diam | tentukan, atau minta dia bertanya |
| "lanjut aja" saat merah | utang teknis menumpuk | selesaikan dulu yang merah |

---

## Tanda Cline mulai ngawur

Hentikan dan mundur kalau:

- Mengubah golden fixtures "biar konsisten"
- Menambah `toBeCloseTo` pada test uang
- Membuat tabel yang tidak ada di `docs/ERD.md`
- Memakai `parseFloat` pada nilai rupiah
- Menulis `// TODO: konfirmasi ke klien` lalu tetap melanjutkan
- Bilang "sudah saya sederhanakan" tanpa diminta
- Menyentuh berkas di luar irisan yang sedang dikerjakan

Cara mundur:
```
STOP. Kembalikan perubahan terakhir.
Kamu [sebutkan apa yang dia lakukan]. Itu melanggar .clinerules/00-guardrails.md.
Jelaskan kenapa kamu melakukannya, lalu kerjakan ulang tanpa itu.
```
