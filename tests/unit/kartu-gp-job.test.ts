import { kartuGpJob } from "@/lib/laporan/queries";
import { rupiah } from "@/lib/money/index";
import { describe, expect, it } from "vitest";

/*
 * Irisan 10 Item 7 — view-model kartu GP/NETT halaman job detail.
 * Rumus berasal dari costing (terkunci 4d); test ini mengunci KEBIJAKAN
 * tampilan: null = "belum ada data" (—), PPN hanya dari invoice TERBIT+,
 * NETT tak pernah tampil sendirian tanpa GP, overlay realokasi eksplisit.
 */

const baris = (selling: bigint, buying: bigint, reimburse = false) => ({
  sellingIdr: rupiah(selling),
  pencadanganIdr: rupiah(buying),
  isReimburse: reimburse,
  deletedAt: null as Date | null,
});

describe("kartuGpJob", () => {
  it("job tanpa baris → semua null (—, bukan 0 yang menyesatkan)", () => {
    const k = kartuGpJob([], null, null);
    expect(k.gpTeks).toBeNull();
    expect(k.gpPersenTeks).toBeNull();
    expect(k.nettTeks).toBeNull();
    expect(k.nettMenungguInvoice).toBe(false);
  });

  it("job berbaris tanpa invoice → GP tampil, NETT menunggu invoice", () => {
    const k = kartuGpJob([baris(10_000_000n, 6_000_000n)], null, null);
    expect(k.gpTeks).toBe("4.000.000");
    expect(k.gpPersenTeks).toBe("40,0%");
    expect(k.nettTeks).toBeNull();
    expect(k.nettMenungguInvoice).toBe(true);
  });

  it("job berbaris + PPN invoice → GP dan NETT berdampingan; NETT−GP = PPN", () => {
    const ppn = 1_100_000n;
    const k = kartuGpJob([baris(10_000_000n, 6_000_000n)], rupiah(ppn), null);
    expect(k.gpTeks).toBe("4.000.000");
    expect(k.nettTeks).toBe("5.100.000"); // 4jt + PPN 1,1jt (Q09)
    expect(k.nettMenungguInvoice).toBe(false);
  });

  it("overlay realokasi APPROVED → gpPostRealokasi tampil + flag", () => {
    const k = kartuGpJob([baris(10_000_000n, 6_000_000n)], null, rupiah(3_500_000n));
    expect(k.adaRealokasi).toBe(true);
    expect(k.gpPostRealokasiTeks).toBe("3.500.000");
  });

  it("realokasi nilainya sama dengan GP → bukan perubahan, tak ditandai", () => {
    const k = kartuGpJob([baris(10_000_000n, 6_000_000n)], null, rupiah(4_000_000n));
    expect(k.adaRealokasi).toBe(false);
    expect(k.gpPostRealokasiTeks).toBeNull();
  });
});
