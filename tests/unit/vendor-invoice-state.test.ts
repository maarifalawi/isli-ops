import { describe, expect, it } from "vitest";
import { AuthorizationError, assertCan, can } from "../../src/lib/authz/index";
import { jarakLevenshtein } from "../../src/lib/similarity/index";
import {
  AKSI_VENDOR_INVOICE,
  IZIN_PER_AKSI_VENDOR_INVOICE,
  TRANSISI_VENDOR_INVOICE,
  VENDOR_INVOICE_STATUS,
  canTransitionVendorInvoice,
  isDibatalkan,
  isDibayar,
  mengunciActual,
  statusTujuanVendorInvoice,
} from "../../src/lib/vendor-invoice/state";

/*
 * Test unit state machine invoice vendor — Irisan 7 (D1–D3).
 *
 * Membuktikan:
 *   - Tabel transisi 4-state persis keputusan D1 (skema menang):
 *     DITERIMA→DIVERIFIKASI→DIBAYAR, batal dari DITERIMA/DIVERIFIKASI,
 *     unlock_paid DIBAYAR→DIVERIFIKASI. TIDAK ada dispute/awaiting state.
 *   - DIBATALKAN terminal mutlak; DIBAYAR terminal kecuali unlock_paid.
 *   - Izin per aksi (D2/D3): verify O/M (STAFF ✗), pay O/M, batal & unlock
 *     OWNER saja (R-A5).
 *   - V-INV-2 (kasus 01A/01B): "01A" vs "01B" terdeteksi MIRIP oleh
 *     jarakLevenshtein — dipakai sebagai PERINGATAN, bukan blokir; nomor
 *     identik ditolak DB (uq_vendor_invoice, dibuktikan test integrasi).
 *   - mengunciActual: hanya DIVERIFIKASI/DIBAYAR yang mengunci actual (D7).
 */

describe("vendor-invoice state machine (D1)", () => {
  it("enum status persis skema 4-state — tidak ada state dispute/rejected", () => {
    expect(VENDOR_INVOICE_STATUS).toEqual([
      "DITERIMA",
      "DIVERIFIKASI",
      "DIBAYAR",
      "DIBATALKAN",
    ]);
  });

  it("tabel transisi: hanya 5 baris sah — tidak ada transisi lain", () => {
    expect(TRANSISI_VENDOR_INVOICE).toEqual([
      { dari: "DITERIMA", aksi: "verify", ke: "DIVERIFIKASI" },
      { dari: "DIVERIFIKASI", aksi: "pay", ke: "DIBAYAR" },
      { dari: "DITERIMA", aksi: "batal", ke: "DIBATALKAN" },
      { dari: "DIVERIFIKASI", aksi: "batal", ke: "DIBATALKAN" },
      { dari: "DIBAYAR", aksi: "unlock_paid", ke: "DIVERIFIKASI" },
    ]);
  });

  it("alur utama: DITERIMA → DIVERIFIKASI → DIBAYAR", () => {
    expect(canTransitionVendorInvoice("DITERIMA", "verify")).toBe("DIVERIFIKASI");
    expect(canTransitionVendorInvoice("DIVERIFIKASI", "pay")).toBe("DIBAYAR");
  });

  it("pay langsung dari DITERIMA DITOLAK — wajib diverifikasi dulu", () => {
    expect(canTransitionVendorInvoice("DITERIMA", "pay")).toBeNull();
  });

  it("DIBATALKAN terminal mutlak — semua aksi ditolak", () => {
    for (const aksi of AKSI_VENDOR_INVOICE) {
      expect(canTransitionVendorInvoice("DIBATALKAN", aksi)).toBeNull();
    }
    expect(isDibatalkan("DIBATALKAN")).toBe(true);
  });

  it("DIBAYAR terminal kecuali unlock_paid (R-A5)", () => {
    expect(canTransitionVendorInvoice("DIBAYAR", "pay")).toBeNull(); // tolak bayar kedua (R7.2)
    expect(canTransitionVendorInvoice("DIBAYAR", "batal")).toBeNull(); // batal DIBAYAR = unlock dulu
    expect(canTransitionVendorInvoice("DIBAYAR", "unlock_paid")).toBe("DIVERIFIKASI");
    expect(isDibayar("DIBAYAR")).toBe(true);
  });

  it("verify dari DIVERIFIKASI/DIBAYAR DITOLAK (tidak ada re-verify)", () => {
    expect(canTransitionVendorInvoice("DIVERIFIKASI", "verify")).toBeNull();
    expect(canTransitionVendorInvoice("DIBAYAR", "verify")).toBeNull();
  });

  it("statusTujuanVendorInvoice melempar Error informatif untuk transisi invalid", () => {
    expect(() => statusTujuanVendorInvoice("DIBAYAR", "pay")).toThrow(
      /Transisi tidak sah/,
    );
  });

  it("mengunciActual: hanya DIVERIFIKASI/DIBAYAR (guard D7); DIBATALKAN/DITERIMA tidak", () => {
    expect(mengunciActual("DIVERIFIKASI")).toBe(true);
    expect(mengunciActual("DIBAYAR")).toBe(true);
    expect(mengunciActual("DITERIMA")).toBe(false);
    expect(mengunciActual("DIBATALKAN")).toBe(false);
  });
});

describe("izin per aksi vendor invoice (D2/D3)", () => {
  it("verify = vendor_invoice:verify (O/M, STAFF ✗)", () => {
    expect(IZIN_PER_AKSI_VENDOR_INVOICE.verify).toBe("vendor_invoice:verify");
    expect(can("OWNER", "vendor_invoice:verify")).toBe(true);
    expect(can("MANAGER", "vendor_invoice:verify")).toBe(true);
    expect(can("STAFF", "vendor_invoice:verify")).toBe(false);
    expect(() => assertCan("STAFF", "vendor_invoice:verify")).toThrow(AuthorizationError);
  });

  it("pay = vendor_invoice:mark_paid (O/M, STAFF ✗)", () => {
    expect(IZIN_PER_AKSI_VENDOR_INVOICE.pay).toBe("vendor_invoice:mark_paid");
    expect(can("OWNER", "vendor_invoice:mark_paid")).toBe(true);
    expect(can("MANAGER", "vendor_invoice:mark_paid")).toBe(true);
    expect(can("STAFF", "vendor_invoice:mark_paid")).toBe(false);
  });

  it("batal & unlock_paid = vendor_invoice:unlock_paid (OWNER SAJA — R-A5)", () => {
    expect(IZIN_PER_AKSI_VENDOR_INVOICE.batal).toBe("vendor_invoice:unlock_paid");
    expect(IZIN_PER_AKSI_VENDOR_INVOICE.unlock_paid).toBe("vendor_invoice:unlock_paid");
    expect(can("OWNER", "vendor_invoice:unlock_paid")).toBe(true);
    expect(can("MANAGER", "vendor_invoice:unlock_paid")).toBe(false);
    expect(can("STAFF", "vendor_invoice:unlock_paid")).toBe(false);
  });

  it("receive = vendor_invoice:create (O/M/S)", () => {
    expect(can("OWNER", "vendor_invoice:create")).toBe(true);
    expect(can("MANAGER", "vendor_invoice:create")).toBe(true);
    expect(can("STAFF", "vendor_invoice:create")).toBe(true);
  });
});

describe("V-INV-2 — peringatan nomor mirip kasus 01A/01B (R7.1)", () => {
  it("01A vs 01B terdeteksi mirip (jarak 1) — bahan peringatan", () => {
    expect(jarakLevenshtein("01A", "01B")).toBe(1);
    expect(jarakLevenshtein("01A", "01B")).toBeLessThanOrEqual(2);
  });

  it("nomor identik bukan kasus peringatan — itu ditolak DB (uq_vendor_invoice)", () => {
    expect(jarakLevenshtein("INV/001", "INV/001")).toBe(0);
  });

  it("nomor beda jauh TIDAK memicu peringatan", () => {
    expect(jarakLevenshtein("INV/2026/001", "INV/2026/999")).toBeGreaterThan(2);
    expect(jarakLevenshtein("01A", "TRK-777-KJT")).toBeGreaterThan(2);
  });

  it("typo satu karakter tetap terdeteksi (kasus staf salah ketik)", () => {
    expect(jarakLevenshtein("INV/2026/041", "INV/2026/042")).toBe(1);
  });
});
