# Workflow: Mulai Slice Baru

Jalankan dengan `/new-slice.md` di Cline.

## Langkah

### 1. Konfirmasi slice
Tanya user: slice nomor berapa dari `docs/BUILD-PLAN.md`?
Jangan menebak.

### 2. Cek gerbang
```
Baca docs/BUILD-PLAN.md → GERBANG 0
Baca docs/OPEN-QUESTIONS.md → masih ada 🔴 yang relevan?
Baca docs/adr/README.md → ada ADR Proposed yang memblokir slice ini?
```

**Kalau ada blocker → laporkan ke user dan BERHENTI.**
Jangan tawarkan "sementara pakai asumsi X dulu".

### 3. Baca dokumen
Ikuti `.clinerules/01-baca-dulu.md` sesuai jenis slice.
Sebutkan file apa saja yang sudah kamu baca.

### 4. Rencana (Plan Mode)
Hasilkan:
- Daftar checklist dari `BUILD-PLAN.md` untuk slice ini
- Aturan `DOMAIN-RULES.md` yang berlaku (sebut nomornya)
- Skema database yang dibutuhkan (kalau ada)
- Daftar test yang akan ditulis duluan
- File yang akan dibuat/diubah
- Risiko dan hal yang belum jelas

Minta persetujuan sebelum lanjut.

### 5. Eksekusi
```
Untuk setiap item checklist:
  a. Tulis test yang gagal
  b. Implementasi minimal
  c. Test hijau
  d. Rapikan
  e. Centang item di BUILD-PLAN.md
```

### 6. Verifikasi
```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm test:golden
```

### 7. Update dokumen
- Centang checklist di `BUILD-PLAN.md`
- Kalau ada aturan baru yang terkonfirmasi → pindahkan ke `DOMAIN-RULES.md`
  dengan status ✅
- Kalau ada istilah baru → tambahkan ke `CONTEXT.md`
- Kalau ada pertanyaan baru → `OPEN-QUESTIONS.md`

### 8. Laporan
Pakai format di `.clinerules/02-workflow.md`.
