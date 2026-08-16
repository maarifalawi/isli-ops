import { describe, expect, it } from "vitest";
import {
  ajukanRealokasi,
  cekCap,
  cekFinal,
  cekJumlahPositifBulat,
} from "../../src/lib/realokasi/index";

/*
 * Test unit murni realokasi biaya — Irisan 4e.
 *
 * Validasi yang menyentuh DB (cap dengan baris nyata, FINAL dari kolom status)
 * dibuktikan di tests/integration/realokasi.integration.test.ts. Di sini yang
 * diuji: aritmetika cap, validasi jumlah, FINAL-lock murni, dan guard awal
 * ajukanRealokasi yang berjalan SEBELUM transaksi dibuka (self-job & jumlah —
 * fakeDb di bawah akan MELEMPAR kalau transaction sampai terpanggil, bukti
 * bahwa penolakan terjadi di lapis murni).
 */

/** Fake db: kalau kode sampai membuka transaksi, test GAGAL keras. */
const fakeDb = {
  transaction: () => {
    throw new Error(
      "fakeDb.transaction tidak boleh dipanggil — validasi harus menolak lebih dulu.",
    );
  },
} as never;

const STAFF = { id: "user-staff-1", role: "STAFF" as const };

const INPUT_DASAR = {
  originChargeLineId: "cl-1",
  originJobId: "job-asal",
  destinationJobId: "job-tujuan",
  alasan: "Biaya dooring memang milik job tujuan.",
};

describe("cekJumlahPositifBulat (jumlah wajib bulat > 0)", () => {
  it("terima bilangan bulat positif", () => {
    expect(cekJumlahPositifBulat(2_500_000)).toEqual({ ok: true, value: 2_500_000n });
    expect(cekJumlahPositifBulat(1)).toEqual({ ok: true, value: 1n });
    expect(cekJumlahPositifBulat(99n)).toEqual({ ok: true, value: 99n });
  });

  it("tolak nol (number maupun bigint)", () => {
    expect(cekJumlahPositifBulat(0).ok).toBe(false);
    expect(cekJumlahPositifBulat(0n).ok).toBe(false);
  });

  it("tolak negatif", () => {
    expect(cekJumlahPositifBulat(-1).ok).toBe(false);
    expect(cekJumlahPositifBulat(-50_000n).ok).toBe(false);
  });

  it("tolak pecahan", () => {
    expect(cekJumlahPositifBulat(1_000.5).ok).toBe(false);
  });

  it("tolak kosong / NaN / Infinity", () => {
    expect(cekJumlahPositifBulat(null).ok).toBe(false);
    expect(cekJumlahPositifBulat(undefined).ok).toBe(false);
    expect(cekJumlahPositifBulat(Number.NaN).ok).toBe(false);
    expect(cekJumlahPositifBulat(Number.POSITIVE_INFINITY).ok).toBe(false);
  });

  it("tolak di luar rentang aman integer", () => {
    expect(cekJumlahPositifBulat(Number.MAX_SAFE_INTEGER + 100).ok).toBe(false);
  });
});

describe("cekCap (keputusan poin 4: diajukan + sudah disetujui ≤ pencadangan)", () => {
  const PENCADANGAN = 10_000_000n;

  it("lolos bila total masih di bawah pencadangan", () => {
    expect(cekCap(4_000_000n, 0n, PENCADANGAN).ok).toBe(true);
    expect(cekCap(3_000_000n, 6_000_000n, PENCADANGAN).ok).toBe(true);
  });

  it("lolos tepat di batas (≤, bukan <)", () => {
    expect(cekCap(10_000_000n, 0n, PENCADANGAN).ok).toBe(true);
    expect(cekCap(4_000_000n, 6_000_000n, PENCADANGAN).ok).toBe(true);
  });

  it("tolak bila melebihi — pesan menyebut angka terkait", () => {
    const hasil = cekCap(6_000_000n, 6_000_000n, PENCADANGAN);
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) {
      expect(hasil.error).toMatch(/melebihi sisa pencadangan/);
      expect(hasil.error).toContain("6000000");
      expect(hasil.error).toContain("10000000");
    }
  });

  it("pending lain tidak dihitung (totalDisetujuiLain hanya yang APPROVED)", () => {
    // Dua proposal pending masing-masing 8 juta: pengajuan tetap lolos karena
    // yang disetujui masih 0. Race-nya ditutup re-check saat approve.
    expect(cekCap(8_000_000n, 0n, PENCADANGAN).ok).toBe(true);
  });
});

describe("cekFinal (keputusan poin 5: tolak bila job asal ATAU tujuan FINAL)", () => {
  it("lolos bila keduanya belum FINAL", () => {
    expect(cekFinal("DRAFT", "DRAFT").ok).toBe(true);
    expect(cekFinal("DISETUJUI_1", "DIAJUKAN").ok).toBe(true);
    expect(cekFinal("DIBATALKAN", "DRAFT").ok).toBe(true); // status lain tak dikunci di 4e
  });

  it("tolak bila job asal FINAL", () => {
    const hasil = cekFinal("FINAL", "DRAFT");
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.error).toMatch(/asal.*FINAL/);
  });

  it("tolak bila job tujuan FINAL", () => {
    const hasil = cekFinal("DRAFT", "FINAL");
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.error).toMatch(/tujuan.*FINAL/);
  });
});

describe("ajukanRealokasi — guard awal tanpa menyentuh DB", () => {
  it("tolak job asal = tujuan (self-job)", async () => {
    const hasil = await ajukanRealokasi(fakeDb, STAFF, {
      ...INPUT_DASAR,
      originJobId: "job-sama",
      destinationJobId: "job-sama",
      jumlahIdr: 1_000_000,
    });
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.error).toMatch(/tidak boleh sama/);
  });

  it("tolak jumlah nol", async () => {
    const hasil = await ajukanRealokasi(fakeDb, STAFF, {
      ...INPUT_DASAR,
      jumlahIdr: 0,
    });
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.error).toMatch(/lebih dari nol/);
  });

  it("tolak jumlah negatif", async () => {
    const hasil = await ajukanRealokasi(fakeDb, STAFF, {
      ...INPUT_DASAR,
      jumlahIdr: -250_000,
    });
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.error).toMatch(/lebih dari nol/);
  });

  it("tolak jumlah pecahan", async () => {
    const hasil = await ajukanRealokasi(fakeDb, STAFF, {
      ...INPUT_DASAR,
      jumlahIdr: 123_456.78,
    });
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.error).toMatch(/bilangan bulat/);
  });

  it("tolak tanpa alasan", async () => {
    const hasil = await ajukanRealokasi(fakeDb, STAFF, {
      ...INPUT_DASAR,
      alasan: "   ",
      jumlahIdr: 1_000_000,
    });
    expect(hasil.ok).toBe(false);
    if (!hasil.ok) expect(hasil.error).toMatch(/[Aa]lasan/);
  });
});
