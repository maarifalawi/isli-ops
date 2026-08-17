import {
  bolehTampilTombolBayar,
  bolehTampilTombolVerifikasi,
  harusRetryOtomatis,
} from "@/app/invoice-vendor/gating";
import { describe, expect, it } from "vitest";

/*
 * Irisan 10 Item 5 — kunci hard requirement UI:
 *
 * V-INV-3: tombol Bayar TIDAK boleh tampil sebelum snapshot status dimuat.
 * Test ini sengaja ditulis dulu: kalau seseorang mengubah gating.ts menjadi
 * `return can(role, "vendor_invoice:mark_paid")` saja (tanpa syarat status
 * dimuat), test "status belum dimuat" MERAH — itulah buktinya mengikat.
 */

describe("V-INV-3: tombol Bayar hanya setelah status dimuat", () => {
  it("OWNER: status BELUM dimuat → tombol Bayar TIDAK tampil", () => {
    expect(bolehTampilTombolBayar("OWNER", false)).toBe(false);
  });

  it("OWNER: status sudah dimuat → tombol Bayar tampil", () => {
    expect(bolehTampilTombolBayar("OWNER", true)).toBe(true);
  });

  it("MANAGER: hanya setelah status dimuat", () => {
    expect(bolehTampilTombolBayar("MANAGER", false)).toBe(false);
    expect(bolehTampilTombolBayar("MANAGER", true)).toBe(true);
  });

  it("STAFF: tidak pernah — walau status sudah dimuat (mark_paid bukan miliknya)", () => {
    expect(bolehTampilTombolBayar("STAFF", true)).toBe(false);
    expect(bolehTampilTombolBayar("STAFF", false)).toBe(false);
  });
});

describe("izin verifikasi (D3)", () => {
  it("OWNER/MANAGER boleh; STAFF tidak", () => {
    expect(bolehTampilTombolVerifikasi("OWNER")).toBe(true);
    expect(bolehTampilTombolVerifikasi("MANAGER")).toBe(true);
    expect(bolehTampilTombolVerifikasi("STAFF")).toBe(false);
  });
});

describe("A2-1: retry otomatis cek nomor mirip (V-INV-2)", () => {
  it("gagal pertama → retry otomatis sekali", () => {
    expect(harusRetryOtomatis(0)).toBe(true);
  });

  it("gagal kedua → berhenti, tampilkan status gagal (tidak pernah diam-diam 'aman')", () => {
    expect(harusRetryOtomatis(1)).toBe(false);
    expect(harusRetryOtomatis(2)).toBe(false);
  });
});
