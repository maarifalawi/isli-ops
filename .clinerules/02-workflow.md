---
description: Cara bekerja per task — urutan langkah dari mulai sampai selesai.
alwaysApply: true
---

# Alur Kerja per Task

## Mode Plan → Act

Untuk task apa pun yang menyentuh domain logic, **selalu mulai di Plan Mode**.

### Di Plan Mode, hasilkan:
1. Dokumen apa saja yang sudah kamu baca
2. Aturan mana di `DOMAIN-RULES.md` yang berlaku (sebut nomornya: R3.1, R4.3)
3. File apa yang akan dibuat/diubah
4. Test apa yang akan ditulis **duluan**
5. Pertanyaan yang belum terjawab — kalau ada, **jangan lanjut ke Act**

Baru minta izin pindah ke Act Mode.

## Urutan mengerjakan

```
1. Baca dokumen (lihat .clinerules/01-baca-dulu.md)
2. Cek OPEN-QUESTIONS.md — ada blocker untuk task ini?
   └─ ADA → BERHENTI, laporkan ke user
3. Tulis test yang gagal dulu
4. Implementasi seminimal mungkin agar test hijau
5. Rapikan (refactor) tanpa mengubah perilaku
6. Jalankan verifikasi lengkap
7. Update dokumen yang terdampak
8. Laporkan
```

## Verifikasi sebelum bilang "selesai"

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm test:golden
```

Semua harus hijau. Kalau `test:golden` merah, **belum selesai** — kecuali
merahnya adalah kasus Diametral Rp 1 yang memang sedang menunggu Q05.

## Satu task, satu tujuan

- Jangan menggabung refactor dengan fitur baru
- Jangan "sekalian rapikan" file lain
- Jangan tambah fitur yang tidak diminta
- Kalau menemukan bug di tempat lain: catat, lapor, **jangan langsung perbaiki**

## Format laporan selesai

```
## Selesai: <nama task>

Aturan yang diikuti: R3.1, R3.2, R4.3
Dokumen dibaca: CONTEXT.md, DOMAIN-RULES.md, ADR-0002

File diubah:
- src/domain/tax/ppn.ts (baru)
- src/domain/tax/ppn.test.ts (baru)

Test: 12 lulus, 0 gagal
Golden: hijau

Catatan / temuan:
- <hal yang perlu diketahui user>

Pertanyaan baru:
- <kalau ada, sudah ditambahkan ke OPEN-QUESTIONS.md>
```

## Kalau buntu

Jangan mencoba tiga pendekatan berbeda secara diam-diam sampai ada yang jalan.
Setelah **dua** percobaan gagal:

1. Berhenti
2. Jelaskan apa yang sudah dicoba dan kenapa gagal
3. Tanyakan arah ke user

Menghabiskan konteks untuk menebak lebih merugikan daripada bertanya.
