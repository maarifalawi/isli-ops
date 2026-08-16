/**
 * Backfill counter penomoran (irisan 2) — dijalankan SEKALI setelah migrasi
 * 0001_dapper_gargoyle, SEBELUM allocator dipakai untuk membuat nomor baru.
 *
 * Nilai counter diambil dari MAX(running) data yang sudah ada, per
 * (scope/tahun/bulan) untuk job dan (jenis/tahun terbit/bulan terbit) untuk
 * invoice — sehingga alokasi berikutnya menyambung dari nomor terakhir.
 *
 * Pakai ON CONFLICT DO UPDATE SET last_running = GREATEST(...) supaya aman
 * dijalankan ulang (idempoten).
 *
 * Jalankan:  npx tsx scripts/backfill-sequence-counters.ts
 */
import postgres from "postgres";

async function main(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL belum diisi di .env.local");
  }

  const sql = postgres(url, { max: 1, prepare: false });

  try {
    // --- job_sequence: dari jobs (scope/tahun/bulan/running tersimpan terpisah)
    const jobs = await sql`
      INSERT INTO job_sequence (seq_scope, tahun, bulan, last_running)
      SELECT seq_scope, tahun::smallint, bulan::smallint, MAX(running)
      FROM jobs
      WHERE deleted_at IS NULL
      GROUP BY 1, 2, 3
      ON CONFLICT (seq_scope, tahun, bulan)
      DO UPDATE SET last_running = GREATEST(
        job_sequence.last_running, EXCLUDED.last_running
      )
      RETURNING seq_scope, tahun, bulan, last_running
    `;

    // --- invoice_sequence: bulan terbit diambil dari issue_date (R2.2)
    const invoices = await sql`
      INSERT INTO invoice_sequence (inv_type, issue_year, issue_month, last_running)
      SELECT
        inv_type,
        issue_year::smallint,
        EXTRACT(MONTH FROM issue_date)::smallint,
        MAX(running)
      FROM customer_invoices
      GROUP BY 1, 2, 3
      ON CONFLICT (inv_type, issue_year, issue_month)
      DO UPDATE SET last_running = GREATEST(
        invoice_sequence.last_running, EXCLUDED.last_running
      )
      RETURNING inv_type, issue_year, issue_month, last_running
    `;

    // biome-ignore lint/suspicious/noConsoleLog: CLI script output
    console.log("=== job_sequence (%d baris) ===", jobs.length);
    console.table(jobs);
    // biome-ignore lint/suspicious/noConsoleLog: CLI script output
    console.log("=== invoice_sequence (%d baris) ===", invoices.length);
    console.table(invoices);

    // Verifikasi penuh: seluruh isi kedua tabel.
    const allJobs = await sql`
      SELECT * FROM job_sequence ORDER BY seq_scope, tahun, bulan
    `;
    const allInv = await sql`
      SELECT * FROM invoice_sequence ORDER BY inv_type, issue_year, issue_month
    `;
    // biome-ignore lint/suspicious/noConsoleLog: CLI script output
    console.log("--- verifikasi SELECT * job_sequence ---");
    console.table(allJobs);
    // biome-ignore lint/suspicious/noConsoleLog: CLI script output
    console.log("--- verifikasi SELECT * invoice_sequence ---");
    console.table(allInv);
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
