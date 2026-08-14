/**
 * Skrip sementara untuk memverifikasi isi tabel `users` dan `jobs` setelah seed.
 * Hapus setelah verifikasi selesai.
 */

import { sql } from "drizzle-orm";
import { db } from "../src/db/index";
import { users } from "../src/db/schema/index";

async function main() {
  const rows = await db
    .select({ email: users.email, role: users.role, aktif: users.aktif })
    .from(users)
    .orderBy(users.email);

  const jobs = await db.execute(sql`select count(*)::int as n from jobs`);

  console.log(JSON.stringify({ users: rows, jobs: Array.from(jobs) }, null, 2));
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
