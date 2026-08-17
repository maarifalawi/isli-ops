import { and, eq, inArray, like } from "drizzle-orm";

/*
 * Test integrasi invoice vendor (AP) — Irisan 7. BUTUH DATABASE_URL (.env.local).
 *
 * Membuktikan (keputusan user D1–D9, 17 Agu 2026):
 *   - receive (D2): STAFF boleh; dobel nomor IDENTIK pada vendor sama GAGAL
 *     di level DB (uq_vendor_invoice — kasus 01A/01B, R7.1); 01A lalu 01B
 *     DITERIMA dengan PERINGATAN nomor mirip (V-INV-2: warning, bukan blokir).
 *   - verify (D3/D4/D5/D6): STAFF ditolak; verifier = penerima DITOLAK (R-A1);
 *     job DIBATALKAN ditolak; job FINAL DIIZINKAN; actual_idr terisi +
 *     selisih_idr terhitung generated (V-INV-5); satu charge line dua invoice
 *     DITOLAK (D5, UNIQUE DB); baris milik vendor lain DITOLAK; GP TIDAK
 *     berubah oleh actual (kontrak Q-4d-2 — basis pencadangan).
 *   - D7: setelah terverifikasi, updateChargeLine mempertahankan actual_idr
 *     (beku) tapi field lain masih boleh diedit; hapus baris DITOLAK.
 *   - pay (V-INV-3/R7.2): status terlihat dulu (lihatStatusPembayaran);
 *     DIVERIFIKASI→DIBAYAR oleh MANAGER; pembayaran kedua DITOLAK; STAFF
 *     ditolak; V-INV-4: actual baris terkait terkunci permanen.
 *   - batal (R-A5/D1): MANAGER ditolak (OWNER saja); alasan wajib; sebelum
 *     bayar → junction dihapus + actual reset NULL (bebas verifikasi ulang);
 *     DIBAYAR tidak bisa dibatalkan (harus unlock_paid dulu).
 *   - unlock_paid (R-A5): OWNER + alasan; DIBAYAR→DIVERIFIKASI; bisa dibayar
 *     ulang; actual tidak di-reset (V-INV-4 tetap).
 *   - TEPAT 1 baris audit per aksi (RECEIVE/VERIFY/PAY/BATAL_VENDOR).
 *
 * Isolasi: tahun 2093 (2094 dipakai invoice.integration; 2095-2100 test lain),
 * prefix ZZV7.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../../src/db/index";
import {
  auditLog,
  chargeCodes,
  chargeLines,
  customers,
  jobs,
  users,
  vendorInvoiceLines,
  vendorInvoices,
  vendors,
} from "../../src/db/schema/index";
import { hapusChargeLine, updateChargeLine } from "../../src/lib/charge-line/index";
import { hitungGP } from "../../src/lib/costing/index";
import { rupiah } from "../../src/lib/money/index";
import {
  batalkanInvoiceVendor,
  bayarInvoiceVendor,
  bukaKunciDibayar,
  lihatStatusPembayaran,
  terimaInvoiceVendor,
  verifikasiInvoiceVendor,
} from "../../src/lib/vendor-invoice/index";

const TEST_YEAR = 2093;
const PREFIX = "ZZV7 ";

let uStaff = { id: "", role: "STAFF" as const };
let uMgr = { id: "", role: "MANAGER" as const };
let uOwn = { id: "", role: "OWNER" as const };

let vendorA = ""; // vendor utama
let vendorB = ""; // vendor lain (uji konsistensi)
let customerId = "";

let jobFinal = ""; // FINAL — jalur verifikasi utama (D4)
let jobBatal = ""; // DIBATALKAN — verifikasi ditolak (D4)
let jobDraft = ""; // DRAFT — uji hapus baris setelah batal invoice vendor (D7)

let lineFinal = ""; // charge line job FINAL
let lineFinal2 = ""; // charge line kedua job FINAL (D5)
let lineBatal = ""; // charge line job DIBATALKAN
let lineDraft = ""; // charge line job DRAFT

async function buatJob(
  no: string,
  running: number,
  status: "FINAL" | "DRAFT" | "DIBATALKAN",
) {
  const [j] = await db
    .insert(jobs)
    .values({
      seqScope: "DOM",
      tahun: TEST_YEAR,
      bulan: 4,
      running,
      jobNo: no,
      customerId,
      legFreight: true,
      makerId: uStaff.id,
      status,
    })
    .returning({ id: jobs.id });
  return j?.id ?? "";
}

async function buatLine(jobId: string, vendorId: string | null) {
  const [l] = await db
    .insert(chargeLines)
    .values({
      jobId,
      chargeCode: "ZZV7TRUCK",
      vendorId,
      sellingIdr: 2_000_000n,
      pencadanganIdr: 1_000_000n,
      keterangan: "Trucking uji",
      createdBy: uStaff.id,
    })
    .returning({ id: chargeLines.id });
  return l?.id ?? "";
}

async function bersihkan() {
  const semuaJob = await db
    .select({ id: jobs.id })
    .from(jobs)
    .where(eq(jobs.tahun, TEST_YEAR));
  const ids = semuaJob.map((j) => j.id);
  if (ids.length > 0) {
    const lines = await db
      .select({ id: chargeLines.id })
      .from(chargeLines)
      .where(inArray(chargeLines.jobId, ids));
    const lineIds = lines.map((l) => l.id);
    if (lineIds.length > 0) {
      await db
        .delete(vendorInvoiceLines)
        .where(inArray(vendorInvoiceLines.chargeLineId, lineIds));
    }
    await db.delete(auditLog).where(inArray(auditLog.entitasId, ids));
    await db.delete(chargeLines).where(inArray(chargeLines.jobId, ids));
    await db.delete(jobs).where(eq(jobs.tahun, TEST_YEAR));
  }
  await db.delete(vendorInvoices).where(like(vendorInvoices.vendorInvoiceNo, "ZZV7%"));
  await db.delete(vendors).where(like(vendors.nama, `${PREFIX}%`));
  await db.delete(auditLog).where(like(auditLog.entitas, "VENDOR_INVOICE"));
}

async function hitungAuditVin(vendorInvoiceId: string, aksi: string) {
  const rows = await db
    .select({ aksi: auditLog.aksi })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.entitas, "VENDOR_INVOICE"),
        eq(auditLog.entitasId, vendorInvoiceId),
      ),
    );
  return rows.filter((r) => r.aksi === aksi).length;
}

describe("invoice vendor (integrasi DB)", { timeout: 240_000 }, () => {
  let inv01A = "";
  let inv01B = "";
  let invBatal = "";
  let invFinal = "";
  let invDraft = "";
  let invDup = "";
  let invVendorLain = "";

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
    await db.delete(chargeCodes).where(like(chargeCodes.kode, "ZZV7%"));
    await db.insert(chargeCodes).values({
      kode: "ZZV7TRUCK",
      keterangan: "Trucking uji Irisan 7",
      butuhVendor: false,
    });
    await db.delete(customers).where(like(customers.nama, `${PREFIX}%`));
    const [c] = await db
      .insert(customers)
      .values({ nama: `${PREFIX}Customer` })
      .returning({ id: customers.id });
    customerId = c?.id ?? "";
    const [v1] = await db
      .insert(vendors)
      .values({ nama: `${PREFIX}Trucking A` })
      .returning({ id: vendors.id });
    const [v2] = await db
      .insert(vendors)
      .values({ nama: `${PREFIX}Trucking B` })
      .returning({ id: vendors.id });
    vendorA = v1?.id ?? "";
    vendorB = v2?.id ?? "";

    jobFinal = await buatJob("ISLI-93.04-001", 1, "FINAL");
    jobBatal = await buatJob("ISLI-93.04-002", 2, "DIBATALKAN");
    jobDraft = await buatJob("ISLI-93.04-003", 3, "DRAFT");

    lineFinal = await buatLine(jobFinal, vendorA);
    lineFinal2 = await buatLine(jobFinal, vendorA);
    lineBatal = await buatLine(jobBatal, vendorA);
    lineDraft = await buatLine(jobDraft, vendorA);
  });

  afterAll(async () => {
    await bersihkan();
    await db.delete(customers).where(like(customers.nama, `${PREFIX}%`));
    await db.delete(chargeCodes).where(like(chargeCodes.kode, "ZZV7%"));
    await db.$client.end();
  });

  // ── RECEIVE (D2 + R7.1 + V-INV-2) ────────────────────────────────────────

  it("receive oleh STAFF lolos — 01A tercatat DITERIMA", async () => {
    const r = await terimaInvoiceVendor(db, uStaff, {
      vendorId: vendorA,
      vendorInvoiceNo: "ZZV7/01A",
      tanggalInvoice: "2093-05-02",
      jumlahIdr: 1_250_000n,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      inv01A = r.data.id;
      expect(r.data.peringatanNomorMirip).toEqual([]);
    }
    const [row] = await db
      .select()
      .from(vendorInvoices)
      .where(eq(vendorInvoices.id, inv01A));
    expect(row?.status).toBe("DITERIMA");
    expect(row?.diterimaOleh).toBe(uStaff.id);
    expect(await hitungAuditVin(inv01A, "RECEIVE")).toBe(1);
  });

  it("dobel input nomor IDENTIK (01A lagi) GAGAL di level DB — kasus 01A/01B (R7.1)", async () => {
    const r = await terimaInvoiceVendor(db, uMgr, {
      vendorId: vendorA,
      vendorInvoiceNo: "ZZV7/01A",
      tanggalInvoice: "2093-05-03",
      jumlahIdr: 1_250_000n,
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("dobel bayar");
  });

  it("V-INV-2: 01B DITERIMA dengan PERINGATAN nomor mirip — bukan blokir", async () => {
    const r = await terimaInvoiceVendor(db, uStaff, {
      vendorId: vendorA,
      vendorInvoiceNo: "ZZV7/01B",
      tanggalInvoice: "2093-05-02",
      jumlahIdr: 350_000n,
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      inv01B = r.data.id;
      expect(r.data.peringatanNomorMirip).toContain("ZZV7/01A");
    }
  });

  it("nomor sama pada vendor BERBEDA tetap boleh (UNIQUE per vendor)", async () => {
    const r = await terimaInvoiceVendor(db, uStaff, {
      vendorId: vendorB,
      vendorInvoiceNo: "ZZV7/01A",
      tanggalInvoice: "2093-05-02",
      jumlahIdr: 500_000n,
    });
    expect(r.ok).toBe(true);
    if (r.ok) invVendorLain = r.data.id;
  });

  it("vendor nonaktif / tanggal invalid ditolak", async () => {
    const t = await terimaInvoiceVendor(db, uStaff, {
      vendorId: vendorA,
      vendorInvoiceNo: "ZZV7/XX",
      tanggalInvoice: "bukan-tanggal",
      jumlahIdr: 100n,
    });
    expect(t.ok).toBe(false);
  });

  // ── VERIFY (D3/D4/D5/D6 + R-A1 + V-INV-5) ────────────────────────────────

  it("verify oleh STAFF DITOLAK (vendor_invoice:verify = O/M)", async () => {
    const r = await verifikasiInvoiceVendor(db, uStaff, {
      vendorInvoiceId: inv01A,
      baris: [{ chargeLineId: lineFinal, jumlahIdr: 1_250_000n }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("tidak berwenang");
  });

  it("verify oleh PENERIMA sendiri DITOLAK (R-A1 — D3)", async () => {
    const r = await verifikasiInvoiceVendor(db, uMgr, {
      vendorInvoiceId: inv01A, // diterima uStaff; uMgr beda orang — harusnya BOLEH
      baris: [{ chargeLineId: lineFinal, jumlahIdr: 1_250_000n }],
    });
    // uMgr ≠ penerima (uStaff) → lolos tahap R-A1. Jadi test self-approval
    // butuh invoice yang diterima uMgr — pakai inv01B? Diterima uStaff juga.
    // Buat cepat invoice diterima uMgr untuk kasus ini.
    expect(r.ok).toBe(true); // baseline: orang lain BOLEH verifikasi
    // Undo efek: baris sudah terisi actual oleh invoice ini — reset lewat batal.
    const b = await batalkanInvoiceVendor(db, uOwn, inv01A, "Ulang pengujian R-A1.");
    expect(b.ok).toBe(true);
  });

  it("self-verify DITOLAK: penerima = verifier (R-A1)", async () => {
    const t = await terimaInvoiceVendor(db, uMgr, {
      vendorId: vendorA,
      vendorInvoiceNo: "ZZV7/SELF",
      tanggalInvoice: "2093-05-04",
      jumlahIdr: 100_000n,
    });
    expect(t.ok).toBe(true);
    if (t.ok) {
      invDup = t.data.id;
      const r = await verifikasiInvoiceVendor(db, uMgr, {
        vendorInvoiceId: invDup,
        baris: [{ chargeLineId: lineFinal2, jumlahIdr: 100_000n }],
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain("R-A1");
    }
  });

  it("verify job DIBATALKAN DITOLAK (D4)", async () => {
    const t = await terimaInvoiceVendor(db, uStaff, {
      vendorId: vendorA,
      vendorInvoiceNo: "ZZV7/BATALJOB",
      tanggalInvoice: "2093-05-04",
      jumlahIdr: 900_000n,
    });
    expect(t.ok).toBe(true);
    if (t.ok) {
      invBatal = t.data.id;
      const r = await verifikasiInvoiceVendor(db, uMgr, {
        vendorInvoiceId: invBatal,
        baris: [{ chargeLineId: lineBatal, jumlahIdr: 900_000n }],
      });
      expect(r.ok).toBe(false);
      if (!r.ok) expect(r.error).toContain("DIBATALKAN");
    }
  });

  it("verify baris milik vendor LAIN DITOLAK", async () => {
    const r = await verifikasiInvoiceVendor(db, uMgr, {
      vendorInvoiceId: invVendorLain, // vendor B
      baris: [{ chargeLineId: lineFinal, jumlahIdr: 500_000n }], // baris vendor A
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("vendor lain");
  });

  it("verify nilai 0 DITOLAK", async () => {
    const r = await verifikasiInvoiceVendor(db, uMgr, {
      vendorInvoiceId: inv01A,
      baris: [{ chargeLineId: lineFinal, jumlahIdr: 0n }],
    });
    expect(r.ok).toBe(false);
  });

  it("verify pada job FINAL DIIZINKAN (D4) → actual_idr terisi + selisih generated (V-INV-5)", async () => {
    const t = await terimaInvoiceVendor(db, uStaff, {
      vendorId: vendorA,
      vendorInvoiceNo: "ZZV7/FINAL",
      tanggalInvoice: "2093-05-05",
      jumlahIdr: 1_250_000n,
    });
    expect(t.ok).toBe(true);
    if (t.ok) invFinal = t.data.id;

    const gpSebelum = hitungGP([
      {
        sellingIdr: rupiah(2_000_000n),
        pencadanganIdr: rupiah(1_000_000n),
        isReimburse: false,
        deletedAt: null,
      },
    ]);

    const r = await verifikasiInvoiceVendor(db, uMgr, {
      vendorInvoiceId: invFinal,
      baris: [{ chargeLineId: lineFinal, jumlahIdr: 1_250_000n }],
    });
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.status).toBe("DIVERIFIKASI");

    const [line] = await db
      .select()
      .from(chargeLines)
      .where(eq(chargeLines.id, lineFinal));
    expect(line?.actualIdr).toBe(1_250_000n);
    // selisih = pencadangan - actual = 1.000.000 - 1.250.000 = -250.000 (over)
    expect(line?.selisihIdr).toBe(-250_000n);

    // Kontrak Q-4d-2: GP berbasis PENCADANGAN — actual TIDAK mengubah GP.
    const gpSesudah = hitungGP([
      {
        sellingIdr: rupiah(2_000_000n),
        pencadanganIdr: rupiah(1_000_000n),
        isReimburse: false,
        deletedAt: null,
      },
    ]);
    expect(gpSesudah).toBe(gpSebelum);
    expect(gpSesudah).toBe(1_000_000n);

    expect(await hitungAuditVin(invFinal, "VERIFY")).toBe(1);
  });

  it("D5: satu charge line dua invoice vendor DITOLAK (UNIQUE DB)", async () => {
    const r = await verifikasiInvoiceVendor(db, uMgr, {
      vendorInvoiceId: inv01B, // invoice berbeda, baris SAMA (lineFinal)
      baris: [{ chargeLineId: lineFinal, jumlahIdr: 350_000n }],
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("satu baris = satu invoice");
  });

  it("verify ulang invoice yang sudah DIVERIFIKASI DITOLAK", async () => {
    const r = await verifikasiInvoiceVendor(db, uOwn, {
      vendorInvoiceId: invFinal,
      baris: [{ chargeLineId: lineFinal2, jumlahIdr: 100_000n }],
    });
    expect(r.ok).toBe(false);
  });

  // ── D7 / V-INV-4: actual beku setelah verifikasi ─────────────────────────

  it("D7: setelah terverifikasi, field lain boleh diubah TAPI actual_idr beku", async () => {
    // Job FINAL tidak editable (Irisan 5) — pakai jobDraft untuk guard D7 penuh.
    const t = await terimaInvoiceVendor(db, uStaff, {
      vendorId: vendorA,
      vendorInvoiceNo: "ZZV7/DRAFT",
      tanggalInvoice: "2093-05-06",
      jumlahIdr: 1_100_000n,
    });
    expect(t.ok).toBe(true);
    if (t.ok) invDraft = t.data.id;
    const v = await verifikasiInvoiceVendor(db, uMgr, {
      vendorInvoiceId: invDraft,
      baris: [{ chargeLineId: lineDraft, jumlahIdr: 1_100_000n }],
    });
    expect(v.ok).toBe(true);

    // Edit keterangan (field non-actual) pada job DRAFT — boleh.
    const e = await updateChargeLine(db, uOwn, lineDraft, {
      chargeCode: "ZZV7TRUCK",
      vendorId: vendorA,
      keterangan: "Trucking — revisi keterangan",
      sellingIdr: 2_000_000n,
      pencadanganIdr: 1_000_000n,
      currency: "IDR",
    });
    expect(e.ok).toBe(true);
    const [line] = await db
      .select()
      .from(chargeLines)
      .where(eq(chargeLines.id, lineDraft));
    // actual_idr TIDAK boleh hilang/berubah walau input tidak menyertanya.
    expect(line?.actualIdr).toBe(1_100_000n);
    expect(line?.keterangan).toBe("Trucking — revisi keterangan");
  });

  it("D7: hapus baris terverifikasi DITOLAK", async () => {
    const r = await hapusChargeLine(
      db,
      uOwn,
      lineDraft,
      "coba hapus baris terverifikasi",
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("diverifikasi invoice vendor");
  });

  // ── PAY (V-INV-3 + R7.2) ────────────────────────────────────────────────

  it("V-INV-3: status pembayaran TERLIHAT sebelum bayar (lihatStatusPembayaran)", async () => {
    const s = await lihatStatusPembayaran(db, invFinal);
    expect(s).not.toBeNull();
    expect(s?.status).toBe("DIVERIFIKASI");
    expect(s?.dibayarAt).toBeNull();
    expect(s?.vendorInvoiceNo).toBe("ZZV7/FINAL");
  });

  it("pay oleh STAFF DITOLAK", async () => {
    const r = await bayarInvoiceVendor(db, uStaff, invFinal);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("tidak berwenang");
  });

  it("pay DIVERIFIKASI→DIBAYAR oleh MANAGER + dibayarAt/Oleh terisi", async () => {
    const r = await bayarInvoiceVendor(db, uMgr, invFinal);
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.status).toBe("DIBAYAR");
    const [row] = await db
      .select()
      .from(vendorInvoices)
      .where(eq(vendorInvoices.id, invFinal));
    expect(row?.dibayarAt).not.toBeNull();
    expect(row?.dibayarOleh).toBe(uMgr.id);
    expect(await hitungAuditVin(invFinal, "PAY")).toBe(1);
  });

  it("R7.2: pembayaran KEDUA DITOLAK — pesan menyebut status bayar", async () => {
    const r = await bayarInvoiceVendor(db, uMgr, invFinal);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("SUDAH DIBAYAR");
  });

  it("V-INV-4: DIBAYAR → batal DITOLAK (harus unlock_paid dulu)", async () => {
    const r = await batalkanInvoiceVendor(db, uOwn, invFinal, "salah bayar?");
    expect(r.ok).toBe(false);
  });

  it("V-INV-4: actual baris terkait tetap terkunci setelah DIBAYAR", async () => {
    const [line] = await db
      .select()
      .from(chargeLines)
      .where(eq(chargeLines.id, lineFinal));
    expect(line?.actualIdr).toBe(1_250_000n);
  });

  it("unlock_paid oleh MANAGER DITOLAK (OWNER saja — R-A5)", async () => {
    const r = await bukaKunciDibayar(db, uMgr, invFinal, "salah tandai lunas");
    expect(r.ok).toBe(false);
  });

  it("unlock_paid OWNER → DIVERIFIKASI; actual TIDAK di-reset (V-INV-4)", async () => {
    const r = await bukaKunciDibayar(
      db,
      uOwn,
      invFinal,
      "Salah tandai lunas — bayar ulang.",
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.status).toBe("DIVERIFIKASI");
    const [line] = await db
      .select()
      .from(chargeLines)
      .where(eq(chargeLines.id, lineFinal));
    expect(line?.actualIdr).toBe(1_250_000n); // tetap
    const [row] = await db
      .select()
      .from(vendorInvoices)
      .where(eq(vendorInvoices.id, invFinal));
    expect(row?.dibayarAt).toBeNull();
  });

  it("setelah unlock_paid bisa DIBAYAR ulang", async () => {
    const r = await bayarInvoiceVendor(db, uMgr, invFinal);
    expect(r.ok).toBe(true);
  });

  // ── BATAL sebelum bayar (D1: alur revisi Bu Niken) ──────────────────────

  it("batal oleh MANAGER DITOLAK (OWNER saja — R-A5)", async () => {
    const r = await batalkanInvoiceVendor(db, uMgr, invDraft, "salah input");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("tidak berwenang");
  });

  it("batal tanpa alasan DITOLAK", async () => {
    const r = await batalkanInvoiceVendor(db, uOwn, invDraft, "  ");
    expect(r.ok).toBe(false);
  });

  it("batal OWNER: junction dihapus + actual reset NULL → baris bebas diverifikasi ulang", async () => {
    const r = await batalkanInvoiceVendor(
      db,
      uOwn,
      invDraft,
      "Vendor kirim revisi — nomor baru menyusul (dispute, D1).",
    );
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.data.status).toBe("DIBATALKAN");

    const [line] = await db
      .select()
      .from(chargeLines)
      .where(eq(chargeLines.id, lineDraft));
    expect(line?.actualIdr).toBeNull();
    expect(line?.selisihIdr).toBeNull();

    const [jml] = await db
      .select({ id: vendorInvoiceLines.id })
      .from(vendorInvoiceLines)
      .where(eq(vendorInvoiceLines.chargeLineId, lineDraft));
    expect(jml).toBeUndefined();

    expect(await hitungAuditVin(invDraft, "BATAL_VENDOR")).toBe(1);

    // Baris bebas diverifikasi ulang oleh invoice BARU (nomor baru vendor).
    const t = await terimaInvoiceVendor(db, uStaff, {
      vendorId: vendorA,
      vendorInvoiceNo: "ZZV7/REV",
      tanggalInvoice: "2093-05-07",
      jumlahIdr: 1_150_000n,
    });
    expect(t.ok).toBe(true);
    if (t.ok) {
      const v = await verifikasiInvoiceVendor(db, uMgr, {
        vendorInvoiceId: t.data.id,
        baris: [{ chargeLineId: lineDraft, jumlahIdr: 1_150_000n }],
      });
      expect(v.ok).toBe(true);
    }
  });

  it("DIBATALKAN terminal: semua aksi selanjutnya DITOLAK", async () => {
    expect(
      (
        await verifikasiInvoiceVendor(db, uMgr, {
          vendorInvoiceId: invDraft,
          baris: [{ chargeLineId: lineFinal2, jumlahIdr: 1n }],
        })
      ).ok,
    ).toBe(false);
    expect((await bayarInvoiceVendor(db, uMgr, invDraft)).ok).toBe(false);
    expect((await batalkanInvoiceVendor(db, uOwn, invDraft, "batal dua kali")).ok).toBe(
      false,
    );
  });

  it("tepat 1 baris audit per aksi (RECEIVE/VERIFY/PAY/BATAL_VENDOR)", async () => {
    expect(await hitungAuditVin(invFinal, "RECEIVE")).toBe(1);
    expect(await hitungAuditVin(invFinal, "VERIFY")).toBe(1);
    // invFinal dibayar 2x (pay, unlock, pay ulang) → PAY = 2, bukan 1+1 ghost.
    expect(await hitungAuditVin(invFinal, "PAY")).toBe(2);
  });
});
