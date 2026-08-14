# ADR-0001: Stack & Arsitektur Dasar

- **Status:** Accepted
- **Tanggal:** 2026-08-13
- **Konteks keputusan:** Alawi (developer), disetujui secara implisit karena ini ranah teknis

## Konteks

- Skala nyata: 75 job dalam 4 bulan (≈19/bulan). Target desain 100/bulan.
- User bersamaan ≤ 15.
- Klien meminta eksplisit: **web base**.
- Tidak ada tim IT internal di ISLI.
- Klien pernah gagal satu proyek sistem sebelumnya (developer India + Bu Niken)
  karena scope creep, sehingga toleransi terhadap kompleksitas sangat rendah.
- Developer akan bekerja dibantu AI coding agent (Cline).

## Keputusan

| Layer | Pilihan |
|---|---|
| Framework | Next.js App Router + TypeScript strict |
| Database | PostgreSQL (Supabase managed) |
| UI | Tailwind + shadcn/ui |
| Tabel | TanStack Table |
| Test | Vitest + Playwright |
| Deploy | Vercel + Supabase |

Arsitektur: **monolith modular**, satu repo, satu database, tanpa layanan
terpisah.

## Alasan

1. **Skala ini kecil.** Satu instance Postgres sanggup menangani beban ini
   ribuan kali lipat. Kompleksitas apa pun di atas itu adalah biaya tanpa manfaat.
2. **Tidak ada tim IT.** Managed service menghilangkan kebutuhan administrasi
   server, patching, dan setup backup manual.
3. **Ramah AI agent.** Next.js + Postgres + Drizzle punya volume dokumentasi dan
   contoh terbesar, sehingga agent lebih jarang berhalusinasi.
4. **Server-first.** App Router membuat perhitungan uang secara alami terjadi di
   server. Ini bukan preferensi gaya, ini kontrol keamanan.

## Konsekuensi

**Positif:** waktu ke produksi cepat, ekosistem besar, biaya operasional rendah,
satu bahasa untuk seluruh stack.

**Negatif:**
- Ketergantungan pada Vercel & Supabase. Mitigasi: seluruhnya bisa dijalankan
  di Docker Compose bila klien menuntut on-premise.
- Next.js sering breaking change. Mitigasi: pin versi mayor, upgrade terjadwal.

**Yang ditolak:**

| Alternatif | Alasan ditolak |
|---|---|
| Laravel / PHP | Ekosistem TS lebih baik untuk berbagi tipe domain antara client & server |
| Microservices | Absurd untuk 19 job/bulan |
| Firebase / NoSQL | Data ini sangat relasional dan butuh transaksi ACID untuk uang |
| Low-code (Retool, Budibase) | Aturan pajak & state machine terlalu spesifik; sulit diuji otomatis |
| Desktop app | Klien minta web base |
