import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { writeAudit } from "@/lib/audit/index";
import { describe, expect, it, vi } from "vitest";

/** Fake tx: cukup punya insert().values(), persis potongan yang dipakai helper. */
function fakeTx() {
  const values = vi.fn().mockResolvedValue(undefined);
  const insert = vi.fn().mockReturnValue({ values });
  return { tx: { insert } as never, insert, values };
}

describe("writeAudit", () => {
  it("tolak NONAKTIFKAN tanpa alasan", async () => {
    const { tx, insert } = fakeTx();
    await expect(
      writeAudit(tx, {
        userId: "u-1",
        aksi: "NONAKTIFKAN",
        entitas: "PORT",
        alasan: "   ",
      }),
    ).rejects.toThrow(/alasan WAJIB/);
    expect(insert).not.toHaveBeenCalled();
  });

  it("EDIT: satu baris, snapshot sebelum/sesudah jadi JSON", async () => {
    const { tx, insert, values } = fakeTx();
    const sebelum = { nama: "Lama", kota: "Surabaya" };
    const sesudah = { nama: "Baru", kota: "Surabaya" };
    await writeAudit(tx, {
      userId: "u-1",
      aksi: "EDIT",
      entitas: "CUSTOMER",
      entitasId: "c-1",
      sebelum,
      sesudah,
    });
    expect(insert).toHaveBeenCalledTimes(1);
    expect(values).toHaveBeenCalledWith({
      userId: "u-1",
      aksi: "EDIT",
      entitas: "CUSTOMER",
      entitasId: "c-1",
      sebelum: JSON.stringify(sebelum),
      sesudah: JSON.stringify(sesudah),
      alasan: null,
    });
  });

  it("CREATE: sebelum null, sesudah terisi", async () => {
    const { tx, values } = fakeTx();
    await writeAudit(tx, {
      userId: "u-2",
      aksi: "CREATE",
      entitas: "SHIP_LINE",
      entitasId: "s-1",
      sesudah: { nama: "KM Contoh" },
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        sebelum: null,
        sesudah: JSON.stringify({ nama: "KM Contoh" }),
      }),
    );
  });

  it("CHARGE_CODE: entitasId null karena PK-nya TEXT, kode terekam di JSON", async () => {
    const { tx, values } = fakeTx();
    await writeAudit(tx, {
      userId: "u-3",
      aksi: "CREATE",
      entitas: "CHARGE_CODE",
      entitasId: null,
      sesudah: { kode: "OCN-201", nama: "Ocean Freight" },
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ entitasId: null, entitas: "CHARGE_CODE" }),
    );
  });

  it("NONAKTIFKAN dengan alasan: alasan tersimpan", async () => {
    const { tx, values } = fakeTx();
    await writeAudit(tx, {
      userId: "u-4",
      aksi: "NONAKTIFKAN",
      entitas: "VENDOR",
      entitasId: "v-1",
      sebelum: { nama: "PT X" },
      sesudah: { nama: "PT X" },
      alasan: "Sudah tidak dipakai",
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({ alasan: "Sudah tidak dipakai" }),
    );
  });

  // ── Irisan 4e: REALOKASI & COST_REALLOCATION ─────────────────────────────
  it("REALOKASI tanpa alasan ditolak (Q06: alasan tertulis wajib)", async () => {
    const { tx, insert } = fakeTx();
    await expect(
      writeAudit(tx, {
        userId: "u-5",
        aksi: "REALOKASI",
        entitas: "COST_REALLOCATION",
        alasan: "  ",
      }),
    ).rejects.toThrow(/alasan WAJIB/);
    expect(insert).not.toHaveBeenCalled();
  });

  it("REALOKASI dengan alasan: entitas COST_REALLOCATION terekam", async () => {
    const { tx, values } = fakeTx();
    await writeAudit(tx, {
      userId: "u-5",
      aksi: "REALOKASI",
      entitas: "COST_REALLOCATION",
      entitasId: "r-1",
      sesudah: { jumlahIdr: 2_500_000n },
      alasan: "Biaya dooring milik job tujuan",
    });
    expect(values).toHaveBeenCalledWith(
      expect.objectContaining({
        aksi: "REALOKASI",
        entitas: "COST_REALLOCATION",
        alasan: "Biaya dooring milik job tujuan",
        // bigint uang tersimpan sebagai string desimal penuh, bukan float
        sesudah: JSON.stringify({ jumlahIdr: "2500000" }),
      }),
    );
  });
});

// ---------------------------------------------------------------------------
// Penjaga append-only: tidak boleh ada update/delete terhadap auditLog.
// REVOKE belum ada (OPEN-QUESTION RENCANA §5), jadi disiplin kode + test ini
// yang menjaga jejak audit tidak bisa diutak-atik.
// ---------------------------------------------------------------------------

function daftarFileTs(dir: string, hasil: string[] = []): string[] {
  for (const entri of readdirSync(dir)) {
    const path = join(dir, entri);
    if (statSync(path).isDirectory()) daftarFileTs(path, hasil);
    else if (/\.(ts|tsx)$/.test(entri)) hasil.push(path);
  }
  return hasil;
}

describe("append-only audit_log", () => {
  it("tidak ada update/delete terhadap auditLog di src/", () => {
    const pelanggaran: string[] = [];
    for (const file of daftarFileTs("src")) {
      const isi = readFileSync(file, "utf8");
      if (
        /(?:update|delete)\(\s*auditLog\s*\)/.test(isi) ||
        /\.from\(auditLog\)\s*[\s\S]{0,80}\.(?:update|delete)\(/.test(isi)
      ) {
        pelanggaran.push(file);
      }
    }
    expect(pelanggaran).toEqual([]);
  });
});
