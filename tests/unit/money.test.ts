/*
 * UNIT TEST — src/lib/money.
 *
 * Ditulis SEBELUM implementasi Irisan 1. Keputusan Q05 (13 Agu 2026):
 * semua pembulatan uang KE ATAS (ceiling). Angka rujukan dari
 * .clinerules/03-money-and-tax.md.
 */

import { describe, expect, it } from "vitest";
import {
  PPH23_RATE_BP,
  PPN_RATE_BP,
  ZERO,
  add,
  applyRateBp,
  formatIdr,
  formatIdrPrefixed,
  fromDb,
  isNegative,
  rupiah,
  subtract,
  sum,
  toDb,
} from "../../src/lib/money/index";

describe("rupiah()", () => {
  it("menerima bigint bulat", () => {
    expect(rupiah(9_282_000n)).toBe(9_282_000n);
  });

  it("menerima number bulat aman", () => {
    expect(rupiah(9_282_000)).toBe(9_282_000n);
  });

  it("menolak pecahan — tidak ada sen di rupiah", () => {
    expect(() => rupiah(100.5)).toThrow(/bilangan bulat/);
  });

  it("menolak number di luar rentang aman", () => {
    expect(() => rupiah(Number.MAX_SAFE_INTEGER + 100)).toThrow(/rentang aman/);
  });
});

describe("add / subtract / sum", () => {
  it("menjumlah banyak nilai sekaligus", () => {
    expect(add(rupiah(22_600_000n), rupiah(1_000_000n), rupiah(248_600n))).toBe(
      23_848_600n,
    );
  });

  it("subtract", () => {
    expect(subtract(rupiah(23_600_000n), rupiah(1_000_000n))).toBe(22_600_000n);
  });

  it("sum daftar kosong = nol", () => {
    expect(sum([])).toBe(ZERO);
  });

  it("sum daftar", () => {
    expect(sum([rupiah(100n), rupiah(250n)])).toBe(350n);
  });

  it("isNegative", () => {
    expect(isNegative(rupiah(-1n))).toBe(true);
    expect(isNegative(ZERO)).toBe(false);
  });
});

describe("applyRateBp — pembulatan KE ATAS (R3.6, keputusan Q05)", () => {
  it("hasil tepat tidak berubah", () => {
    expect(applyRateBp(rupiah(22_600_000n), PPN_RATE_BP)).toBe(248_600n);
    expect(applyRateBp(rupiah(500_000n), PPH23_RATE_BP)).toBe(10_000n);
  });

  it("PPN Diametral: 1.458.853,451 naik jadi 1.458.854", () => {
    expect(applyRateBp(rupiah(132_623_041n), PPN_RATE_BP)).toBe(1_458_854n);
  });

  it("PPh 23 Diametral: 2.652.460,82 naik jadi 2.652.461", () => {
    expect(applyRateBp(rupiah(132_623_041n), PPH23_RATE_BP)).toBe(2_652_461n);
  });

  it("pecahan sekecil apa pun dibulatkan ke atas", () => {
    // 1 × 110 / 10.000 = 0,011 → 1
    expect(applyRateBp(rupiah(1n), PPN_RATE_BP)).toBe(1n);
  });

  it("basis nol menghasilkan nol", () => {
    expect(applyRateBp(ZERO, PPN_RATE_BP)).toBe(ZERO);
  });

  it("basis negatif memakai ceiling matematis (ke arah +tak hingga)", () => {
    // −1.458.853,451 → −1.458.853 (bukan −1.458.854). Pajak customer tidak
    // pernah negatif (divalidasi di hulu); cabang ini menjaga konsistensi.
    expect(applyRateBp(rupiah(-132_623_041n), PPN_RATE_BP)).toBe(-1_458_853n);
  });
});

describe("formatIdr", () => {
  it("pemisah ribuan titik, tanpa awalan Rp", () => {
    expect(formatIdr(rupiah(23_848_600n))).toBe("23.848.600");
  });

  it("negatif memakai kurung akuntansi", () => {
    expect(formatIdr(rupiah(-1_500_000n))).toBe("(1.500.000)");
  });

  it("formatIdrPrefixed menambah awalan Rp", () => {
    expect(formatIdrPrefixed(rupiah(131_429_434n))).toBe("Rp 131.429.434");
  });
});

describe("toDb / fromDb", () => {
  it("roundtrip bigint", () => {
    const nilai = rupiah(132_623_041n);
    expect(fromDb(toDb(nilai))).toBe(nilai);
  });

  it("fromDb menerima string dari driver", () => {
    expect(fromDb("23848600")).toBe(23_848_600n);
  });
});
