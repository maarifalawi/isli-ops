/*
 * R2.2 — angka romawi di nomor invoice adalah BULAN TERBIT invoice,
 * bukan bulan job-nya. Job Juli yang diinvoice Agustus memakai VIII.
 */
import { describe, expect, it } from "vitest";
import { ROMAWI, formatInvoiceNumber } from "../../src/lib/job-number/index";

describe("romawi bulan terbit invoice (R2.2)", () => {
  it("menulis I..XII untuk bulan 1..12", () => {
    const expected = [
      "I",
      "II",
      "III",
      "IV",
      "V",
      "VI",
      "VII",
      "VIII",
      "IX",
      "X",
      "XI",
      "XII",
    ];
    expect([...ROMAWI]).toEqual(expected);

    for (let month = 1; month <= 12; month++) {
      const no = formatInvoiceNumber({
        running: 1,
        invoiceType: "INVDOM",
        jobNo: "ISLI-26.01-001",
        issueMonth: month,
        issueYear: 2026,
      });
      expect(no).toBe(`001-INVDOM/ISLI-26.01-001/${expected[month - 1]}/2026`);
    }
  });

  it("job Juli yang diinvoice Agustus memakai VIII, bukan VII", () => {
    // Job-nya ISLI-26.07-003 (Juli), tapi invoice TERBIT bulan Agustus.
    const no = formatInvoiceNumber({
      running: 12,
      invoiceType: "INVDOM",
      jobNo: "ISLI-26.07-003",
      issueMonth: 8,
      issueYear: 2026,
    });
    expect(no).toBe("012-INVDOM/ISLI-26.07-003/VIII/2026");
  });
});
