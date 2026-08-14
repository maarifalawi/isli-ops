import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema/index";

/*
 * Koneksi database.
 *
 * DATABASE_URL memakai connection pooler Supabase (port 6543) — untuk aplikasi.
 * DIRECT_URL memakai koneksi langsung (port 5432) — hanya untuk migrasi.
 *
 * Kalau tertukar, migrasi akan gagal dengan pesan yang membingungkan tentang
 * prepared statement. Ini jebakan yang sudah menghabiskan waktu banyak orang.
 */

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL belum diisi. Salin .env.example jadi .env.local lalu isi.",
  );
}

const client = postgres(connectionString, {
  // Pooler Supabase tidak mendukung prepared statement.
  prepare: false,
  max: 10,
});

export const db = drizzle(client, { schema });

export { schema };
