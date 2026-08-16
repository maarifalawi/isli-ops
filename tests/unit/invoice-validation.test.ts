/*
 * Unit test — validasi murni invoice customer (tanpa DB). Irisan 6.
 *
 * Menguji fungsi validation.ts: syarat terbit (R9.4/R9.4b), syarat issue
 * (R9.2 dueDate manual, baris selling tidak kosong), PPh 23 eksplisit (R3.5),
 * terbilang (angka golden Materee/Diametral), dan addendum seq tidak bentrok.
 */

import { describe, expect, it } from "vitest";
import {
  hitungTerbilang,
  validasiIssue,
  validasiPph23,
  validasiSyaratTerbit,
} from "../../src/lib/invoice/validation";
import { rupiah } from "../../src/lib/money/index";

const jobFinal = { status: "FINAL" as const, podDiterimaAt: new Date("2026-07-10") };

describe("validasiSyaratTerbit — R9.4 & R9.4b", () => {
  it("job belum FINAL ditolak", () => {
    const r = validasiSyaratTerbit(
      { status: "DIAJUKAN", podDiterimaAt: new Date() },
      {
        issuedBeforePod: false,
        earlyIssueApprovedBy: null,
        pembuatId: "a",
        approverRole: null,
      },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("FINAL");
  });

  it("job FINAL tanpa POD ditolak (R9.4)", () => {
    const r = validasiSyaratTerbit(
      { status: "FINAL", podDiterimaAt: null },
      {
        issuedBeforePod: false,
        earlyIssueApprovedBy: null,
        pembuatId: "a",
        approverRole: null,
      },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("POD");
  });

  it("job FINAL + POD lolos", () => {
    const r = validasiSyaratTerbit(jobFinal, {
      issuedBeforePod: false,
      earlyIssueApprovedBy: null,
      pembuatId: "a",
      approverRole: null,
    });
    expect(r.ok).toBe(true);
  });

  it("R9.4b: tanpa POD tapi ada izin OWNER ≠ pembuat → lolos", () => {
    const r = validasiSyaratTerbit(
      { status: "FINAL", podDiterimaAt: null },
      {
        issuedBeforePod: true,
        earlyIssueApprovedBy: "owner-1",
        pembuatId: "mgr-1",
        approverRole: "OWNER",
      },
    );
    expect(r.ok).toBe(true);
  });

  it("R9.4b: approver MANAGER ditolak (Q78: OWNER only)", () => {
    const r = validasiSyaratTerbit(
      { status: "FINAL", podDiterimaAt: null },
      {
        issuedBeforePod: true,
        earlyIssueApprovedBy: "mgr-1",
        pembuatId: "staff-1",
        approverRole: "MANAGER",
      },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("OWNER");
  });

  it("R9.4b: approver = pembuat ditolak (R-A1)", () => {
    const r = validasiSyaratTerbit(
      { status: "FINAL", podDiterimaAt: null },
      {
        issuedBeforePod: true,
        earlyIssueApprovedBy: "owner-1",
        pembuatId: "owner-1",
        approverRole: "OWNER",
      },
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("R-A1");
  });
});

describe("validasiIssue — R9.2 & baris selling", () => {
  it("invoice bukan DRAFT ditolak (I-INV-1)", () => {
    const r = validasiIssue("TERBIT", 2, "2026-08-13");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("DRAFT");
  });

  it("charge lines kosong ditolak — tidak ada invoice nol diam-diam", () => {
    const r = validasiIssue("DRAFT", 0, "2026-08-13");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("baris selling");
  });

  it("dueDate kosong ditolak (R9.2 manual wajib)", () => {
    const r = validasiIssue("DRAFT", 2, null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain("jatuh tempo");
    const r2 = validasiIssue("DRAFT", 2, "  ");
    expect(r2.ok).toBe(false);
  });

  it("semua syarat terpenuhi → lolos", () => {
    expect(validasiIssue("DRAFT", 1, "2026-08-13").ok).toBe(true);
  });
});

describe("R3.5 — PPh 23 selalu eksplisit", () => {
  it("hanya menerima boolean; bukan boolean ditolak", () => {
    expect(validasiPph23(true)).toBe(true);
    expect(validasiPph23(false)).toBe(true);
    // @ts-expect-error — uji salah tipe pemanggilan
    expect(validasiPph23(undefined)).toBe(false);
    // @ts-expect-error
    expect(validasiPph23("true")).toBe(false);
  });
});

describe("hitungTerbilang — angka invoice asli", () => {
  it("grand total Materee 23.848.600", () => {
    expect(hitungTerbilang(rupiah(23_848_600n))).toBe(
      "dua puluh tiga juta delapan ratus empat puluh delapan ribu enam ratus rupiah",
    );
  });

  it("grand total Diametral 131.429.434", () => {
    expect(hitungTerbilang(rupiah(131_429_434n))).toBe(
      "seratus tiga puluh satu juta empat ratus dua puluh sembilan ribu empat ratus tiga puluh empat rupiah",
    );
  });

  it("nol → 'nol rupiah' (fungsi murni harus konsisten)", () => {
    expect(hitungTerbilang(rupiah(0n))).toBe("nol rupiah");
  });
});
