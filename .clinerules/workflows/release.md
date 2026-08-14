# Workflow: Persiapan Rilis

Jalankan dengan `/release.md` sebelum deploy ke produksi.

## 1. Gerbang kualitas

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm test:golden
pnpm test:e2e
pnpm build
```

Semua harus hijau. Tidak ada pengecualian, tidak ada `--force`.

## 2. Cek dokumen

- [ ] `docs/OPEN-QUESTIONS.md` — tidak ada 🔴 yang relevan dengan fitur yang dirilis
- [ ] `docs/adr/README.md` — tidak ada ADR `Proposed` yang memblokir
- [ ] `docs/BUILD-PLAN.md` — checklist slice ini sudah tercentang
- [ ] `docs/ERD.md` sesuai dengan skema sebenarnya
- [ ] `CHANGELOG.md` diperbarui

## 3. Cek database

- [ ] Semua migrasi berjalan pada database kosong
- [ ] Semua migrasi berjalan pada salinan data produksi
- [ ] **Backup diambil sebelum migrasi**
- [ ] **Prosedur restore diuji sungguhan**, bukan diasumsikan jalan
- [ ] Constraint kritikal terpasang:
  - `uq_vendor_inv`
  - `uq_job_number`
  - `ck_legs`
  - audit log append-only

## 4. Cek keamanan

- [ ] Tidak ada rahasia di repo (`git secrets --scan`)
- [ ] `.env.example` lengkap dan terbaru
- [ ] Semua endpoint mutasi memanggil `assertCan`
- [ ] Test RBAC hijau untuk seluruh sel `✗`
- [ ] Rate limit login aktif

## 5. Cek rekonsiliasi — khusus rilis pertama

- [ ] Import 75 job historis berhasil
- [ ] Total GP sistem cocok dengan `RECONCILIATION-REPORT.md`
- [ ] Baris yang ditandai bermasalah sudah dikomunikasikan ke Bu Niken
- [ ] Cetak 3 invoice dari sistem, bandingkan dengan invoice asli

## 6. Rencana rollback

Tulis eksplisit sebelum deploy:
- Perintah rollback aplikasi
- Perintah rollback migrasi
- Cara restore backup
- Siapa yang dihubungi kalau bermasalah

## 7. Setelah deploy

- [ ] Login berhasil
- [ ] Buat satu job uji, cek nomornya benar
- [ ] Cetak satu invoice uji, cek angkanya benar
- [ ] Cek audit log terisi
- [ ] Backup otomatis berjalan
- [ ] Hapus data uji

## 8. Periode paralel — rilis pertama saja

Selama **1 bulan penuh**, sistem dan Excel berjalan bersamaan.
Di akhir bulan, rekonsiliasi keduanya. Selisih harus **Rp 0**.

Baru setelah itu Excel boleh dihentikan.
