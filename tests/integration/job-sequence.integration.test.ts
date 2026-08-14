import { inArray } from "drizzle-orm";
/*
 * Test integrasi alokasi nomor job & invoice — BUTUH DATABASE_URL
 * (dimuat dari .env.local oleh vitest.config.ts).
 *
 * Terisolasi & bisa diulang: semua test memakai tahun 2099/2100 yang tidak
 * pernah dipakai data seed, dan beforeAll/afterAll menghapus baris counter
 * miliknya sendiri. Jadi assert "50 nomor unik 001..050" konsisten benar di
 * run ke-1, ke-2, ke-3 — bukan bertambah jadi 051..100 dst.
 *
 * Serialisasi 50 Promise.all diuji di level row lock database: pool max 10
 * membuat sisanya mengantre di postgres-js, dan UPSERT ... ON CONFLICT
 * mengunci baris counter sehingga nomor tidak mungkin dobel.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../../src/db/index";
import { invoiceSequence, jobSequence } from "../../src/db/schema/index";
import {
  allocateInvoiceNumber,
  allocateJobNumber,
  formatInvoiceNumber,
  formatJobNumber,
} from "../../src/lib/job-number/index";

const TEST_YEAR = 2099;
const TEST_YEAR_NEXT = TEST_YEAR + 1; // 2100 → YY "00"
const TEST_YEARS = [TEST_YEAR, TEST_YEAR_NEXT];

describe("alokasi nomor job & invoice (integrasi DB)", { timeout: 30_000 }, () => {
  beforeAll(async () => {
    // Bersihkan milik sendiri sebelum mulai — supaya run berulang konsisten.
    await db.delete(jobSequence).where(inArray(jobSequence.tahun, TEST_YEARS));
    await db
      .delete(invoiceSequence)
      .where(inArray(invoiceSequence.issueYear, TEST_YEARS));
  });

  afterAll(async () => {
    await db.delete(jobSequence).where(inArray(jobSequence.tahun, TEST_YEARS));
    await db
      .delete(invoiceSequence)
      .where(inArray(invoiceSequence.issueYear, TEST_YEARS));
    await db.$client.end();
  });

  it("50 alokasi konkuren scope sama di transaksi terpisah → 50 nomor unik 001..050", async () => {
    const results = await Promise.all(
      Array.from({ length: 50 }, () =>
        db.transaction((tx) =>
          allocateJobNumber(tx, { scope: "DOM", tahun: TEST_YEAR, bulan: 7 }),
        ),
      ),
    );

    expect(new Set(results).size).toBe(50);
    expect([...results].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 50 }, (_, i) => i + 1),
    );
  });

  it("regresi: ISLI-99.05-001 DOM dan EXP hidup bersamaan (counter terpisah)", async () => {
    const [dom, exp] = await Promise.all([
      db.transaction((tx) =>
        allocateJobNumber(tx, { scope: "DOM", tahun: TEST_YEAR, bulan: 5 }),
      ),
      db.transaction((tx) =>
        allocateJobNumber(tx, { scope: "EXP", tahun: TEST_YEAR, bulan: 5 }),
      ),
    ]);

    expect(dom).toBe(1);
    expect(exp).toBe(1);
    const domNo = formatJobNumber({ year: TEST_YEAR, month: 5, running: dom });
    const expNo = formatJobNumber({ year: TEST_YEAR, month: 5, running: exp });
    expect(domNo).toBe("ISLI-99.05-001");
    expect(expNo).toBe("ISLI-99.05-001");
  });

  it("ganti bulan → running kembali ke 001", async () => {
    const running = await db.transaction((tx) =>
      allocateJobNumber(tx, { scope: "DOM", tahun: TEST_YEAR, bulan: 8 }),
    );
    expect(running).toBe(1);
    expect(formatJobNumber({ year: TEST_YEAR, month: 8, running })).toBe(
      "ISLI-99.08-001",
    );
  });

  it("ganti tahun → YY berubah", async () => {
    const rOld = await db.transaction((tx) =>
      allocateJobNumber(tx, { scope: "DOM", tahun: TEST_YEAR, bulan: 1 }),
    );
    const rNew = await db.transaction((tx) =>
      allocateJobNumber(tx, { scope: "DOM", tahun: TEST_YEAR_NEXT, bulan: 1 }),
    );
    expect(formatJobNumber({ year: TEST_YEAR, month: 1, running: rOld })).toBe(
      "ISLI-99.01-001",
    );
    expect(formatJobNumber({ year: TEST_YEAR_NEXT, month: 1, running: rNew })).toBe(
      "ISLI-00.01-001",
    );
  });

  it("counter invoice: naik dalam satu bulan, reset ganti bulan, terpisah per jenis", async () => {
    await db.transaction(async (tx) => {
      const a = await allocateInvoiceNumber(tx, {
        invType: "INVDOM",
        issueYear: TEST_YEAR,
        issueMonth: 7,
      });
      const b = await allocateInvoiceNumber(tx, {
        invType: "INVDOM",
        issueYear: TEST_YEAR,
        issueMonth: 7,
      });
      const gantiBulan = await allocateInvoiceNumber(tx, {
        invType: "INVDOM",
        issueYear: TEST_YEAR,
        issueMonth: 8,
      });
      const jenisLain = await allocateInvoiceNumber(tx, {
        invType: "INVEXP",
        issueYear: TEST_YEAR,
        issueMonth: 7,
      });
      expect([a, b, gantiBulan, jenisLain]).toEqual([1, 2, 1, 1]);
    });
  });

  it("romawi invoice mengikuti BULAN TERBIT, bukan bulan job (R2.2)", () => {
    const jobNo = formatJobNumber({ year: TEST_YEAR, month: 7, running: 1 });
    const no = formatInvoiceNumber({
      running: 1,
      invoiceType: "INVDOM",
      jobNo,
      issueMonth: 8, // job Juli, invoice terbit Agustus
      issueYear: TEST_YEAR,
    });
    expect(no).toBe(`001-INVDOM/${jobNo}/VIII/${TEST_YEAR}`);
    expect(jobNo).toBe("ISLI-99.07-001");
  });

  it("20 alokasi konkuren invoice jenis sama → 20 nomor unik 001..020", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        db.transaction((tx) =>
          allocateInvoiceNumber(tx, {
            invType: "INVIMP",
            issueYear: TEST_YEAR,
            issueMonth: 7,
          }),
        ),
      ),
    );
    expect(new Set(results).size).toBe(20);
    expect([...results].sort((a, b) => a - b)).toEqual(
      Array.from({ length: 20 }, (_, i) => i + 1),
    );
  });
});
