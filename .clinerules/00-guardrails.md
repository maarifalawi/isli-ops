---
description: Aturan wajib yang berlaku di setiap task. Jangan pernah diabaikan.
alwaysApply: true
---

# GUARDRAILS — Aturan yang tidak bisa ditawar

## 🛑 BERHENTI dan TANYA bila

Kamu **wajib berhenti** dan menulis pertanyaan ke `docs/OPEN-QUESTIONS.md`
kalau menghadapi salah satu dari ini:

1. Aturan bisnis yang kamu butuhkan **tidak tertulis** di `docs/DOMAIN-RULES.md`
2. Aturan yang kamu butuhkan bertanda **🔴 BELUM DIKETAHUI** atau **⚠️ DUGAAN**
3. ADR yang relevan masih berstatus **Proposed**
4. Kamu merasa perlu "masuk akalnya sih begini" tentang pajak, GP, atau
   penomoran
5. Permintaan user bertabrakan dengan `docs/PRD.md` bagian OUT OF SCOPE
6. Kamu butuh charge code, status, atau role yang belum ada di master data

**Domain ini penuh jebakan.** Contoh nyata: PPh 23 dipotong untuk satu customer
tapi tidak untuk yang lain, dan **tidak ada yang tahu kenapa**. Tebakan yang
terlihat masuk akal hampir selalu salah di sini.

Menebak lalu salah = angka uang salah = kepercayaan klien hilang = proyek mati.
Bertanya = 5 menit tertunda.

## ❌ DILARANG KERAS

| Larangan | Kenapa |
|---|---|
| `float`/`double`/`number` untuk uang | ADR-0002. Semua `BIGINT` rupiah. |
| Hitung uang di client | Server-only. Selalu. |
| Hard delete data transaksi | Soft delete + audit log. |
| Skip audit log pada mutasi | Setiap perubahan wajib berjejak. |
| Cek izin hanya di UI | Wajib `assertCan` di server. |
| Ubah skema tanpa file migrasi | ADR-0003. |
| Tambah dependency tanpa ADR | Tanya dulu. |
| Bikin istilah baru | Pakai `docs/CONTEXT.md`. |
| Perbaiki data historis diam-diam | Tandai dan laporkan, jangan perbaiki. |
| Ubah `docs/source-of-truth/` | Itu dokumen asli klien, read-only. |
| Kerjakan hal di daftar OUT OF SCOPE | Scope creep membunuh proyek sebelumnya. |
| Longgarkan test biar hijau | Test merah itu informasi, bukan gangguan. |

## ✅ WAJIB

1. Baca `docs/CONTEXT.md` sebelum menyebut istilah domain apa pun
2. Baca `docs/DOMAIN-RULES.md` sebelum menulis logika uang/pajak
3. Tulis test **sebelum** implementasi untuk semua logika uang
4. Jalankan `pnpm test:golden` sebelum menyatakan selesai
5. Semua mutasi dibungkus transaksi database
6. Semua service dimulai dengan `assertCan(user, action)`
7. Update dokumen di `docs/` pada commit yang sama dengan perubahan kode

## Prinsip menghadapi ketidakpastian

> **Sistem yang menolak bekerja karena aturannya belum jelas jauh lebih baik
> daripada sistem yang diam-diam menghasilkan angka salah.**

Kalau ragu antara "bikin default yang masuk akal" versus "paksa user mengisi
manual" — **selalu pilih paksa user mengisi manual**, dan catat pertanyaannya.

Contoh penerapan: karena aturan PPh 23 belum diketahui, field `pph23_applicable`
default-nya `false` dan **wajib dicentang manual** oleh Finance setiap invoice.
Merepotkan? Ya. Tapi tidak pernah salah diam-diam.

## Kalau test golden merah

`pnpm test:golden` membandingkan output sistem dengan 75 job dan 2 invoice asli.

Kalau merah:
1. **Jangan ubah nilai ekspektasi.**
2. **Jangan tambah toleransi.**
3. Cari tahu kenapa berbeda.
4. Kalau ternyata data asli yang salah → catat di `RECONCILIATION-REPORT.md`
   dan tandai fixture-nya, jangan ubah angkanya.
5. Kalau ternyata aturannya belum diketahui → `OPEN-QUESTIONS.md`, berhenti.

Khusus test Diametral: DULU memang sengaja merah selisih Rp 1 (Q05 belum
terjawab). Q05 SUDAH DIJAWAB 13 Agu 2026 -- ceiling. Seharusnya HIJAU sekarang.
Kalau masih merah, itu bug pembulatan. Jangan diakali.
