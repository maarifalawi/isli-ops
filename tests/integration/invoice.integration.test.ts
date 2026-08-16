import { and, eq, inArray, like } from "drizzle-orm";

/*
 * Test integrasi invoice customer — Irisan 6. BUTUH DATABASE_URL (.env.local).
 *
 * Membuktikan (keputusan user 17 Agu 2026):
 *   - createDraft: job non-FINAL ditolak (R9.4); TANPA POD ditolak sejak
 *     create (R9.4); DRAFT tanpa nomor/angka; satu job = satu invoice aktif.
 *   - R9.4b: jalur terbit-dulu butuh izin OWNER ≠ pembuat (Q78).
 *   - issue: pajak dari charge lines aktif DIBEKUKAN (I-INV-1) dengan angka
 *     persis Materee 06-012 (23.848.600); nomor R2.1 romawi bulan terbit
 *     (R2.2); terbilang tersimpan (ADR-0005); snapshot invoice_lines; ubah
 *     charge line SETELAH issue TIDAK mengubah invoice (beku).
 *   - dueDate manual wajib (R9.2); tidak dihitung service.
 *   - send → pay_partial → pay_full (TERBAYAR_SEBAGIAN → LUNAS terminal).
 *   - void: MANAGER ditolak (invoice:void OWNER saja — konflik #1), alasan
 *     wajib, nomor tidak dipakai ulang (I-INV-2); TERBIT memblokir unlock
 *     (J-INV-3), BATAL membuka unlock, LUNAS memblokir PERMANEN (J-INV-4),
 *     DRAFT tidak menghalangi unlock.
 *   - Addendum R16: seq 1 & 2 tidak bentrok; pajak dihitung ULANG saat
 *     terbitkan (R16.3); approve ≠ pembuat (R-A1/Q70).
 *   - Konkurensi: dua issue bersamaan → nomor berbeda (allocator row-lock).
 *
 * Isolasi: tahun 2094 (2095-2100 dipakai test lain), prefix ZZI6.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../../src/db/index";
import {
  auditLog,
  chargeCodes,
  chargeLines,
  customerInvoiceAddenda,
  customerInvoices,
  customers,
  invoiceLines,
  invoiceSequence,
  jobs,
  paymentsIn,
  users,
} from "../../src/db/schema/index";
import {
  bayarSebagian,
  buatAddendum,
  createDraftInvoice,
  hapusDraftInvoice,
  issueInvoice,
  lunasiInvoice,
  sendInvoice,
  setujuiAddendum,
  terbitkanAddendum,
  ubahDraftInvoice,
  voidInvoice,
} from "../../src/lib/invoice/index";
import { requestUnlock, unlockGranted } from "../../src/lib/state-machine/transisi";

const TEST_YEAR = 2094;
const PREFIX = "ZZI6 ";

let uStaff = { id: "", role: "STAFF" as const };
let uMgr = { id: "", role: "MANAGER" as const };
let uOwn = { id: "", role: "OWNER" as const };

let jobMateree = ""; // FINAL + POD — kasus Materee
let jobNoPod = ""; // FINAL tanpa POD — R9.4/R9.4b
let jobBuka = ""; // FINAL + invoice TERBIT — J-INV-3
let jobBatal = ""; // FINAL + invoice VOID — unlock terbuka lagi
let jobLunas = ""; // FINAL + invoice LUNAS — J-INV-4 permanen
let jobDraftInv = ""; // FINAL + invoice DRAFT — unlock tetap boleh
let customerId = "";

async function buatJobFinal(no: string, running: number, makerId: string) {
  const [j] = await db
    .insert(jobs)
    .values({
      seqScope: "DOM",
      tahun: TEST_YEAR,
      bulan: 3,
      running,
      jobNo: no,
      customerId,
      legFreight: true,
      makerId,
      status: "FINAL",
    })
    .returning({ id: jobs.id });
  return j?.id ?? "";
}

async function bersihkan() {
  const semuaJob = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(eq(jobs.tahun, TEST_YEAR));
  const ids = semuaJob.map((j) => j.id);
  if (ids.length > 0) {
    const invRows = await db
      .select({ id: customerInvoices.id })
      .from(customerInvoices)
      .where(inArray(customerInvoices.jobId, ids));
    const invIds = invRows.map((r) => r.id);
    if (invIds.length > 0) {
      await db.delete(paymentsIn).where(inArray(paymentsIn.invoiceId, invIds));
      await db.delete(invoiceLines).where(inArray(invoiceLines.invoiceId, invIds));
      await db
        .delete(customerInvoiceAddenda)
        .where(inArray(customerInvoiceAddenda.originalInvoiceId, invIds));
      await db.delete(customerInvoices).where(inArray(customerInvoices.id, invIds));
    }
    await db.delete(auditLog).where(inArray(auditLog.entitasId, ids));
    await db.delete(chargeLines).where(inArray(chargeLines.jobId, ids));
    await db.delete(jobs).where(eq(jobs.tahun, TEST_YEAR));
  }
  await db.delete(invoiceSequence).where(eq(invoiceSequence.issueYear, TEST_YEAR));
}

async function hitungAudit(invoiceId: string, aksi: string) {
  const rows = await db
    .select({ aksi: auditLog.aksi })
    .from(auditLog)
    .where(
      and(eq(auditLog.entitas, "CUSTOMER_INVOICE"), eq(auditLog.entitasId, invoiceId)),
    );
  return rows.filter((r) => r.aksi === aksi).length;
}

describe("invoice customer (integrasi DB)", { timeout: 240_000 }, () => {
  let invMateree = "";
  let invBuka = "";
  let invBatal = "";
  let invLunas = "";
  let _invDraft = "";

  beforeAll(async () => {
    const [staff] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "STAFF"))
      .limit(1);
    const [mgr] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "MANAGER"))
      .limit(1);
    const [own] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.role, "OWNER"))
      .limit(1);
    if (!staff || !mgr || !own) throw new Error("Seed user kurang — jalankan seed dulu.");
    uStaff = { id: staff.id, role: "STAFF" };
    uMgr = { id: mgr.id, role: "MANAGER" };
    uOwn = { id: own.id, role: "OWNER" };

    await bersihkan();
    await db.delete(chargeCodes).where(like(chargeCodes.kode, "ZZI6%"));
    await db.insert(chargeCodes).values([
      { kode: "ZZI6FREIGHT", keterangan: "Freight uji", butuhVendor: false },
      { kode: "ZZI6REIMB", keterangan: "Reimburse uji", butuhVendor: false },
    ]);
    await db.delete(customers).where(like(customers.nama, `${PREFIX}%`));
    const [c] = await db
      .insert(customers)
      .values({ nama: `${PREFIX}Materee` })
      .returning({ id: customers.id });
    customerId = c?.id ?? "";

    jobMateree = await buatJobFinal("ISLI-94.03-001", 1, uStaff.id);
    jobNoPod = await buatJobFinal("ISLI-94.03-002", 2, uStaff.id);
    jobBuka = await buatJobFinal("ISLI-94.03-003", 3, uStaff.id);
    jobBatal = await buatJobFinal("ISLI-94.03-004", 4, uStaff.id);
    jobLunas = await buatJobFinal("ISLI-94.03-005", 5, uStaff.id);
    jobDraftInv = await buatJobFinal("ISLI-94.03-006", 6, uStaff.id);

    // Baris selling ala invoice Materee asli: 22.600.000 + reimburse 1.000.000.
    for (const id of [jobMateree, jobBuka, jobBatal, jobLunas, jobDraftInv]) {
      await db.insert(chargeLines).values([
        {
          jobId: id,
          chargeCode: "ZZI6FREIGHT",
          sellingIdr: 22_600_000n,
          pencadanganIdr: 20_000_000n,
          createdBy: uStaff.id,
        },
        {
          jobId: id,
          chargeCode: "ZZI6REIMB",
          sellingIdr: 1_000_000n,
          pencadanganIdr: 1_000_000n,
          isReimburse: true,
          createdBy: uStaff.id,
        },
      ]);
    }
    await db.insert(chargeLines).values([
      {
        jobId: jobNoPod,
        chargeCode: "ZZI6FREIGHT",
        sellingIdr: 5_000_000n,
        pencadanganIdr: 4_000_000n,
        createdBy: uStaff.id,
      },
    ]);
  });

  afterAll(async () => {
    await bersihkan();
    await db.delete(customers).where(like(customers.nama, `${PREFIX}%`));
    await db.delete(chargeCodes).where(like(chargeCodes.kode, "ZZI6%"));
    await db.$client.end();
  });

  // ── CREATE DRAFT ──────────────────────────────────────────────────────────

  it("job non-FINAL ditolak saat create draft (R9.4 syarat awal)", async () => {
    const [draft] = await db
      .insert(jobs)
      .values({
        seqScope: "DOM",
        tahun: TEST_YEAR,
        bulan: 3,
        running: 9,
        jobNo: "ISLI-94.03-009",
        customerId,
        legFreight: true,
        makerId: uStaff.id,
      })
      .returning({ id: jobs.id });
    const r = await createDraftInvoice(db, uMgr, {
      jobId: draft?.id ?? "",
      pph23Applicable: false,
      podDiterimaAt: "2094-06-14",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("FINAL");
    await db.delete(jobs).where(eq(jobs.id, draft?.id ?? ""));
  });

  it("create draft TANPA POD ditolak sejak awal (R9.4 — dicek di create)", async () => {
    const r = await createDraftInvoice(db, uMgr, {
      jobId: jobNoPod,
      pph23Applicable: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("POD");
  });

  it("R9.4b: draft tanpa POD + izin MANAGER ditolak; izin OWNER ≠ pembuat lolos sampai terbit", async () => {
    const m = await createDraftInvoice(db, uMgr, {
      jobId: jobNoPod,
      pph23Applicable: false,
      issuedBeforePod: true,
      earlyIssueApprovedBy: uMgr.id,
    });
    expect(m.ok).toBe(false);
    if (!m.ok) expect(m.error).toContain("OWNER");

    const o = await createDraftInvoice(db, uMgr, {
      jobId: jobNoPod,
      pph23Applicable: false,
      issuedBeforePod: true,
      earlyIssueApprovedBy: uOwn.id,
    });
    expect(o.ok).toBe(true);
    if (o.ok) {
      const i = await issueInvoice(db, uMgr, {
        invoiceId: o.data.id,
        issueDate: "2094-06-14",
        dueDate: "2094-06-28",
        pph23Applicable: false,
      });
      expect(i.ok).toBe(true);
    }
  });

  it("create draft oleh MANAGER + POD -> DRAFT tanpa nomor & tanpa angka", async () => {
    const r = await createDraftInvoice(db, uMgr, {
      jobId: jobMateree,
      pph23Applicable: false,
      podDiterimaAt: "2094-07-14",
    });
    expect(r.ok).toBe(true);
    if (r.ok) invMateree = r.data.id;
    const [inv] = await db
      .select()
      .from(customerInvoices)
      .where(eq(customerInvoices.id, invMateree));
    expect(inv?.status).toBe("DRAFT");
    expect(inv?.invoiceNo).toBeNull();
    expect(inv?.grandTotalIdr).toBe(0n);
  });

  it("draft bisa diedit (pph23) dan dihapus — hard delete tanpa jejak uang", async () => {
    const e = await ubahDraftInvoice(db, uMgr, invMateree, { pph23Applicable: false });
    expect(e.ok).toBe(true);
    const tmp = await createDraftInvoice(db, uMgr, {
      jobId: jobMateree,
      pph23Applicable: false,
      podDiterimaAt: "2094-07-14",
    });
    expect(tmp.ok).toBe(true);
    if (tmp.ok) {
      const h = await hapusDraftInvoice(db, uMgr, tmp.data.id);
      expect(h.ok).toBe(true);
    }
  });

  // ── ISSUE ─────────────────────────────────────────────────────────────────

  it("issue STAFF ditolak (invoice:issue)", async () => {
    const r = await issueInvoice(db, uStaff, {
      invoiceId: invMateree,
      issueDate: "2094-07-14",
      dueDate: "2094-08-13",
      pph23Applicable: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("tidak berwenang");
  });

  it("issue tanpa dueDate ditolak (R9.2 manual wajib)", async () => {
    const r = await issueInvoice(db, uMgr, {
      invoiceId: invMateree,
      issueDate: "2094-07-14",
      dueDate: "",
      pph23Applicable: false,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("jatuh tempo");
  });

  it("issue -> TERBIT: angka Materee 23.848.600 beku + nomor romawi VII + terbilang + snapshot", async () => {
    const r = await issueInvoice(db, uMgr, {
      invoiceId: invMateree,
      issueDate: "2094-07-14",
      dueDate: "2094-08-13",
      pph23Applicable: false,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.data.invoiceNo).toBe("001-INVDOM/ISLI-94.03-001/VII/2094");
    }
    const [inv] = await db
      .select()
      .from(customerInvoices)
      .where(eq(customerInvoices.id, invMateree));
    expect(inv?.status).toBe("TERBIT");
    expect(inv?.subTotalIdr).toBe(23_600_000n);
    expect(inv?.reimburseIdr).toBe(1_000_000n);
    expect(inv?.dppIdr).toBe(22_600_000n);
    expect(inv?.ppnRateBp).toBe(110);
    expect(inv?.ppnIdr).toBe(248_600n);
    expect(inv?.pph23Idr).toBe(0n);
    expect(inv?.grandTotalIdr).toBe(23_848_600n); // golden Materee
    expect(inv?.terbilang).toBe(
      "dua puluh tiga juta delapan ratus empat puluh delapan ribu enam ratus rupiah",
    );
    expect(inv?.taxRuleVersion).toBe("2026.1");
    expect(inv?.topDays).toBe(30); // DOM
    const rincian = await db
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, invMateree));
    expect(rincian).toHaveLength(2);
    expect(rincian.find((l) => l.isReimburse)?.amountIdr).toBe(1_000_000n);
    expect(await hitungAudit(invMateree, "ISSUE")).toBe(1);
  });

  it("issue membeku: ubah charge line SETELAH issue → angka invoice TIDAK berubah (I-INV-1)", async () => {
    const [line] = await db
      .select({ id: chargeLines.id })
      .from(chargeLines)
      .where(
        and(eq(chargeLines.jobId, jobMateree), eq(chargeLines.chargeCode, "ZZI6FREIGHT")),
      )
      .limit(1);
    if (line) {
      await db
        .update(chargeLines)
        .set({ sellingIdr: 99_999_999n })
        .where(eq(chargeLines.id, line.id));
    }
    const [inv] = await db
      .select()
      .from(customerInvoices)
      .where(eq(customerInvoices.id, invMateree));
    expect(inv?.subTotalIdr).toBe(23_600_000n); // beku
    expect(inv?.grandTotalIdr).toBe(23_848_600n);
    const rincian = await db
      .select()
      .from(invoiceLines)
      .where(eq(invoiceLines.invoiceId, invMateree));
    expect(rincian.find((l) => !l.isReimburse)?.amountIdr).toBe(22_600_000n); // snapshot beku
  });

  it("issue kedua atas invoice sama DITOLAK (I-INV-1: TERBIT bukan DRAFT)", async () => {
    const r = await issueInvoice(db, uMgr, {
      invoiceId: invMateree,
      issueDate: "2094-07-15",
      dueDate: "2094-08-14",
      pph23Applicable: false,
    });
    expect(r.ok).toBe(false);
  });

  it("satu job satu invoice aktif: draft kedua atas job TERBIT ditolak", async () => {
    const r = await createDraftInvoice(db, uMgr, {
      jobId: jobMateree,
      pph23Applicable: false,
      podDiterimaAt: "2094-07-14",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("invoice aktif");
  });

  it("konkurensi: dua issue bersamaan mendapat nomor BERBEDA (row-lock allocator)", async () => {
    const a = await createDraftInvoice(db, uMgr, {
      jobId: jobBuka,
      pph23Applicable: false,
      podDiterimaAt: "2094-07-14",
    });
    const b = await createDraftInvoice(db, uMgr, {
      jobId: jobBatal,
      pph23Applicable: false,
      podDiterimaAt: "2094-07-14",
    });
    const c = await createDraftInvoice(db, uMgr, {
      jobId: jobLunas,
      pph23Applicable: false,
      podDiterimaAt: "2094-07-14",
    });
    const d = await createDraftInvoice(db, uMgr, {
      jobId: jobDraftInv,
      pph23Applicable: false,
      podDiterimaAt: "2094-07-14",
    });
    expect(a.ok && b.ok && c.ok && d.ok).toBe(true);
    if (a.ok) invBuka = a.data.id;
    if (b.ok) invBatal = b.data.id;
    if (c.ok) invLunas = c.data.id;
    if (d.ok) _invDraft = d.data.id;
    const [r1, r2] = await Promise.all([
      issueInvoice(db, uMgr, {
        invoiceId: invBuka,
        issueDate: "2094-07-14",
        dueDate: "2094-08-13",
        pph23Applicable: false,
      }),
      issueInvoice(db, uMgr, {
        invoiceId: invBatal,
        issueDate: "2094-07-14",
        dueDate: "2094-08-13",
        pph23Applicable: false,
      }),
    ]);
    expect(r1.ok && r2.ok).toBe(true);
    if (r1.ok && r2.ok) {
      expect(r1.data.invoiceNo).not.toBe(r2.data.invoiceNo);
    }
  });

  // ── SEND / PAY ────────────────────────────────────────────────────────────

  it("send oleh STAFF ditolak; MANAGER -> TERKIRIM + sent_date", async () => {
    const s = await sendInvoice(db, uStaff, invMateree);
    expect(s.ok).toBe(false);
    const r = await sendInvoice(db, uMgr, invMateree);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.status).toBe("TERKIRIM");
    const [inv] = await db
      .select()
      .from(customerInvoices)
      .where(eq(customerInvoices.id, invMateree));
    expect(inv?.sentDate).not.toBeNull();
    expect(await hitungAudit(invMateree, "SEND")).toBe(1);
  });

  it("pay_partial >= sisa DITOLAK saat masih TERKIRIM (wajib < sisa = grand total)", async () => {
    const r = await bayarSebagian(db, uMgr, invMateree, 23_848_600n, "2094-08-02");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("KURANG");
  });

  it("pay_partial 1.000.000 -> TERBAYAR_SEBAGIAN + baris payments_in", async () => {
    const r = await bayarSebagian(db, uStaff, invMateree, 1_000_000n, "2094-08-01");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.status).toBe("TERBAYAR_SEBAGIAN");
    const pays = await db
      .select()
      .from(paymentsIn)
      .where(eq(paymentsIn.invoiceId, invMateree));
    expect(pays).toHaveLength(1);
    expect(pays[0]?.jumlahIdr).toBe(1_000_000n);
  });

  it("pay_partial kedua dari TERBAYAR_SEBAGIAN DITOLAK (§2: hanya pay_full dari sana)", async () => {
    const r = await bayarSebagian(db, uMgr, invMateree, 500_000n, "2094-08-02");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Transisi tidak sah");
  });

  it("pay_full menutup sisa -> LUNAS + audit PAY_FULL = 1", async () => {
    const r = await lunasiInvoice(db, uMgr, invMateree, "2094-08-13");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.status).toBe("LUNAS");
    const pays = await db
      .select()
      .from(paymentsIn)
      .where(eq(paymentsIn.invoiceId, invMateree));
    expect(pays.reduce((s, p) => s + p.jumlahIdr, 0n)).toBe(23_848_600n);
    expect(await hitungAudit(invMateree, "PAY_FULL")).toBe(1);
  });

  it("I-INV-3: LUNAS terminal — send/pay/void semua ditolak", async () => {
    expect((await sendInvoice(db, uMgr, invMateree)).ok).toBe(false);
    expect((await lunasiInvoice(db, uMgr, invMateree, "2094-09-01")).ok).toBe(false);
    expect((await voidInvoice(db, uOwn, invMateree, "salah ketik")).ok).toBe(false);
  });

  // ── VOID + J-INV-3/4 (gap test Irisan 5) ─────────────────────────────────

  it("void oleh MANAGER DITOLAK (invoice:void = OWNER saja — konflik #1)", async () => {
    const r = await voidInvoice(db, uMgr, invBatal, "salah nominal");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("tidak berwenang");
  });

  it("void tanpa alasan DITOLAK", async () => {
    const r = await voidInvoice(db, uOwn, invBatal, "  ");
    expect(r.ok).toBe(false);
  });

  it("job dengan invoice TERBIT tidak bisa di-unlock (J-INV-3 — gap Irisan 5)", async () => {
    const req = await requestUnlock(db, uMgr, jobBuka, "uji", "https://contoh/ba.pdf");
    expect(req.ok).toBe(true);
    const r = await unlockGranted(db, uOwn, jobBuka, "coba");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("J-INV-3");
  });

  it("job dengan invoice LUNAS tidak bisa di-unlock PERMANEN (J-INV-4 — gap Irisan 5)", async () => {
    const terbit = await issueInvoice(db, uMgr, {
      invoiceId: invLunas,
      issueDate: "2094-07-14",
      dueDate: "2094-08-13",
      pph23Applicable: false,
    });
    expect(terbit.ok).toBe(true);
    await sendInvoice(db, uMgr, invLunas);
    const lunas = await lunasiInvoice(db, uMgr, invLunas, "2094-08-13");
    expect(lunas.ok).toBe(true);
    const req = await requestUnlock(
      db,
      uMgr,
      jobLunas,
      "uji lunas",
      "https://contoh/ba3.pdf",
    );
    expect(req.ok).toBe(true);
    const r = await unlockGranted(db, uOwn, jobLunas, "coba permanen");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("J-INV-3");
  });

  it("job dengan invoice DRAFT tetap boleh di-unlock (DRAFT belum berdampak)", async () => {
    const req = await requestUnlock(
      db,
      uMgr,
      jobDraftInv,
      "perbaiki sebelum terbit",
      "https://contoh/ba4.pdf",
    );
    expect(req.ok).toBe(true);
    const r = await unlockGranted(db, uOwn, jobDraftInv, "Invoice masih draft — aman");
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.status).toBe("DRAFT");
  });

  it("void oleh OWNER -> BATAL + audit VOID beralasan", async () => {
    const r = await voidInvoice(
      db,
      uOwn,
      invBatal,
      "Nominal salah — akan diterbitkan ulang.",
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.status).toBe("BATAL");
    expect(await hitungAudit(invBatal, "VOID")).toBe(1);
  });

  it("setelah invoice BATAL, job bisa di-unlock lagi (J-INV-3: batalkan invoice dulu)", async () => {
    const req = await requestUnlock(
      db,
      uMgr,
      jobBatal,
      "perbaiki harga",
      "https://contoh/ba2.pdf",
    );
    expect(req.ok).toBe(true);
    const r = await unlockGranted(
      db,
      uOwn,
      jobBatal,
      "Disetujui setelah invoice dibatalkan",
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.status).toBe("DRAFT");
  });

  it("nomor invoice BATAL tidak dipakai ulang (I-INV-2) — counter jalan terus", async () => {
    const [seq] = await db
      .select()
      .from(invoiceSequence)
      .where(
        and(
          eq(invoiceSequence.invType, "INVDOM"),
          eq(invoiceSequence.issueYear, TEST_YEAR),
          eq(invoiceSequence.issueMonth, 7),
        ),
      );
    expect(seq?.lastRunning).toBeGreaterThanOrEqual(3); // tidak reset setelah void
  });

  // ── ADDENDUM R16 ──────────────────────────────────────────────────────────

  it("addendum seq 1 & 2 pada satu invoice asal tidak bentrok; pajak selisih default Q69", async () => {
    const a1 = await buatAddendum(db, uMgr, {
      originalInvoiceId: invMateree,
      amountIdr: 1_000_000n,
      labelInternal: "SUSULAN-1",
      alasan: "Kurang tagih 1 juta",
      pph23Applicable: false,
      issueYear: TEST_YEAR,
      issueMonth: 8,
    });
    expect(a1.ok).toBe(true);
    if (a1.ok) expect(a1.data.addendumSeq).toBe(1);
    const a2 = await buatAddendum(db, uMgr, {
      originalInvoiceId: invMateree,
      amountIdr: 500_000n,
      labelInternal: "SUSULAN-2",
      alasan: "Koreksi tambahan",
      pph23Applicable: false,
      issueYear: TEST_YEAR,
      issueMonth: 9,
    });
    expect(a2.ok).toBe(true);
    if (a2.ok) expect(a2.data.addendumSeq).toBe(2);

    const [row] = await db
      .select()
      .from(customerInvoiceAddenda)
      .where(eq(customerInvoiceAddenda.id, a1.ok ? a1.data.id : ""));
    expect(row?.dppIdr).toBe(1_000_000n);
    expect(row?.ppnIdr).toBe(11_000n);
    expect(row?.grandTotalIdr).toBe(1_011_000n);
    // Invoice asal TIDAK berubah (I-INV-1).
    const [asal] = await db
      .select()
      .from(customerInvoices)
      .where(eq(customerInvoices.id, invMateree));
    expect(asal?.grandTotalIdr).toBe(23_848_600n);
  });

  it("approve addendum oleh pembuat sendiri DITOLAK (R-A1/Q70)", async () => {
    const rows = await db
      .select()
      .from(customerInvoiceAddenda)
      .where(eq(customerInvoiceAddenda.originalInvoiceId, invMateree));
    const target = rows.find((r) => r.addendumSeq === 1);
    expect(target).toBeTruthy();
    const r = await setujuiAddendum(db, uMgr, target?.id ?? ""); // createdBy = uMgr
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("R-A1");
  });

  it("setujui (Owner) lalu terbitkan (param pph23 eksplisit) — DRAFT->DISETUJUI->ISSUED", async () => {
    const rows = await db
      .select()
      .from(customerInvoiceAddenda)
      .where(eq(customerInvoiceAddenda.originalInvoiceId, invMateree));
    const target = rows.find((r) => r.addendumSeq === 1);
    const ok1 = await setujuiAddendum(db, uOwn, target?.id ?? "");
    expect(ok1.ok).toBe(true);
    const ok2 = await terbitkanAddendum(db, uMgr, target?.id ?? "", false);
    expect(ok2.ok).toBe(true);
    const [after] = await db
      .select()
      .from(customerInvoiceAddenda)
      .where(eq(customerInvoiceAddenda.id, target?.id ?? ""));
    expect(after?.status).toBe("ISSUED");
    expect(after?.approvedBy).toBe(uOwn.id);
    // Pajak dihitung ulang saat terbitkan (R16.3) — versi SAAT itu.
    expect(after?.taxRuleVersion).toBe("2026.1");
    expect(after?.grandTotalIdr).toBe(1_011_000n);
  });

  it("terbitkan addendum yang belum disetujui DITOLAK (R16.5)", async () => {
    const rows = await db
      .select()
      .from(customerInvoiceAddenda)
      .where(eq(customerInvoiceAddenda.originalInvoiceId, invMateree));
    const target = rows.find((r) => r.addendumSeq === 2);
    const r = await terbitkanAddendum(db, uMgr, target?.id ?? "", false);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("disetujui");
  });

  it("tepat 1 baris audit per aksi invoice (CREATE/ISSUE/SEND/PAY_*)", async () => {
    expect(await hitungAudit(invMateree, "CREATE")).toBe(1);
    expect(await hitungAudit(invMateree, "ISSUE")).toBe(1);
    expect(await hitungAudit(invMateree, "SEND")).toBe(1);
    expect(await hitungAudit(invMateree, "PAY_PARTIAL")).toBe(1);
    expect(await hitungAudit(invMateree, "PAY_FULL")).toBe(1);
  });
});
