# SETUP-CI-SECRETS.md — Mengaktifkan E2E login di GitHub Actions

> Irisan 10 Item 2. Dokumen ini untuk **pemilik repo** (Alawi) — langkah
> menyetel 4 GitHub Secrets yang membuat spec Playwright ber-kredensial
> (`smoke.spec.ts`, `master-crud.spec.ts`) ikut berjalan di CI.

## Cara kerja sekarang (tanpa Secrets)

`ci.yml` job `e2e` memakai pola fallback:

```yaml
NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL || 'https://dummy.supabase.co' }}
NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy' }}
E2E_TEST_EMAIL: ${{ secrets.E2E_TEST_EMAIL || '' }}
E2E_TEST_PASSWORD: ${{ secrets.E2E_TEST_PASSWORD || '' }}
```

Artinya:

- **Sebelum Secrets diset** → nilai boneka; CI tetap hijau, tapi spec yang
  butuh login di-skip otomatis (pola `test.skip` di `tests/e2e/smoke.spec.ts`
  saat `E2E_TEST_EMAIL`/`E2E_TEST_PASSWORD` kosong). Yang tetap berjalan:
  `auth.spec.ts` (redirect ke /login).
- **Setelah Secrets diset** → spec login ikut berjalan otomatis, tanpa
  perubahan workflow apa pun lagi.

## Langkah 1 — Buat akun uji di Supabase (DULU, sebelum set Secrets)

Akun uji harus ada lebih dulu, kalau tidak job `e2e` akan merah setelah
Secrets diset (login gagal karena user tidak ada).

Ikuti `scripts/create-supabase-users.md`:
1. Buka project Supabase yang dipakai (dashboard → SQL Editor / Admin API
   sesuai dokumen itu).
2. Buat satu akun uji (mis. `e2e@isli.test`) dengan kata sandi kuat —
   cukup role STAFF untuk spec master-crud (STAFF read-only diuji eksplisit).
3. Catat: email + kata sandi akun uji, URL project, anon key.

## Langkah 2 — Isi 4 Secrets di GitHub UI (hanya pemilik repo yang bisa)

1. Buka `https://github.com/maarifalawi/isli-ops` → **Settings**.
2. Sidebar kiri → **Secrets and variables** → **Actions**.
3. Klik **New repository secret**, isi PERSIS dengan nama berikut (huruf
   besar-kecil berpengaruh):

| Nama secret | Nilai |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL project Supabase tempat akun uji dibuat, mis. `https://abcdefgh.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon (publishable) key project yang sama |
| `E2E_TEST_EMAIL` | Email akun uji dari Langkah 1 |
| `E2E_TEST_PASSWORD` | Kata sandi akun uji dari Langkah 1 |

4. Ulangi untuk keempatnya. TIDAK perlu `DATABASE_URL` — CI memakai service
   `postgres:16` lokal, bukan Supabase (jangan pernah menaruh kredensial
   produksi di CI).

## Langkah 3 — Verifikasi

1. Push commit apa pun (atau buka PR) — CI jalan.
2. Buka run CI → job **Playwright** → log langkah "E2E".
3. Sukses bila spec `smoke.spec.ts` dan `master-crud.spec.ts` **tidak lagi
   tertulis "skipped"** dan hijau; `auth.spec.ts` tetap hijau.
4. Kalau merah dengan galat login: cek ulang akun uji benar-benar dibuat di
   project Supabase yang URL-nya dipakai di `NEXT_PUBLIC_SUPABASE_URL`
   (penyebab paling umum: akun dibuat di project yang berbeda).

## Catatan

- `NEXT_PUBLIC_APP_URL` tidak perlu — default `http://localhost:3000` sudah
  benar untuk CI (lihat `playwright.config.ts`).
- VAPID/Sentry/Accurate vars di `.env.example` TIDAK dibutuhkan CI dan TIDAK
  diberi fallback di workflow — jangan ditambahkan kecuali ada kebutuhan baru
  yang disetujui.
- Setelah ini, branch mana pun yang di-push akan memakai Secrets yang sama
  (repository-level) — akun uji hanya satu, jangan pernah pakai akun asli
  Bu Niken/Pak Indra sebagai akun uji CI.