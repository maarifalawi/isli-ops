import { defineConfig } from "drizzle-kit";

/**
 * Lihat .clinerules/06-db-migrations.md
 *
 * `drizzle-kit push` DILARANG di repo ini. Ia mengubah skema tanpa
 * meninggalkan berkas migrasi — artinya tidak ada jejak, tidak ada rollback,
 * dan produksi bisa berbeda diam-diam dari yang ada di git.
 *
 * Alur yang benar selalu:
 *   1. ubah src/db/schema/*.ts
 *   2. pnpm db:generate    -> menghasilkan berkas SQL di drizzle/
 *   3. BACA SQL-nya. Kalau ada DROP COLUMN atau ALTER TYPE pada kolom uang,
 *      berhenti dan tulis migrasi manual yang aman.
 *   4. pnpm db:migrate
 */
export default defineConfig({
  schema: "./src/db/schema/index.ts",
  out: "./drizzle",
  dialect: "postgresql",

  dbCredentials: {
    // Koneksi LANGSUNG (port 5432), bukan pooler.
    // drizzle-kit butuh sesi tetap; pgbouncer akan memutusnya di tengah migrasi.
    url:
      process.env.DIRECT_URL ??
      process.env.DATABASE_URL ??
      (() => {
        throw new Error("DIRECT_URL atau DATABASE_URL belum diisi.");
      })(),
  },

  verbose: true,
  // Minta konfirmasi sebelum operasi merusak.
  strict: true,
});
