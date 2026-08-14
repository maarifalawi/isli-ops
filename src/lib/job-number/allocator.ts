/*
 * Alokasi nomor urut job & invoice (irisan 2).
 *
 * Mekanisme yang disetujui: UPSERT
 *
 *   INSERT INTO <table> (...) VALUES (...)
 *   ON CONFLICT DO UPDATE SET last_running = <table>.last_running + 1
 *   RETURNING last_running
 *
 * yang DIPANGGIL DI DALAM transaksi yang sama dengan INSERT job/invoice-nya.
 * Row-level lock pada baris counter menyerialkan penuh semua transaksi yang
 * berebut nomor di periode yang sama: tidak butuh advisory lock, tidak ada
 * jalur MAX(running)+1 tanpa lock, dan nomor tidak pernah disimpan atau
 * dihitung di memori aplikasi.
 *
 * DILARANG memanggil fungsi-fungsi ini di luar transaksi yang menulis
 * job/invoice — kalau transaksinya gagal, nomor tetap "terbakar" dan
 * urutan bolong.
 */

import { sql } from "drizzle-orm";
import type { db } from "../../db/index";
import { invoiceSequence, jobSequence } from "../../db/schema/index";
import type { InvoiceType, SeqScope } from "./index";

/**
 * Tipe transaksi dari db client aplikasi. Diturunkan dari `db.transaction`
 * supaya tidak salah menebak jumlah argumen generik
 * PostgresJsTransaction antar versi drizzle-orm.
 */
export type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Alokasi running number job untuk (scope, tahun, bulan).
 * Mengembalikan running baru (1-999). Format jadi string pakai
 * `formatJobNumber` yang sudah ada.
 */
export async function allocateJobNumber(
  tx: Tx,
  p: { scope: SeqScope; tahun: number; bulan: number },
): Promise<number> {
  const rows = await tx
    .insert(jobSequence)
    .values({
      seqScope: p.scope,
      tahun: p.tahun,
      bulan: p.bulan,
      lastRunning: 1,
    })
    .onConflictDoUpdate({
      target: [jobSequence.seqScope, jobSequence.tahun, jobSequence.bulan],
      set: {
        // Kolom yang dirujuk adalah baris counter yang SUDAH ada
        // (bukan nilai insert), sesuai bentuk SQL yang disetujui:
        // SET last_running = job_sequence.last_running + 1
        lastRunning: sql`${jobSequence.lastRunning} + 1`,
      },
    })
    .returning({ lastRunning: jobSequence.lastRunning });

  const row = rows[0];
  if (!row) {
    throw new Error(
      "UPSERT job_sequence tidak mengembalikan baris — ini tidak mungkin terjadi.",
    );
  }
  return row.lastRunning;
}

/**
 * Alokasi running number invoice untuk (invType, issueYear, issueMonth).
 * R2.2 — bulan terbit (bukan bulan job) yang menentukan romawi dan counter.
 * R2.4 — counter reset tiap bulan terbit.
 */
export async function allocateInvoiceNumber(
  tx: Tx,
  p: { invType: InvoiceType; issueYear: number; issueMonth: number },
): Promise<number> {
  const rows = await tx
    .insert(invoiceSequence)
    .values({
      invType: p.invType,
      issueYear: p.issueYear,
      issueMonth: p.issueMonth,
      lastRunning: 1,
    })
    .onConflictDoUpdate({
      target: [
        invoiceSequence.invType,
        invoiceSequence.issueYear,
        invoiceSequence.issueMonth,
      ],
      set: {
        lastRunning: sql`${invoiceSequence.lastRunning} + 1`,
      },
    })
    .returning({ lastRunning: invoiceSequence.lastRunning });

  const row = rows[0];
  if (!row) {
    throw new Error(
      "UPSERT invoice_sequence tidak mengembalikan baris — ini tidak mungkin terjadi.",
    );
  }
  return row.lastRunning;
}
