import { describe, expect, it } from "vitest";
import {
  assertCan,
  assertFinalApprover,
  assertNotSelfApproval,
  can,
} from "../../src/lib/authz/index";

describe("matriks izin", () => {
  it("OWNER boleh semuanya", () => {
    expect(can("OWNER", "job:approve_final")).toBe(true);
    expect(can("OWNER", "vendor_invoice:unlock_paid")).toBe(true);
    expect(can("OWNER", "user:manage")).toBe(true);
  });

  it("MANAGER tidak boleh persetujuan final", () => {
    expect(can("MANAGER", "job:approve_first")).toBe(true);
    expect(can("MANAGER", "job:approve_final")).toBe(false);
  });

  it("MANAGER tidak boleh membuka kunci invoice vendor yang sudah dibayar", () => {
    // Permintaan langsung Bu Niken: yang sudah terbayar harus terkunci,
    // dan hanya level tertentu yang boleh membukanya.
    expect(can("MANAGER", "vendor_invoice:unlock_paid")).toBe(false);
  });

  it("semua peran boleh melihat margin (R-A6 dicabut 13 Agu 2026)", () => {
    expect(can("STAFF", "job:view_margin")).toBe(true);
    expect(can("MANAGER", "job:view_margin")).toBe(true);
    expect(can("OWNER", "job:view_margin")).toBe(true);
  });

  it("STAFF tidak boleh menyetujui apa pun", () => {
    expect(can("STAFF", "job:approve_first")).toBe(false);
    expect(can("STAFF", "job:approve_final")).toBe(false);
  });

  it("Irisan 4e: approve realokasi hanya MANAGER/OWNER, STAFF tidak", () => {
    expect(can("MANAGER", "job:reallocate")).toBe(true);
    expect(can("OWNER", "job:reallocate")).toBe(true);
    expect(can("STAFF", "job:reallocate")).toBe(false);
    // Pembuat proposal cukup job:edit (dimiliki ketiga peran).
    expect(can("STAFF", "job:edit")).toBe(true);
  });

  it("STAFF tidak boleh menandai invoice vendor lunas", () => {
    expect(can("STAFF", "vendor_invoice:mark_paid")).toBe(false);
  });

  it("assertCan melempar dengan pesan berbahasa Indonesia", () => {
    expect(() => assertCan("STAFF", "job:approve_final")).toThrow(/tidak berwenang/);
  });
});

describe("aturan persetujuan", () => {
  it("menolak persetujuan atas pekerjaan sendiri (R-A1)", () => {
    expect(() => assertNotSelfApproval("user-1", "user-1")).toThrow(/R-A1/);
  });

  it("berlaku juga untuk OWNER", () => {
    // Pak Indra pun tidak boleh menyetujui job yang beliau buat sendiri.
    expect(() => assertNotSelfApproval("indra", "indra")).toThrow();
  });

  it("mengizinkan persetujuan oleh orang lain", () => {
    expect(() => assertNotSelfApproval("indra", "niken")).not.toThrow();
  });

  it("hanya OWNER yang boleh persetujuan final (R-A2)", () => {
    expect(() => assertFinalApprover("OWNER")).not.toThrow();
    expect(() => assertFinalApprover("MANAGER")).toThrow();
    expect(() => assertFinalApprover("STAFF")).toThrow();
  });
});
