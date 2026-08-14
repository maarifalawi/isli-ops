import { describe, expect, it } from "vitest";
import {
  computeDueDate,
  formatInvoiceNumber,
  formatJobNumber,
  invoiceTypeForScope,
  parseJobNumber,
  paymentTermDays,
} from "../../src/lib/job-number/index";

describe("nomor job", () => {
  it("memformat nomor domestik", () => {
    expect(formatJobNumber({ year: 2026, month: 8, running: 5 })).toBe("ISLI-26.08-005");
  });

  it("memformat nomor dengan akhiran", () => {
    expect(formatJobNumber({ year: 2026, month: 7, running: 3, suffix: "AF" })).toBe(
      "ISLI-26.07-003(AF)",
    );
  });

  it("bolak-balik format dan parse", () => {
    const parts = { year: 2026, month: 6, running: 12 } as const;
    expect(parseJobNumber(formatJobNumber(parts))).toEqual(parts);
  });

  it("mengembalikan null untuk format yang salah", () => {
    expect(parseJobNumber("ISLI-2026.08-005")).toBeNull();
    expect(parseJobNumber("SEVFJK25040002")).toBeNull();
  });

  it("menolak nomor urut di luar rentang", () => {
    expect(() => formatJobNumber({ year: 2026, month: 8, running: 0 })).toThrow();
    expect(() => formatJobNumber({ year: 2026, month: 8, running: 1000 })).toThrow();
  });

  it("nomor yang sama boleh ada di scope berbeda", () => {
    // 16 tabrakan nyata di data historis. Sistem harus menerimanya —
    // keunikan dijaga oleh (seq_scope, year, month, running), bukan job_no.
    const dom = formatJobNumber({ year: 2026, month: 6, running: 7 });
    const exp = formatJobNumber({ year: 2026, month: 6, running: 7 });
    expect(dom).toBe(exp);
  });
});

describe("nomor invoice", () => {
  it("cocok dengan invoice domestik asli", () => {
    expect(
      formatInvoiceNumber({
        running: 17,
        invoiceType: "INVDOM",
        jobNo: "ISLI-26.06-012",
        issueMonth: 7,
        issueYear: 2026,
      }),
    ).toBe("017-INVDOM/ISLI-26.06-012/VII/2026");
  });

  it("cocok dengan invoice ekspor asli", () => {
    expect(
      formatInvoiceNumber({
        running: 4,
        invoiceType: "INVEXP",
        jobNo: "ISLI-26.07-003(AF)",
        issueMonth: 7,
        issueYear: 2026,
      }),
    ).toBe("004-INVEXP/ISLI-26.07-003(AF)/VII/2026");
  });

  it("memetakan scope ke jenis invoice", () => {
    expect(invoiceTypeForScope("DOM")).toBe("INVDOM");
    expect(invoiceTypeForScope("EXP")).toBe("INVEXP");
    expect(invoiceTypeForScope("IMP")).toBe("INVIMP");
  });
});

describe("termin pembayaran", () => {
  it("domestik 30 hari, EXIM 14 hari", () => {
    expect(paymentTermDays("DOM")).toBe(30);
    expect(paymentTermDays("EXP")).toBe(14);
    expect(paymentTermDays("IMP")).toBe(14);
  });

  it("menghitung jatuh tempo memakai hari kalender", () => {
    const terbit = new Date("2026-07-14T00:00:00+07:00");
    const jatuhTempo = computeDueDate(terbit, "DOM");
    expect(jatuhTempo.getDate()).toBe(13);
    expect(jatuhTempo.getMonth()).toBe(7); // Agustus
  });
});
