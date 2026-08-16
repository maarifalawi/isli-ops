import { describe, expect, it } from "vitest";
import {
  isAtCostSeimbang,
  isCurrencySah,
  isLegSah,
  validasiChargeLine,
} from "../../src/lib/charge-line/validation";

/*
 * Unit test validasi charge line (murni, tanpa DB) — Irisan 4b.
 *
 * Fokus: R4.3 at-cost (selling = buying), R10 leg 1|2|3, currency IDR|USD,
 * dan penolakan nilai negatif. Semua uang bigint rupiah.
 */

describe("isLegSah (R10)", () => {
  it("menerima 1, 2, 3, dan null", () => {
    expect(isLegSah(1)).toBe(true);
    expect(isLegSah(2)).toBe(true);
    expect(isLegSah(3)).toBe(true);
    expect(isLegSah(null)).toBe(true);
    expect(isLegSah(undefined)).toBe(true);
  });

  it("menolak 0, 4, dan pecahan", () => {
    expect(isLegSah(0)).toBe(false);
    expect(isLegSah(4)).toBe(false);
    expect(isLegSah(1.5)).toBe(false);
  });
});

describe("isCurrencySah", () => {
  it("hanya IDR & USD", () => {
    expect(isCurrencySah("IDR")).toBe(true);
    expect(isCurrencySah("USD")).toBe(true);
    expect(isCurrencySah("EUR")).toBe(false);
    expect(isCurrencySah("idr")).toBe(false);
  });
});

describe("isAtCostSeimbang (R4.3)", () => {
  it("baris bukan at-cost selalu seimbang (bebas margin)", () => {
    expect(
      isAtCostSeimbang({ isAtCost: false, sellingIdr: 100n, pencadanganIdr: 80n }),
    ).toBe(true);
  });

  it("at-cost: seimbang hanya kalau selling = buying", () => {
    expect(
      isAtCostSeimbang({
        isAtCost: true,
        sellingIdr: 530_580n,
        pencadanganIdr: 530_580n,
      }),
    ).toBe(true);
    expect(
      isAtCostSeimbang({
        isAtCost: true,
        sellingIdr: 530_581n,
        pencadanganIdr: 530_580n,
      }),
    ).toBe(false);
  });
});

describe("validasiChargeLine", () => {
  const dasar = {
    sellingIdr: 1_000_000n,
    pencadanganIdr: 800_000n,
    isAtCost: false,
    leg: 2 as number | null,
    currency: "IDR",
  };

  it("baris normal valid", () => {
    expect(validasiChargeLine(dasar)).toEqual({ ok: true });
  });

  it("nilai referensi at-cost nyata (INSURANCE 1.611.151) lolos", () => {
    expect(
      validasiChargeLine({
        sellingIdr: 1_611_151n,
        pencadanganIdr: 1_611_151n,
        isAtCost: true,
        leg: null,
        currency: "IDR",
      }),
    ).toEqual({ ok: true });
  });

  it("at-cost mismatch ditolak (R4.3)", () => {
    const r = validasiChargeLine({
      sellingIdr: 651_947n,
      pencadanganIdr: 651_946n,
      isAtCost: true,
      leg: 3,
      currency: "IDR",
    });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("R4.3");
  });

  it("leg di luar 1/2/3 ditolak", () => {
    const r = validasiChargeLine({ ...dasar, leg: 4 });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("Leg");
  });

  it("currency asing ditolak", () => {
    const r = validasiChargeLine({ ...dasar, currency: "SGD" });
    expect(r.ok).toBe(false);
  });

  it("nilai jual negatif ditolak", () => {
    const r = validasiChargeLine({ ...dasar, sellingIdr: -1n });
    expect(r.ok).toBe(false);
  });

  it("nilai beli negatif ditolak", () => {
    const r = validasiChargeLine({ ...dasar, pencadanganIdr: -1n });
    expect(r.ok).toBe(false);
  });

  it("at-cost nol (selling = buying = 0) valid", () => {
    expect(
      validasiChargeLine({
        sellingIdr: 0n,
        pencadanganIdr: 0n,
        isAtCost: true,
        leg: 1,
        currency: "IDR",
      }),
    ).toEqual({ ok: true });
  });
});
