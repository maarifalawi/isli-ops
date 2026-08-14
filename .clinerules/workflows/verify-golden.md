# Workflow: Verifikasi Golden Dataset

Jalankan dengan `/verify-golden.md`.

Dipakai setiap kali menyentuh logika uang, pajak, GP, atau importer.

## Langkah

### 1. Jalankan
```bash
pnpm test:golden
```

### 2. Kalau HIJAU
Laporkan singkat:
```
Golden: 75/75 job cocok, 2/2 invoice cocok.
```
Selesai.

### 3. Kalau MERAH — jangan panik, jangan akali

Klasifikasikan dulu penyebabnya:

#### Kasus A — Kode kita salah
Ciri: hanya sebagian job yang meleset, polanya konsisten
(misalnya semua job EXIM meleset).
→ Perbaiki kode. Jangan sentuh fixture.

#### Kasus B — Data asli klien memang salah
Ciri: satu-dua baris meleset, nilainya aneh.
Contoh yang sudah diketahui:
- `DOM!Q91` = 18.700.000 padahal `O91−P91` = 28.900.000
- `SUMMARY 2026!F19` merujuk sel yang salah

→ Langkah:
1. Cek `docs/RECONCILIATION-REPORT.md` — apakah sudah tercatat?
2. Kalau belum, tambahkan sebagai temuan baru dengan bukti
3. Tandai baris fixture dengan kolom `known_discrepancy`
4. **Jangan ubah angkanya**

#### Kasus C — Aturannya belum diketahui
Ciri: selisih kecil dan konsisten, tidak jelas kenapa.
Contoh yang sudah diketahui: Diametral selisih **Rp 1** (Q05, pembulatan).

→ Langkah:
1. Tambahkan/cek pertanyaan di `docs/OPEN-QUESTIONS.md`
2. Biarkan test merah
3. **BERHENTI** dan laporkan ke user

### 4. Yang DILARANG

```ts
// ❌ JANGAN
expect(hasil).toBeCloseTo(harapan, -1)
expect(Math.abs(hasil - harapan)).toBeLessThan(10)
const harapan = hasil  // "biar hijau dulu"
it.skip("invoice diametral", ...)
```

Test golden yang diakali = sistem yang tidak bisa dipercaya = proyek gagal.

### 5. Format laporan

```
## Hasil Golden Test

Job     : 73/75 cocok
Invoice : 1/2 cocok

Meleset:
1. ISLI-26.07-012 — GP sistem 2.100.000 vs fixture 1.900.000
   Klasifikasi: Kasus B (data asli salah)
   Bukti: cost di Excel tidak menjumlahkan baris STORDEM
   Tindakan: dicatat sebagai TEMUAN 10 di RECONCILIATION-REPORT.md

2. Invoice Diametral — selisih Rp 1
   Klasifikasi: Kasus C (aturan belum diketahui)
   Tindakan: menunggu Q05, test dibiarkan merah
```
