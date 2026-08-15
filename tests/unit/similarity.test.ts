import { describe, expect, it } from "vitest";
import {
  AMBANG_MIRIP,
  cariKandidatMirip,
  jarakLevenshtein,
  mirip,
  normalisasiTeks,
  similaritasLevenshtein,
} from "@/lib/similarity/index";

describe("normalisasiTeks", () => {
  it("huruf kecil + buang tanda baca + padatkan spasi", () => {
    expect(normalisasiTeks("KM.  Meratus ")).toBe("km meratus");
    expect(normalisasiTeks("  PT\tSumber  Jaya! ")).toBe("pt sumber jaya");
  });
});

describe("jarakLevenshtein", () => {
  it("kasus dasar", () => {
    expect(jarakLevenshtein("abc", "abc")).toBe(0);
    expect(jarakLevenshtein("", "abc")).toBe(3);
    expect(jarakLevenshtein("abc", "")).toBe(3);
    expect(jarakLevenshtein("kitten", "sitting")).toBe(3);
    expect(jarakLevenshtein("surabaya", "surabaaya")).toBe(1);
  });
});

describe("similaritasLevenshtein", () => {
  it("identik = 1; beda total rendah", () => {
    expect(similaritasLevenshtein("tanjung perak", "tanjung perak")).toBe(1);
    expect(similaritasLevenshtein("", "")).toBe(1);
    expect(similaritasLevenshtein("abc", "xyz")).toBe(0);
  });

  it("normalisasi sebelum membandingkan", () => {
    expect(similaritasLevenshtein("KM Meratus", "km.  meratus")).toBe(1);
  });
});

describe("mirip (ambang 0.85, RENCANA §3.1)", () => {
  const baris = [
    { id: "1", nama: "PT Meratus Jaya" },
    { id: "2", nama: "Pelabuhan Tanjung Perak" },
    { id: "3", nama: "Samudera Indonesia" },
  ];

  it("typo dekat dianggap mirip", () => {
    // 1 karakter ganti dari 15 char -> ~0.93
    expect(mirip("PT Meratus Jaja", "PT Meratus Jaya")).toBe(true);
    expect(similaritasLevenshtein("PT Meratus Jaja", "PT Meratus Jaya")).toBeGreaterThanOrEqual(AMBANG_MIRIP);
  });

  it("nama beda jelas tidak mirip", () => {
    expect(mirip("PT Meratus Jaya", "Samudera Indonesia")).toBe(false);
  });

  it("case-insensitive & abaikan tanda baca", () => {
    expect(mirip("pt meratus jaya", "PT. MERATUS JAYA")).toBe(true);
  });
});

describe("cariKandidatMirip", () => {
  const baris = [
    { id: "1", nama: "PT Meratus Jaya" },
    { id: "2", nama: "PT Meratus" },
    { id: "3", nama: "Samudera Indonesia" },
  ];

  it("kembalikan kandidat urut skor menurun", () => {
    const hasil = cariKandidatMirip("PT Meratus Jayaa", baris);
    expect(hasil.length).toBeGreaterThan(0);
    expect(hasil[0]?.id).toBe("1");
    for (let i = 1; i < hasil.length; i++) {
      expect(hasil[i - 1]!.skor).toBeGreaterThanOrEqual(hasil[i]!.skor);
    }
  });

  it("mode EDIT: kecualikan diri sendiri", () => {
    const hasil = cariKandidatMirip("PT Meratus Jaya", baris, { idKecuali: "1" });
    expect(hasil.find((k) => k.id === "1")).toBeUndefined();
  });

  it("tidak ada kandidat untuk nama beda jelas", () => {
    expect(cariKandidatMirip("Zebra Langka", baris)).toEqual([]);
  });
});
