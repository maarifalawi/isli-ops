import { describe, expect, it } from "vitest";
import { mirip, similaritasLevenshtein } from "@/lib/similarity/index";

describe("Kasus MATEREE (laporan, temp)", () => {
  it("cetak angka aktual", () => {
    const a = "MATEREE";
    const b = "MATEREE NUSANTARA UTAMA";
    const c = "PT. MATEREE NUSANTARA UTAMA";
    console.log("A vs B skor:", similaritasLevenshtein(a, b), "mirip:", mirip(a, b));
    console.log("A vs C skor:", similaritasLevenshtein(a, c), "mirip:", mirip(a, c));
    console.log("B vs C skor:", similaritasLevenshtein(b, c), "mirip:", mirip(b, c));
    expect(similaritasLevenshtein(a, b)).toBeCloseTo(7 / 23, 4);
    expect(similaritasLevenshtein(a, c)).toBeCloseTo(7 / 26, 4);
    expect(similaritasLevenshtein(b, c)).toBeCloseTo(23 / 26, 4);
    expect(mirip(a, b)).toBe(false);
    expect(mirip(a, c)).toBe(false);
    expect(mirip(b, c)).toBe(true);
  });
});
