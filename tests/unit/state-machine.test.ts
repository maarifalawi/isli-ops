import { describe, expect, it } from "vitest";
import {
  type AKSI_TRANSISI,
  IZIN_PER_AKSI,
  JOB_STATUS,
  type JobStatus,
  TRANSISI,
  canTransition,
  isEditable,
  isFinal,
  isLocked,
  statusTujuan,
} from "../../src/lib/state-machine/index";

/*
 * Test unit MURNI state machine job — Irisan 5.
 *
 * Sumber kebenaran: docs/STATE-MACHINE.md §1 (mapping nama skema Q-IRIS5-2,
 * keputusan user 17 Agu 2026):
 *   SUBMITTED = DIAJUKAN, APPROVED_L1 = DISETUJUI_1, CANCELLED = DIBATALKAN.
 *   UNLOCK_REQUESTED kini state nyata (Q-IRIS5-1).
 *
 * Predikat (Q-IRIS5-8):
 *   isFinal    = hanya FINAL (dasar cek J-INV-3/4 sisi invoice).
 *   isLocked   = FINAL | DIBATALKAN (guard realokasi 4e).
 *   isEditable = hanya DRAFT (guard edit charge line/header/kurs 4b).
 */

describe("JOB_STATUS — 6 state sesuai skema + Q-IRIS5-1", () => {
  it("tepat enam state, urut sesuai alur", () => {
    expect([...JOB_STATUS]).toEqual([
      "DRAFT",
      "DIAJUKAN",
      "DISETUJUI_1",
      "FINAL",
      "UNLOCK_REQUESTED",
      "DIBATALKAN",
    ]);
  });
});

describe("TRANSISI — tepat 9 baris sesuai STATE-MACHINE.md §1", () => {
  it("tabel transisi utuh, tidak lebih tidak kurang", () => {
    expect(TRANSISI).toEqual([
      { dari: "DRAFT", aksi: "submit", ke: "DIAJUKAN" },
      { dari: "DRAFT", aksi: "cancel", ke: "DIBATALKAN" },
      { dari: "DIAJUKAN", aksi: "approve_l1", ke: "DISETUJUI_1" },
      { dari: "DIAJUKAN", aksi: "reject", ke: "DRAFT" },
      { dari: "DISETUJUI_1", aksi: "approve_final", ke: "FINAL" },
      { dari: "DISETUJUI_1", aksi: "reject", ke: "DRAFT" },
      { dari: "FINAL", aksi: "request_unlock", ke: "UNLOCK_REQUESTED" },
      { dari: "UNLOCK_REQUESTED", aksi: "unlock_granted", ke: "DRAFT" },
      { dari: "UNLOCK_REQUESTED", aksi: "unlock_denied", ke: "FINAL" },
    ]);
  });
});

describe("canTransition — matriks penuh 6 state × 8 aksi", () => {
  const AKSI: Array<(typeof AKSI_TRANSISI)[number]> = [
    "submit",
    "cancel",
    "approve_l1",
    "reject",
    "approve_final",
    "request_unlock",
    "unlock_granted",
    "unlock_denied",
  ];

  it("tepat 9 kombinasi sah", () => {
    const sah: string[] = [];
    for (const dari of JOB_STATUS) {
      for (const aksi of AKSI) {
        if (canTransition(dari, aksi) !== null) sah.push(`${dari} --${aksi}-->`);
      }
    }
    expect(sah).toHaveLength(9);
  });

  it("transisi sah mengembalikan status tujuan yang benar", () => {
    expect(canTransition("DRAFT", "submit")).toBe("DIAJUKAN");
    expect(canTransition("DRAFT", "cancel")).toBe("DIBATALKAN");
    expect(canTransition("DIAJUKAN", "approve_l1")).toBe("DISETUJUI_1");
    expect(canTransition("DIAJUKAN", "reject")).toBe("DRAFT");
    expect(canTransition("DISETUJUI_1", "approve_final")).toBe("FINAL");
    expect(canTransition("DISETUJUI_1", "reject")).toBe("DRAFT");
    expect(canTransition("FINAL", "request_unlock")).toBe("UNLOCK_REQUESTED");
    expect(canTransition("UNLOCK_REQUESTED", "unlock_granted")).toBe("DRAFT");
    expect(canTransition("UNLOCK_REQUESTED", "unlock_denied")).toBe("FINAL");
  });

  it("transisi ganda/loncat DITOLAK (null)", () => {
    // DRAFT tidak bisa langsung FINAL / approve tanpa submit.
    expect(canTransition("DRAFT", "approve_l1")).toBeNull();
    expect(canTransition("DRAFT", "approve_final")).toBeNull();
    expect(canTransition("DIAJUKAN", "approve_final")).toBeNull(); // harus lewat L1 dulu
    expect(canTransition("DISETUJUI_1", "approve_l1")).toBeNull(); // L1 dobel
    expect(canTransition("DISETUJUI_1", "submit")).toBeNull();
    // FINAL terminal: tidak bisa cancel / submit / approve apa pun.
    expect(canTransition("FINAL", "cancel")).toBeNull();
    expect(canTransition("FINAL", "submit")).toBeNull();
    expect(canTransition("FINAL", "approve_final")).toBeNull();
    expect(canTransition("FINAL", "reject")).toBeNull();
    // Unlock hanya dari FINAL — dan hanya lewat UNLOCK_REQUESTED (J-INV-2:
    // unlock_granted TIDAK boleh langsung dari FINAL).
    expect(canTransition("FINAL", "unlock_granted")).toBeNull();
    expect(canTransition("FINAL", "unlock_denied")).toBeNull();
    // UNLOCK_REQUESTED: hanya dua jalan keluar.
    expect(canTransition("UNLOCK_REQUESTED", "submit")).toBeNull();
    expect(canTransition("UNLOCK_REQUESTED", "cancel")).toBeNull();
    expect(canTransition("UNLOCK_REQUESTED", "request_unlock")).toBeNull();
    // DIBATALKAN terminal mutlak.
    for (const aksi of AKSI) {
      expect(canTransition("DIBATALKAN", aksi)).toBeNull();
    }
    // DIAJUKAN tidak bisa dibatalkan (cancel hanya dari DRAFT).
    expect(canTransition("DIAJUKAN", "cancel")).toBeNull();
  });
});

describe("statusTujuan — error informatif untuk transisi invalid", () => {
  it("melempar Error yang menyebut status dan aksi", () => {
    expect(() => statusTujuan("FINAL", "submit")).toThrow(/FINAL.*submit/);
    expect(() => statusTujuan("DIBATALKAN", "approve_l1")).toThrow(
      /DIBATALKAN.*approve_l1/,
    );
  });
});

describe("predikat status (Q-IRIS5-8)", () => {
  const statusSemua: JobStatus[] = [
    "DRAFT",
    "DIAJUKAN",
    "DISETUJUI_1",
    "FINAL",
    "UNLOCK_REQUESTED",
    "DIBATALKAN",
  ];

  it("isFinal: hanya FINAL", () => {
    for (const s of statusSemua) {
      expect(isFinal(s)).toBe(s === "FINAL");
    }
  });

  it("isLocked: FINAL dan DIBATALKAN (terminal)", () => {
    for (const s of statusSemua) {
      expect(isLocked(s)).toBe(s === "FINAL" || s === "DIBATALKAN");
    }
  });

  it("isEditable: hanya DRAFT (angka beku begitu diajukan)", () => {
    for (const s of statusSemua) {
      expect(isEditable(s)).toBe(s === "DRAFT");
    }
  });
});

describe("IZIN_PER_AKSI — tiap transisi punya izin authz satu pintu", () => {
  it("delapan aksi terpetakan ke izin yang benar", () => {
    expect(IZIN_PER_AKSI.submit).toBe("job:submit");
    expect(IZIN_PER_AKSI.cancel).toBe("job:cancel");
    expect(IZIN_PER_AKSI.approve_l1).toBe("job:approve_first");
    expect(IZIN_PER_AKSI.reject).toBe("job:reject");
    expect(IZIN_PER_AKSI.approve_final).toBe("job:approve_final");
    expect(IZIN_PER_AKSI.request_unlock).toBe("job:request_unlock");
    expect(IZIN_PER_AKSI.unlock_granted).toBe("job:unlock");
    expect(IZIN_PER_AKSI.unlock_denied).toBe("job:unlock");
  });
});
