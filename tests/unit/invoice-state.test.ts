/*
 * Unit test — state machine invoice customer (murni, tanpa DB). Irisan 6.
 *
 * Sumber kebenaran: docs/STATE-MACHINE.md §2 + keputusan user 17 Agu 2026:
 *   - Konflik #2: PARTIALLY_PAID = TERBAYAR_SEBAGIAN, ditambah ke enum
 *     (state proper, bukan derivasi payment_in).
 *   - Konflik #1: void invoice = OWNER saja (RBAC/kode menang, "Finance
 *     Manager" di STATE-MACHINE.md diperbaiki ke OWNER).
 *   - Send memakai izin invoice:issue (tidak ada izin khusus send di RBAC;
 *     satu tingkat "Finance" yang sama yang boleh menerbitkan).
 */

import { describe, expect, it } from "vitest";
import {
  AKSI_INVOICE,
  INVOICE_STATUS,
  IZIN_PER_AKSI_INVOICE,
  TRANSISI_INVOICE,
  canTransitionInvoice,
  statusTujuanInvoice,
} from "../../src/lib/invoice/state";

describe("mapping nama dokumen <-> skema (pola Q-IRIS5-2)", () => {
  it("enum skema memuat 6 status termasuk TERBAYAR_SEBAGIAN", () => {
    expect(INVOICE_STATUS).toEqual([
      "DRAFT",
      "TERBIT",
      "TERKIRIM",
      "TERBAYAR_SEBAGIAN",
      "LUNAS",
      "BATAL",
    ]);
  });
});

describe("tabel transisi invoice (STATE-MACHINE.md §2)", () => {
  it("semua transisi sah persis seperti dokumen", () => {
    expect(TRANSISI_INVOICE).toEqual([
      { dari: "DRAFT", aksi: "issue", ke: "TERBIT" },
      { dari: "TERBIT", aksi: "send", ke: "TERKIRIM" },
      { dari: "TERBIT", aksi: "void", ke: "BATAL" },
      { dari: "TERKIRIM", aksi: "pay_partial", ke: "TERBAYAR_SEBAGIAN" },
      { dari: "TERKIRIM", aksi: "pay_full", ke: "LUNAS" },
      { dari: "TERBAYAR_SEBAGIAN", aksi: "pay_full", ke: "LUNAS" },
    ]);
  });

  it("DRAFT hanya bisa issue; tidak bisa send/pay/void langsung", () => {
    expect(canTransitionInvoice("DRAFT", "issue")).toBe("TERBIT");
    expect(canTransitionInvoice("DRAFT", "send")).toBeNull();
    expect(canTransitionInvoice("DRAFT", "pay_full")).toBeNull();
    expect(canTransitionInvoice("DRAFT", "void")).toBeNull();
  });

  it("I-INV-3: LUNAS terminal — semua aksi ditolak", () => {
    for (const aksi of AKSI_INVOICE) {
      expect(canTransitionInvoice("LUNAS", aksi)).toBeNull();
    }
  });

  it("I-INV-2/I-INV-1: BATAL terminal — tidak bisa hidup lagi", () => {
    for (const aksi of AKSI_INVOICE) {
      expect(canTransitionInvoice("BATAL", aksi)).toBeNull();
    }
  });

  it("void hanya dari TERBIT — TERKIRIM/TerbayarSebagian tidak bisa dibatalkan", () => {
    expect(canTransitionInvoice("TERBIT", "void")).toBe("BATAL");
    expect(canTransitionInvoice("TERKIRIM", "void")).toBeNull();
    expect(canTransitionInvoice("TERBAYAR_SEBAGIAN", "void")).toBeNull();
  });

  it("pay_full diperbolehkan dari TERKIRIM dan TERBAYAR_SEBAGIAN", () => {
    expect(canTransitionInvoice("TERKIRIM", "pay_full")).toBe("LUNAS");
    expect(canTransitionInvoice("TERBAYAR_SEBAGIAN", "pay_full")).toBe("LUNAS");
  });

  it("pay_partial hanya dari TERKIRIM", () => {
    expect(canTransitionInvoice("TERKIRIM", "pay_partial")).toBe("TERBAYAR_SEBAGIAN");
    expect(canTransitionInvoice("TERBIT", "pay_partial")).toBeNull();
    expect(canTransitionInvoice("TERBAYAR_SEBAGIAN", "pay_partial")).toBeNull();
  });

  it("statusTujuanInvoice melempar error informatif untuk transisi tidak sah", () => {
    expect(() => statusTujuanInvoice("LUNAS", "void")).toThrow(/LUNAS/);
    expect(() => statusTujuanInvoice("DRAFT", "send")).toThrow(/STATE-MACHINE/);
  });
});

describe("izin per aksi (RBAC + keputusan konflik #1)", () => {
  it("issue & send = invoice:issue (O/M, Finance), void = invoice:void (OWNER saja)", () => {
    expect(IZIN_PER_AKSI_INVOICE.issue).toBe("invoice:issue");
    expect(IZIN_PER_AKSI_INVOICE.send).toBe("invoice:issue");
    expect(IZIN_PER_AKSI_INVOICE.void).toBe("invoice:void");
  });

  it("pay_partial & pay_full = payment:record (O/M/S)", () => {
    expect(IZIN_PER_AKSI_INVOICE.pay_partial).toBe("payment:record");
    expect(IZIN_PER_AKSI_INVOICE.pay_full).toBe("payment:record");
  });

  it("setiap aksi punya izin — tidak ada yang undefined", () => {
    for (const aksi of AKSI_INVOICE) {
      expect(IZIN_PER_AKSI_INVOICE[aksi]).toBeTruthy();
    }
  });
});
