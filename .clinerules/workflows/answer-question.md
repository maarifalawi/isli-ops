# Workflow: Proses Jawaban dari Klien

Jalankan dengan `/answer-question.md` setiap kali klien menjawab pertanyaan
di `docs/OPEN-QUESTIONS.md`.

> Jawaban klien adalah aset paling berharga di proyek ini. Kalau tidak
> diproses dengan benar, jawaban itu hilang di riwayat chat dan kita kembali
> menebak.

## Langkah

### 1. Catat jawaban mentah
Isi kolom `Jawaban` di `docs/OPEN-QUESTIONS.md`, **apa adanya**, termasuk
siapa yang menjawab dan kapan.

```
| Q04 | PPh 23 kenapa beda? | NIKEN | R3.5 | "Yang motong itu customer yang
     ditunjuk pemungut. Diametral ditunjuk, Materee nggak." — Bu Niken, 15 Agu 2026 |
```

### 2. Terjemahkan jadi aturan formal
Pindahkan ke `docs/DOMAIN-RULES.md`, ubah status jadi ✅ TERBUKTI,
sertakan sumbernya.

```markdown
### R3.5 Kapan PPh 23 dipotong ✅ TERBUKTI
PPh 23 dipotong bila customer berstatus pemungut yang ditunjuk.
Ditandai di master customer: `customer.is_pph23_withholder`.
Sumber: Bu Niken, 15 Agu 2026.
```

### 3. Cek dampaknya — langkah yang paling sering dilupakan

Jawaban satu pertanyaan sering merembet:

```
[ ] Apakah ERD berubah? → update docs/ERD.md + migrasi
[ ] Apakah ada ADR yang terpengaruh? → buat ADR baru (jangan edit yang lama)
[ ] Apakah golden test berubah? → update ekspektasi + jalankan ulang
[ ] Apakah PRD berubah? → update acceptance criteria
[ ] Apakah ada pertanyaan turunan baru? → tambahkan ke OPEN-QUESTIONS.md
[ ] Apakah ada istilah baru? → tambahkan ke CONTEXT.md
[ ] Apakah ada blocker yang sekarang terbuka? → update BUILD-PLAN.md
```

### 4. Kalau jawaban mengubah keputusan arsitektur

**Jangan edit ADR lama.** Buat ADR baru:

```markdown
# ADR-00NN: Penentuan PPh 23 Berdasarkan Status Pemungut
- Status: Accepted
- Supersedes: bagian PPh 23 di ADR-0007
```

### 5. Laporkan

```
## Jawaban diproses: Q04

Jawaban: PPh 23 dipotong bila customer berstatus pemungut ditunjuk.
Sumber: Bu Niken, 15 Agu 2026

Dampak:
- DOMAIN-RULES.md R3.5 → ✅ TERBUKTI
- ERD.md: customer.is_pph23_withholder jadi NOT NULL
- Migrasi baru: 0012_pph23_withholder.sql
- Golden test invoice-diametral: masih merah (Q05 belum terjawab)
- BLOCKER Q04 terbuka → Slice 6 boleh lanjut

Pertanyaan turunan baru:
- Q35: Siapa yang menentukan status pemungut? Ada surat penunjukannya?
```
