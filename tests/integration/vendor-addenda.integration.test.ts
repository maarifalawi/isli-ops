import { db } from "@/db/index";
import { users, vendorInvoiceAddenda, vendorInvoices, vendors } from "@/db/schema/index";
import type { RentangBulan } from "@/lib/laporan/periode";
import { peringkatVendorBelanja, rekapVendorPerBulan } from "@/lib/laporan/queries";
import {
  buatAddendumVendor,
  catatBayarAddendumVendor,
  setujuiAddendumVendor,
  sisaKuotaVendorInvoice,
  terbitkanAddendumVendor,
} from "@/lib/vendor-invoice/addenda";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";

/*
 * Integration fase 1 (Irisan 10 Item 10, R17):
 * - full flow DRAFT → DISETUJUI → ISSUED → bayar; sisa kuota berkurang
 * - approval ≠ pembuat (R-A1, default Q77)
 * - dibayar pra-ISSUED ditolak
 * - uq_vendor_addendum UNIQUE(original_vendor_invoice_id, addendum_seq)
 * Fixture: vendor + invoice DIBAYAR dibuat langsung per run (label unik).
 */

const rand = () => Math.random().toString(36).slice(2, 8);
const label = `ADD-INT-${rand()}`;

async function pelaksana() {
  const rows = await db.select().from(users);
  const owner = rows.find((u) => u.role === "OWNER");
  const manager = rows.find((u) => u.role === "MANAGER");
  const staff = rows.find((u) => u.role === "STAFF");
  if (!owner || !manager || !staff) throw new Error("seed users hilang");
  return {
    owner: { id: owner.id, role: "OWNER" as const },
    manager: { id: manager.id, role: "MANAGER" as const },
    staff: { id: staff.id, role: "STAFF" as const },
  };
}

async function invoiceDibayarFixture(makerId: string) {
  const [vendor] = await db
    .insert(vendors)
    .values({ nama: `VENDOR-ADD-${rand()}` })
    .returning();
  if (!vendor) throw new Error("fixture vendor gagal");
  const [inv] = await db
    .insert(vendorInvoices)
    .values({
      vendorId: vendor.id,
      vendorInvoiceNo: `INV-ADD-${rand()}`,
      tanggalInvoice: "2026-08-01",
      jumlahIdr: 10_000_000n,
      pph23Idr: 0n,
      status: "DIBAYAR",
      dibayarAt: new Date("2026-08-05T02:00:00Z"),
      diterimaOleh: makerId,
    })
    .returning();
  if (!inv) throw new Error("fixture invoice gagal");
  return inv;
}

afterAll(async () => {
  for (const l of [
    label,
    `${label}-UQ`,
    `${label}-UQ-2`,
    `${label}-ND`,
    `${label}-RK`,
    `${label}-RK2`,
  ]) {
    await db
      .delete(vendorInvoiceAddenda)
      .where(eq(vendorInvoiceAddenda.labelInternal, l));
  }
});

describe("addenda vendor R17 — integration", () => {
  it(
    "full flow buat→setujui→terbitkan→bayar; sisa kuota 10jt → 6,5jt",
    // 10+ transaksi roundtrip ke Postgres remote; default 5s tidak cukup.
    { timeout: 30_000 },
    async () => {
      const p = await pelaksana();
      const inv = await invoiceDibayarFixture(p.staff.id);

      // Sisa awal = jumlah asli (belum ada addendum dibayar).
      expect(await sisaKuotaVendorInvoice(db, inv.id)).toBe(10_000_000n);

      const buat = await buatAddendumVendor(db, p.staff, {
        originalVendorInvoiceId: inv.id,
        labelInternal: label,
        alasan: "Sisa bayar bulan berikutnya (R17).",
        jumlahIdr: 3_500_000n,
        pph23Applied: false,
        pph23Idr: 0n,
        issueYear: 2026,
        issueMonth: 9,
      });
      expect(buat.ok).toBe(true);
      if (!buat.ok) return;
      const id = buat.data.id;
      expect(buat.data.addendumSeq).toBe(1);

      // Bayar pra-ISSUED ditolak.
      const bayarDini = await catatBayarAddendumVendor(
        db,
        p.owner,
        id,
        new Date("2026-09-05"),
      );
      expect(bayarDini.ok).toBe(false);

      // Skip tingkat: terbitkan dari DRAFT ditolak.
      const terbitDini = await terbitkanAddendumVendor(db, p.manager, id);
      expect(terbitDini.ok).toBe(false);

      // R-A1: pembuat sendiri tidak boleh menyetujui.
      const setujuSendiri = await setujuiAddendumVendor(db, p.staff, id);
      expect(setujuSendiri.ok).toBe(false);

      // Alur sah: manager menyetujui → owner menerbitkan → owner mencatat bayar.
      expect((await setujuiAddendumVendor(db, p.manager, id)).ok).toBe(true);
      expect((await terbitkanAddendumVendor(db, p.owner, id)).ok).toBe(true);
      expect(
        (await catatBayarAddendumVendor(db, p.owner, id, new Date("2026-09-05"))).ok,
      ).toBe(true);

      // Status akhir + sisa kuota berkurang.
      const [akhir] = await db
        .select()
        .from(vendorInvoiceAddenda)
        .where(eq(vendorInvoiceAddenda.id, id));
      expect(akhir?.status).toBe("ISSUED");
      expect(akhir?.dibayarAt).not.toBeNull();
      expect(await sisaKuotaVendorInvoice(db, inv.id)).toBe(6_500_000n);

      // Bayar kedua kali ditolak.
      const bayarLagi = await catatBayarAddendumVendor(
        db,
        p.owner,
        id,
        new Date("2026-09-06"),
      );
      expect(bayarLagi.ok).toBe(false);
    },
  );

  it("uq_vendor_addendum: addendum_seq sama untuk invoice sama ditolak DB", async () => {
    const p = await pelaksana();
    const inv = await invoiceDibayarFixture(p.staff.id);
    await db.insert(vendorInvoiceAddenda).values({
      originalVendorInvoiceId: inv.id,
      addendumSeq: 1,
      labelInternal: `${label}-UQ`,
      alasan: "pertama",
      jumlahIdr: 1_000_000n,
      issueYear: 2026,
      issueMonth: 9,
      createdBy: p.staff.id,
    });
    // Insert seq=1 KEDUA secara langsung → constraint menyala.
    await expect(
      db.insert(vendorInvoiceAddenda).values({
        originalVendorInvoiceId: inv.id,
        addendumSeq: 1,
        labelInternal: `${label}-UQ-2`,
        alasan: "duplikat seq",
        jumlahIdr: 500_000n,
        issueYear: 2026,
        issueMonth: 9,
        createdBy: p.staff.id,
      }),
    ).rejects.toThrow();
  });

  it("addendum atas invoice belum DIBAYAR ditolak (R17: sisa muncul setelah bayar)", async () => {
    const p = await pelaksana();
    const [vendor] = await db
      .insert(vendors)
      .values({ nama: `VENDOR-ADD2-${rand()}` })
      .returning();
    if (!vendor) throw new Error("fixture vendor2 gagal");
    const [inv] = await db
      .insert(vendorInvoices)
      .values({
        vendorId: vendor.id,
        vendorInvoiceNo: `INV-ADD2-${rand()}`,
        tanggalInvoice: "2026-08-01",
        jumlahIdr: 5_000_000n,
        pph23Idr: 0n,
        status: "DIVERIFIKASI",
        diterimaOleh: p.staff.id,
      })
      .returning();
    if (!inv) throw new Error("fixture invoice2 gagal");
    const hasil = await buatAddendumVendor(db, p.staff, {
      originalVendorInvoiceId: inv.id,
      labelInternal: `${label}-ND`,
      alasan: "harus ditolak",
      jumlahIdr: 1_000_000n,
      pph23Applied: false,
      pph23Idr: 0n,
      issueYear: 2026,
      issueMonth: 9,
    });
    expect(hasil.ok).toBe(false);
  });
});

/*
 * Fase 2 — rekap R7.3 (Irisan 10 Item 10): addendum yang dibayar_at terisi
 * masuk uang keluar vendor di bulan DIBAYAR addendum itu sendiri (bukan
 * bulan invoice asal); addendum belum dibayar TIDAK masuk; jumlahInvoice
 * tetap menghitung invoice DIBAYAR saja (addendum = nomor sama dipakai
 * ulang, R17). Peringkat belanja vendor ikut menyertakan addenda.
 */
describe("rekap R7.3 + addenda dibayar — integration", () => {
  const AGU: RentangBulan = {
    dari: { tahun: 2026, bulan: 8 },
    sampai: { tahun: 2026, bulan: 8 },
  };
  const SEP: RentangBulan = {
    dari: { tahun: 2026, bulan: 9 },
    sampai: { tahun: 2026, bulan: 9 },
  };
  const AGU_SEP: RentangBulan = {
    dari: { tahun: 2026, bulan: 8 },
    sampai: { tahun: 2026, bulan: 9 },
  };

  it(
    "addendum dibayar masuk bulan bayarnya; belum dibayar tidak; jumlahInvoice tak berubah",
    { timeout: 30_000 },
    async () => {
      const p = await pelaksana();
      const [vendor] = await db
        .insert(vendors)
        .values({ nama: `VENDOR-RK-${rand()}` })
        .returning();
      if (!vendor) throw new Error("fixture vendor rekap gagal");
      const [inv] = await db
        .insert(vendorInvoices)
        .values({
          vendorId: vendor.id,
          vendorInvoiceNo: `INV-RK-${rand()}`,
          tanggalInvoice: "2026-08-01",
          jumlahIdr: 10_000_000n,
          pph23Idr: 0n,
          status: "DIBAYAR",
          dibayarAt: new Date("2026-08-05T02:00:00Z"),
          diterimaOleh: p.staff.id,
        })
        .returning();
      if (!inv) throw new Error("fixture invoice rekap gagal");

      // Addendum 3,5jt DIBAYAR 5 Sep 2026 (pph23 70rb) + addendum 1jt belum
      // dibayar — keduanya di-insert langsung (query rekap hanya membaca).
      await db.insert(vendorInvoiceAddenda).values([
        {
          originalVendorInvoiceId: inv.id,
          addendumSeq: 1,
          labelInternal: `${label}-RK`,
          alasan: "sisa tagihan (R17)",
          jumlahIdr: 3_500_000n,
          pph23Applied: true,
          pph23Idr: 70_000n,
          issueYear: 2026,
          issueMonth: 9,
          status: "ISSUED",
          createdBy: p.staff.id,
          dibayarAt: new Date("2026-09-05T02:00:00Z"),
        },
        {
          originalVendorInvoiceId: inv.id,
          addendumSeq: 2,
          labelInternal: `${label}-RK2`,
          alasan: "belum dibayar",
          jumlahIdr: 1_000_000n,
          pph23Applied: false,
          pph23Idr: 0n,
          issueYear: 2026,
          issueMonth: 9,
          status: "ISSUED",
          createdBy: p.staff.id,
        },
      ]);

      // Agustus: hanya invoice asli — addendum September tidak bocor mundur.
      const rekapAgu = (await rekapVendorPerBulan(db, AGU)).filter(
        (r) => r.vendorId === vendor.id,
      );
      expect(rekapAgu).toHaveLength(1);
      expect(rekapAgu[0]?.bulan).toBe(8);
      expect(rekapAgu[0]?.jumlahInvoice).toBe(1);
      expect(rekapAgu[0]?.totalDibayar).toBe(10_000_000n);
      expect(rekapAgu[0]?.totalPph23).toBe(0n);

      // September: addendum 3,5jt masuk bulan bayarnya; addendum belum
      // dibayar (1jt) TIDAK masuk; jumlahInvoice = 0 (bukan invoice baru).
      const rekapSep = (await rekapVendorPerBulan(db, SEP)).filter(
        (r) => r.vendorId === vendor.id,
      );
      expect(rekapSep).toHaveLength(1);
      expect(rekapSep[0]?.bulan).toBe(9);
      expect(rekapSep[0]?.jumlahInvoice).toBe(0);
      expect(rekapSep[0]?.totalDibayar).toBe(3_500_000n);
      expect(rekapSep[0]?.totalPph23).toBe(70_000n);

      // Rentang penuh: dua baris bulanan, total 13,5jt.
      const rekapAguSep = (await rekapVendorPerBulan(db, AGU_SEP)).filter(
        (r) => r.vendorId === vendor.id,
      );
      expect(rekapAguSep).toHaveLength(2);
      const totalAguSep = rekapAguSep.reduce((s, r) => s + r.totalDibayar, 0n);
      expect(totalAguSep).toBe(13_500_000n);

      // Peringkat belanja: addenda dibayar ikut (10jt + 3,5jt, 1 invoice).
      const peringkat = (await peringkatVendorBelanja(db, AGU_SEP)).filter(
        (r) => r.vendorNama === vendor.nama,
      );
      expect(peringkat).toHaveLength(1);
      expect(peringkat[0]?.totalDibayar).toBe(13_500_000n);
      expect(peringkat[0]?.jumlahInvoice).toBe(1);
      expect(peringkat[0]?.totalPph23).toBe(70_000n);
    },
  );
});
