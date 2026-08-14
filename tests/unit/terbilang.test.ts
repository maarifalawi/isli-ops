/*
 * UNIT TEST — src/lib/terbilang.
 *
 * Minimal 12 kasus sesuai Irisan 1, termasuk 0, 11, 111, 1.000.000, dan
 * 23.848.600 (grand total invoice Materee — angka yang benar-benar akan
 * tercetak di invoice).
 */

import { describe, expect, it } from "vitest";
import { rupiah } from "../../src/lib/money/index";
import { terbilang } from "../../src/lib/terbilang/index";

describe("terbilang", () => {
  it("0 → nol rupiah", () => {
    expect(terbilang(rupiah(0n))).toBe("nol rupiah");
  });

  it("1 → satu rupiah", () => {
    expect(terbilang(rupiah(1n))).toBe("satu rupiah");
  });

  it("10 → sepuluh rupiah", () => {
    expect(terbilang(rupiah(10n))).toBe("sepuluh rupiah");
  });

  it("11 → sebelas rupiah", () => {
    expect(terbilang(rupiah(11n))).toBe("sebelas rupiah");
  });

  it("12 → dua belas rupiah", () => {
    expect(terbilang(rupiah(12n))).toBe("dua belas rupiah");
  });

  it("19 → sembilan belas rupiah", () => {
    expect(terbilang(rupiah(19n))).toBe("sembilan belas rupiah");
  });

  it("21 → dua puluh satu rupiah", () => {
    expect(terbilang(rupiah(21n))).toBe("dua puluh satu rupiah");
  });

  it("100 → seratus rupiah", () => {
    expect(terbilang(rupiah(100n))).toBe("seratus rupiah");
  });

  it("110 → seratus sepuluh rupiah", () => {
    expect(terbilang(rupiah(110n))).toBe("seratus sepuluh rupiah");
  });

  it("111 → seratus sebelas rupiah", () => {
    expect(terbilang(rupiah(111n))).toBe("seratus sebelas rupiah");
  });

  it("115 → seratus lima belas rupiah", () => {
    expect(terbilang(rupiah(115n))).toBe("seratus lima belas rupiah");
  });

  it("1.000 → seribu rupiah", () => {
    expect(terbilang(rupiah(1_000n))).toBe("seribu rupiah");
  });

  it("2.000 → dua ribu rupiah", () => {
    expect(terbilang(rupiah(2_000n))).toBe("dua ribu rupiah");
  });

  it("11.000 → sebelas ribu rupiah", () => {
    expect(terbilang(rupiah(11_000n))).toBe("sebelas ribu rupiah");
  });

  it("100.000 → seratus ribu rupiah", () => {
    expect(terbilang(rupiah(100_000n))).toBe("seratus ribu rupiah");
  });

  it("1.001.000 → satu juta seribu rupiah", () => {
    expect(terbilang(rupiah(1_001_000n))).toBe("satu juta seribu rupiah");
  });

  it("1.000.000 → satu juta rupiah", () => {
    expect(terbilang(rupiah(1_000_000n))).toBe("satu juta rupiah");
  });

  it("2.500.750 → dua juta lima ratus ribu tujuh ratus lima puluh rupiah", () => {
    expect(terbilang(rupiah(2_500_750n))).toBe(
      "dua juta lima ratus ribu tujuh ratus lima puluh rupiah",
    );
  });

  it("23.848.600 — grand total invoice Materee", () => {
    expect(terbilang(rupiah(23_848_600n))).toBe(
      "dua puluh tiga juta delapan ratus empat puluh delapan ribu enam ratus rupiah",
    );
  });

  it("131.429.434 — grand total invoice Diametral", () => {
    expect(terbilang(rupiah(131_429_434n))).toBe(
      "seratus tiga puluh satu juta empat ratus dua puluh sembilan ribu empat ratus tiga puluh empat rupiah",
    );
  });

  it("1.000.000.000 → satu miliar rupiah", () => {
    expect(terbilang(rupiah(1_000_000_000n))).toBe("satu miliar rupiah");
  });

  it("1.000.000.000.000 → satu triliun rupiah", () => {
    expect(terbilang(rupiah(1_000_000_000_000n))).toBe("satu triliun rupiah");
  });

  it("menolak nilai negatif", () => {
    expect(() => terbilang(rupiah(-1n))).toThrow(/non-negatif/);
  });

  it("menolak nilai di atas 999 triliun", () => {
    expect(() => terbilang(rupiah(1_000_000_000_000_000n))).toThrow(/rentang/);
  });
});
