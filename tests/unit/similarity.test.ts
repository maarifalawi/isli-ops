import {
  MAKS_JARAK_LEVENSHTEIN,
  MIN_PANJANG_LEVENSHTEIN,
  MIN_PANJANG_MENGANDUNG,
  cariKandidatMirip,
  jarakLevenshtein,
  mirip,
  normalisasiTeks,
  similaritasLevenshtein,
} from "@/lib/similarity/index";
import { describe, expect, it } from "vitest";

describe("normalisasiTeks (RENCANA §7: UPPERCASE + kolaps spasi + trim)", () => {
  it("huruf besar semua, spasi dipadatkan, ujung dipangkas; tanda baca dibiarkan", () => {
    expect(normalisasiTeks("KM.  Meratus ")).toBe("KM. MERATUS");
    expect(normalisasiTeks("  PT\tSumber  Jaya! ")).toBe("PT SUMBER JAYA!");
  });
});

describe("jarakLevenshtein", () => {
  it("kasus dasar", () => {
    expect(jarakLevenshtein("abc", "abc")).toBe(0);
    expect(jarakLevenshtein("", "abc")).toBe(3);
    expect(jarakLevenshtein("abc", "")).toBe(3);
    expect(jarakLevenshtein("kitten", "sitting")).toBe(3);
    expect(jarakLevenshtein("SURABAYA", "SURABAAYA")).toBe(1);
  });
});

describe("similaritasLevenshtein (hanya untuk skor/urut kandidat)", () => {
  it("identik = 1; beda total rendah", () => {
    expect(similaritasLevenshtein("tanjung perak", "tanjung perak")).toBe(1);
    expect(similaritasLevenshtein("", "")).toBe(1);
    expect(similaritasLevenshtein("abc", "xyz")).toBe(0);
  });

  it("normalisasi sebelum membandingkan", () => {
    expect(similaritasLevenshtein("KM Meratus", "km.  meratus")).toBe(1);
  });
});

describe("mirip (RENCANA §7: mengandung min-4 ATAU lev<=2 utk nama>=5)", () => {
  it("konstanta aturan terkunci", () => {
    expect(MIN_PANJANG_MENGANDUNG).toBe(4);
    expect(MAKS_JARAK_LEVENSHTEIN).toBe(2);
    expect(MIN_PANJANG_LEVENSHTEIN).toBe(5);
  });

  it("1. typo 1 karakter dianggap mirip", () => {
    expect(mirip("MERATUS JAYA", "MERATUS JAYAA")).toBe(true);
  });

  it("2. beda prefiks panjang (jarak edit besar) tidak mirip", () => {
    expect(mirip("PELABUHAN TANJUNG PERAK", "KAWASAN TANJUNG PERAK")).toBe(false);
  });

  it("3. typo 1 karakter di tengah nama", () => {
    expect(mirip("SINAR MAS", "SINAR MASA")).toBe(true);
  });

  it("4. substring: nama panjang mengandung nama pendek (>= 4 char)", () => {
    expect(mirip("SUMBER JAYA", "SUMBER JAYA MAKMUR")).toBe(true);
  });

  it("5. huruf hilang satu (varian ejaan) dianggap mirip", () => {
    expect(mirip("SAMUDERA INDONESIA", "SAMUDRA INDONESIA")).toBe(true);
  });

  it("6. substring pendek + typo: MERAK vs MERAKS mirip", () => {
    expect(mirip("MERAK", "MERAKS")).toBe(true);
  });

  it("7. nama 4 char mengandung (batas minimum aturan a)", () => {
    expect(mirip("ABCD", "ABCDX")).toBe(true);
  });

  it("8. varian panjang: MERATUS JAYA vs MERATUS JAYA ABADI mirip", () => {
    expect(mirip("MERATUS JAYA ABADI", "MERATUS JAYA")).toBe(true);
  });

  it("9. kasus MATEREE: nama pendek yang termuat nama panjang dianggap mirip", () => {
    expect(mirip("MATEREE", "PT. MATEREE NUSANTARA UTAMA")).toBe(true);
    expect(mirip("MATEREE", "MATEREE NUSANTARA UTAMA")).toBe(true);
    expect(mirip("MATEREE NUSANTARA UTAMA", "PT. MATEREE NUSANTARA UTAMA")).toBe(true);
  });

  it("10. typo singkat: MATEREE vs MATEREE JAYA mirip", () => {
    expect(mirip("MATEREE", "MATEREE JAYA")).toBe(true);
  });

  it("11. nama 2 char tidak memicu substring: AB vs ABAD tidak mirip", () => {
    expect(mirip("AB", "ABAD")).toBe(false);
  });

  it("string kosong tidak pernah mirip", () => {
    expect(mirip("", "APA SAJA")).toBe(false);
    expect(mirip("APA SAJA", "")).toBe(false);
  });
});

describe("lima kasus wajib RENCANA §7 (literal)", () => {
  it("1. MATEREE ↔ MATEREE NUSANTARA mirip (mengandung)", () => {
    expect(mirip("MATEREE", "MATEREE NUSANTARA")).toBe(true);
  });
  it("2. PT MATREE ↔ PT MATEREE mirip (typo jarak 1)", () => {
    expect(mirip("PT MATREE", "PT MATEREE")).toBe(true);
  });
  it("3. PT MATREE ↔ MATREE INDONESIA mirip (mengandung)", () => {
    expect(mirip("PT MATREE", "MATREE INDONESIA")).toBe(true);
  });
  it("4. MERATUS ↔ MERATAS mirip (jarak 1)", () => {
    expect(mirip("MERATUS", "MERATAS")).toBe(true);
  });
  it("5. SPIL ↔ TEMAS tidak mirip", () => {
    expect(mirip("SPIL", "TEMAS")).toBe(false);
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
      expect(hasil[i - 1]?.skor ?? Number.NaN).toBeGreaterThanOrEqual(
        hasil[i]?.skor ?? Number.NaN,
      );
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
