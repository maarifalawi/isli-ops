import { bolehMengajukan, bolehMenyetujui } from "@/app/realokasi/gating";
import { describe, expect, it } from "vitest";

/*
 * Irisan 10 Item 8 — kunci matriks aksi UI realokasi ke RBAC:
 * mengajukan = job:edit (semua peran), menyetujui/menolak =
 * job:reallocate (MANAGER/OWNER). Service 4e tetap penjaga otoritatif.
 */

describe("gating realokasi", () => {
  it("mengajukan: semua peran (job:edit)", () => {
    expect(bolehMengajukan("OWNER")).toBe(true);
    expect(bolehMengajukan("MANAGER")).toBe(true);
    expect(bolehMengajukan("STAFF")).toBe(true);
  });

  it("menyetujui/menolak: hanya MANAGER & OWNER (job:reallocate)", () => {
    expect(bolehMenyetujui("OWNER")).toBe(true);
    expect(bolehMenyetujui("MANAGER")).toBe(true);
    expect(bolehMenyetujui("STAFF")).toBe(false);
  });
});
