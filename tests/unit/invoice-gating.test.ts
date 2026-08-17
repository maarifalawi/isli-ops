import {
  bolehBatalkan,
  bolehBuatDraft,
  bolehKirim,
  bolehMencatatBayar,
  bolehTerbitkan,
} from "@/app/invoice/gating";
import { db } from "@/db/index";
import { createDraftInvoice } from "@/lib/invoice/index";
import { describe, expect, it } from "vitest";

/*
 * Irisan 10 Item 6 — kunci matriks aksi UI invoice customer ke RBAC.md:
 * terbitkan/kirim = invoice:issue (O/M), batalkan = invoice:void (OWNER),
 * bayar = payment:record (O/M/S), buat draft = invoice:create (O/M/S).
 */

describe("aksi invoice customer per peran", () => {
  it("terbitkan/kirim: hanya OWNER & MANAGER", () => {
    expect(bolehTerbitkan("OWNER")).toBe(true);
    expect(bolehTerbitkan("MANAGER")).toBe(true);
    expect(bolehTerbitkan("STAFF")).toBe(false);
    expect(bolehKirim("STAFF")).toBe(false);
  });

  it("batalkan (void): HANYA OWNER", () => {
    expect(bolehBatalkan("OWNER")).toBe(true);
    expect(bolehBatalkan("MANAGER")).toBe(false);
    expect(bolehBatalkan("STAFF")).toBe(false);
  });

  it("catat pembayaran: ketiga peran", () => {
    expect(bolehMencatatBayar("OWNER")).toBe(true);
    expect(bolehMencatatBayar("MANAGER")).toBe(true);
    expect(bolehMencatatBayar("STAFF")).toBe(true);
  });

  it("buat draft: ketiga peran (invoice:create)", () => {
    expect(bolehBuatDraft("STAFF")).toBe(true);
  });
});

describe("J1: ketahanan createDraftInvoice terhadap UUID invalid (Irisan 10 Item 6)", () => {
  it("jobId bukan UUID → gagal ramah 'Job tidak ditemukan.', TANPA throw", async () => {
    const hasil = await createDraftInvoice(
      db,
      { id: "u1", role: "OWNER" },
      {
        jobId: "bukan-uuid",
        pph23Applicable: false,
      },
    );
    expect(hasil).toEqual({ ok: false, error: "Job tidak ditemukan." });
  });
});
