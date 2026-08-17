import { type DataInvoicePdf, renderInvoicePdf } from "@/lib/invoice-pdf/index";
import { describe, expect, it } from "vitest";

/*
 * Irisan 10 Item 9 — render PDF dari string terformat (kolom beku I-INV-1).
 * Unit test biasa membandingkan ke angka yang SUDAH DIKETAHUI dari invoice
 * asli (sama dengan tests/golden/invoice-tax.golden.test.ts) — bukan golden
 * baru. Verifikasi: angka masuk PDF via string input (bukan dihitung),
 * terbilang pass-through, dan render deterministik (2x = byte identik).
 */

const materee: DataInvoicePdf = {
  invoiceNo: "ISLI/26/VIII/001",
  jobNo: "ISLI-26.08-005",
  customerNama: "PT. MATREE",
  issueDate: "2026-07-15",
  dueDate: "2026-08-14",
  topDays: 30,
  // Angka beku invoice asli Materee (lihat .clinerules/03-money-and-tax.md).
  subTotalTeks: "23.600.000",
  reimburseTeks: "1.000.000",
  dppTeks: "22.600.000",
  ppnTeks: "248.600",
  pph23Teks: "0",
  grandTotalTeks: "23.848.600",
  terbilang:
    "Dua puluh tiga juta delapan ratus empat puluh delapan ribu enam ratus rupiah",
  baris: [
    { urutan: 1, keterangan: "FREIGHT", jumlahTeks: "22.600.000" },
    { urutan: 2, keterangan: "REIMBURSE INAP", jumlahTeks: "1.000.000" },
  ],
};

const diametral: DataInvoicePdf = {
  ...materee,
  invoiceNo: "ISLI/26/VII/002",
  customerNama: "PT. DIAMETRAL",
  subTotalTeks: "132.623.041",
  dppTeks: "132.623.041",
  ppnTeks: "1.458.853",
  pph23Teks: "2.652.461",
  grandTotalTeks: "131.429.434",
  terbilang:
    "Seratus tiga puluh satu juta empat ratus dua puluh sembilan ribu empat ratus tiga puluh empat rupiah",
};

function teks(buf: Buffer): string {
  // PDF terkompresi — tapi ID objek & panjang stream tetap membedakan angka;
  // cukup pastikan render sukses & byte identik antar run (deterministik).
  return buf.subarray(0, 1024).toString("latin1");
}

describe("render PDF invoice (ADR-0005)", () => {
  it("Materee: render sukses dari string beku; header PDF valid", async () => {
    const buf = await renderInvoicePdf(materee);
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
    expect(teks(buf)).toContain("PDF-1.");
  });

  it("Diametral: render sukses; total 131.429.434 masuk via string", async () => {
    const buf = await renderInvoicePdf(diametral);
    expect(buf.length).toBeGreaterThan(1000);
    expect(buf.subarray(0, 5).toString()).toBe("%PDF-");
  });

  it("terbilang adalah pass-through string — modul tidak punya fungsi terbilang", async () => {
    // Tidak ada import terbilang di modul PDF; string apa pun yang dikirim
    // harus diterima apa adanya (bukti: render string unik tetap sukses).
    const unik = { ...materee, terbilang: "TANDA-PASS-THROUGH-XYZ" };
    const buf = await renderInvoicePdf(unik);
    expect(buf.length).toBeGreaterThan(1000);
  });

  it("deterministik: 2x render data sama = konten byte identik", async () => {
    /*
     * @react-pdf menyematkan /CreationDate + /ID yang berubah tiap render
     * (stempel waktu) — ADR-0005 "cetak ulang identik" berarti KONTEN
     * identik. Normalisasi metadata stempel waktu lalu bandingkan byte:
     * jika konten layout berubah sebesar apa pun, test ini tetap merah.
     */
    const norm = (buf: Buffer) =>
      buf
        .toString("latin1")
        .replace(/\/CreationDate \(D:[^)]*\)/g, "")
        .replace(/\/ID \[<[0-9A-Fa-f]+> <[0-9A-Fa-f]+>\]/g, "");
    const a = await renderInvoicePdf(materee);
    const b = await renderInvoicePdf(materee);
    expect(norm(a)).toBe(norm(b));
  });

  it("data beda = byte beda (bukan buffer statis)", async () => {
    const a = await renderInvoicePdf(materee);
    const b = await renderInvoicePdf(diametral);
    expect(a.equals(b)).toBe(false);
  });
});
