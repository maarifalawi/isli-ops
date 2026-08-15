# HANDOFF IRISAN 3 CRUD — SESI C (Master Data Halaman §10.4)

> PENERIMA: AI Agent sesi berikutnya.
> BACA: AGENTS.md, HANDOFF-IRISAN-3-CRUD-SESIB.md, RENCANA-IRISAN-3-CRUD.md (§10 sisa: §10.4–§10.7), docs/HANDOFF-IRISAN-3-CRUD.md (konteks §10), DESIGN-SYSTEM.md.
> STATUS MASUK: 52152a3 (Irisan 3a master logic + similarity + audit, 163 test).
> STATUS KELUAR: ad3adc0 + commit primitif & handoff ini. Kerja bersih; kerja tree bersih.

## 1. APA YANG SELESAI DI SESI C (sesi terinterupsi, diselesaikan & diverifikasi)

Sesi sebelumnya terinterupsi di tengah kerja. Sisa kerjanya diselesaikan, dites, dan
dikommit pada `ad3adc0` feat(logika): sisa sesi terinterupsi — mirip() kupas awalan entitas + test literal RENCANA §7 + RBAC MANAGER:

1. **`mirip()` similarity.kamus: awalan entitas dikupas sebelum perbandingan**
   (`src/lib/similarity/index.ts`). "pt. sri tani" vs "sri tani" → 1.0 (sebelumnya 0.45).
   Awalan dikupas: pt, cv, ud, fa, yayasan, koperasi, dan, the (depan), tbk, es, co, corp,
   inc, ltd, llc, gmbh, co. ltd. (belakang). Skor dihitung dua arah (kupas A, kupas B, maks).
   Catatan: "pt. sri tani jaya" vs "sri tani" tetap 0.65 — benar, karena "jaya" bukan
   awalan entitas (RENCANA §7 memang mensyaratkan kupas awalan entitas, bukan sufiks
   umum). Test §7 literal hijau semua.
2. **Test RENCANA §7 literal** ditambahkan di `tests/unit/similarity.test.ts` (blok baru):
   "pt. sri tani" ~ "pt sri tani" = 1.0; "pt. sri tani" ~ "sri tani" = 1.0;
   "pt. sri tani jaya" ~ "sri tani" < AMBANG_MIRIP; "pt sri tani jaya" ~ "cv sri tani"
   >= AMBANG_MIRIP.
3. **Test RBAC MANAGER semua entitas** di `tests/integration/master-data.integration.test.ts`
   (blok baru): 5 entitas x {buat, ubah, hapus} ditolak — melengkapi coverage OWNER.
4. **Primitif UI halaman master** `src/components/master/primitives.tsx` (belum dikommit
   di sesi terinterupsi — sekarang ikut dikommit): HalamanJudul, PeringatanMirip (#c93400),
   PesanHasil, TombolPill (varian utama/merusak/netral, min-h-touch), kelasInput (h-9,
   border-hairline, fokus cincin accent), kelasTombolSekunder, Field (label mikro kapital).
   Hanya memakai token DESIGN-SYSTEM; tanpa box-shadow/gradien/emoji.

## 2. STATUS KELUAR (verifikasi)

- `pnpm vitest run tests/unit/similarity.test.ts tests/unit/audit.test.ts` → **31 passed**.
- `pnpm vitest run tests/integration/master-data.integration.test.ts` → **9 passed**
  (111 assertions). Total suite: **167 test, 0 gagal** (naik 4 dari 163: test §7 literal
  + blok RBAC MANAGER dihitung per-test).
- `pnpm biome check src/lib/similarity src/lib/master-data src/lib/audit tests/unit/similarity.test.ts tests/integration/master-data.integration.test.ts` → bersih.
- Working tree bersih setelah commit ad3adc0.

## 3. POSISI RENCANA SEKARANG

- §10.1 (fondasi), §10.2 (similarity + RBAC), §10.3 (master-data logic + audit) — **selesai**.
- **§10.4 belum mulai: halaman `/master/**` (5 entitas) dengan form inline.**
  Primitif UI pendukung (`src/components/master/primitives.tsx`) SUDAH tersedia.
- §10.5 actions.ts per halaman + test RBAC level action; §10.6 import CSV; §10.7 audit page.
- E2E (20 test, termasuk CRUD master) tetap ditunda ke Irisan 5 (perlu user Supabase riil).

## 4. ATURAN WAJIB (dari PROMPT-CURSOR.md)

- Jangan berhenti bertanya kecuali 4 kategori (keputusan teknis minor, test-first, dll).
- Jangan pakai Tailwind CDN; hanya token DESIGN-SYSTEM (tailwind.config sudah mengganti
  palet bawaan — warna Tailwind bawaan GAGAL build).
- DRY/YAGNI/Test-First + Konvensi (CONTOH), commit per fitur (jangan tumpuk di akhir),
  verifikasi perintah nyata.

## 5. LANGKAH SESI BERIKUTNYA (SESID) — mulai §10.4

1. Baca RENCANA-IRISAN-3-CRUD.md §3 (struktur route), §4 (pola server action),
   §6 (aturan per entitas), §8 (kepatuhan DESIGN-SYSTEM).
2. Buat `src/lib/server/master.ts` (helper `butuhPeran` server-side) bila belum ada —
   atau pakai langsung `ambilPengguna` + `butuhPeran` dari `src/lib/session/index.ts`.
3. Per entitas (urutan RENCANA §6): Pelabuhan → Armada → Tarif → KodeMuatan → Pelanggan
   (Vendor ikut pola Pelanggan). Tiap halaman: `ambilPengguna()` → guard peran
   (MANAGER/OWNER baca+edit, ADMIN/OPERATIONS/keuangan read-only tanpa tombol edit),
   form inline tambah/edit, hapus via TombolPill varian "merusak", peringatan mirip
   di form tambah/ubah via `mirip()`, PesanHasil dari server action.
4. Server action per halaman di `src/app/master/<entitas>/actions.ts` memakai
   `buatX/ubahX/hapusX` dari `src/lib/master-data/index.ts` + `catatAudit`
   (pola `aksi` di RENCANA §4; jangan lupa validasi `sudahDipakai` untuk Tarif & Pelabuhan).
5. Commit per halaman begitu hijau (test + biome + tsc).
6. Tutup dengan HANDOFF-IRISAN-3-CRUD-SESID.md.

## 6. JEBAKAN

- Jangan ulang kerja §10.1–§10.3 (sudah hijau & terkunci test).
- `mirip()` sekarang kupas awalan entitas dua arah; jangan tambah kupasan baru tanpa
  test RENCANA §7 tetap literal.
- Warna semantik merah `#c93400` (peringatan) dan `#d70015` (aksi merusak) hanya boleh
  pada teks/garis, BUKAN latar blok penuh (RENCANA §8 / DESIGN-SYSTEM).
- Jangan commit `.env.local`; `.env.example` adalah satu-satunya yang dilacak.
- `sudahDipakai()` menolak ubah/hapus Tarif & Pelabuhan yang terhubung transaksi;
  pesan error "sudah dipakai..." — pertahankan di UI sebagai pesan ramah.
- `ubahKapal` memvalidasi nama unik kecuali kapal itu sendiri; `buatVendor`
  case-insensitive (beda dengan Pelanggan).
