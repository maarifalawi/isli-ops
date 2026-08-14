# Membuat akun Supabase Auth untuk Slice 0

Seed aplikasi hanya membuat baris peran di tabel `users`; akun login harus dibuat
terpisah di Supabase Auth dengan email yang sama persis.

1. Buka Supabase Dashboard → **Authentication → Users**.
2. Pilih **Add user → Create new user**.
3. Buat akun berikut, dengan kata sandi sementara yang aman:
   - `indra@isli.co.id` (OWNER)
   - `niken@isli.co.id` (MANAGER)
   - `fairol@isli.co.id` (STAFF)
   - `lana@isli.co.id` (STAFF)
4. Aktifkan konfirmasi email hanya jika alur email organisasi sudah siap; login
   tetap membutuhkan email yang sama persis dengan tabel `users`.

Jangan menyimpan kata sandi atau service-role key di repository. Akun yang
memiliki `aktif = false` pada tabel `users` tetap ditolak aplikasi.
