import { bisaTransisiAddendum, hitungSisaKuota } from "@/lib/vendor-invoice/addenda";
import { describe, expect, it } from "vitest";

/*
 * Unit murni fase 1 (Irisan 10 Item 10): tabel transisi + aritmetika sisa
 * kuota R17.3. Guard DB (R-A1, dibayar pra-ISSUED) dikunci integration test.
 */

describe("transisi addenda vendor (R17)", () => {
  it("DRAFT → DISETUJUI → ISSUED sah", () => {
    expect(bisaTransisiAddendum("DRAFT", "DISETUJUI")).toBe(true);
    expect(bisaTransisiAddendum("DISETUJUI", "ISSUED")).toBe(true);
  });

  it("transisi ilegal ditolak (skip tingkat, mundur, dari status akhir)", () => {
    expect(bisaTransisiAddendum("DRAFT", "ISSUED")).toBe(false);
    expect(bisaTransisiAddendum("DISETUJUI", "DISETUJUI")).toBe(false);
    expect(bisaTransisiAddendum("ISSUED", "DISETUJUI")).toBe(false);
    expect(bisaTransisiAddendum("ISSUED", "ISSUED")).toBe(false);
  });
});

describe("sisa kuota R17.3 (dihitung saat tampil, R14.5)", () => {
  it("belum ada addendum dibayar → sisa = jumlah asli", () => {
    expect(hitungSisaKuota(10_000_000n, 0n)).toBe(10_000_000n);
  });

  it("addendum dibayar mengurangi sisa", () => {
    expect(hitungSisaKuota(10_000_000n, 3_500_000n)).toBe(6_500_000n);
  });

  it("PENDING (belum dibayar) tidak masuk — hanya dibayar yang dijumlahkan pemanggil", () => {
    // totalAddendumDibayar hanya memuat yang dibayar_at terisi (query service);
    // fungsi murni ini tidak punya akses ke PENDING — kontrak oleh pemanggil.
    expect(hitungSisaKuota(10_000_000n, 0n)).toBe(10_000_000n);
  });
});
