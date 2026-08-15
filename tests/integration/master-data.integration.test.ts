import { and, eq, inArray, like } from "drizzle-orm";
/*
 * Test integrasi CRUD master data — BUTUH DATABASE_URL (.env.local).
 *
 * Terisolasi & bisa diulang: semua baris memakai prefix "ZZTEST " pada nama /
 * "ZZTEST-" pada kode, dan beforeAll/afterAll menghapus baris milik sendiri
 * (termasuk baris audit_log miliknya — pengecualian khusus test; kode aplikasi
 * tetap dilarang menyentuh audit_log).
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "../../src/db/index";
import {
  auditLog,
  chargeCodes,
  customers,
  ports,
  shipLines,
  users,
  vendors,
} from "../../src/db/schema/index";
import {
  buatCustomer,
  buatPort,
  buatShipLine,
  buatVendor,
  ubahChargeCode,
  ubahCustomer,
  ubahStatusAktif,
  ubahVendor,
} from "../../src/lib/master-data/index";

const PREFIX = "ZZTEST ";
const KODE_CC = "ZZTEST-CC1";

let userId = "";
const customerIds: string[] = [];
const vendorIds: string[] = [];
const portIds: string[] = [];
const shipLineIds: string[] = [];

async function hapusAuditMilikSendiri() {
  // Baris audit test dikenali dari JSON sesudah / alasan yang memuat prefix.
  await db.delete(auditLog).where(like(auditLog.sesudah, `%${PREFIX.trim()}%`));
  await db.delete(auditLog).where(like(auditLog.sesudah, `%${KODE_CC}%`));
}

describe("CRUD master data (integrasi DB)", { timeout: 30_000 }, () => {
  beforeAll(async () => {
    const [u] = await db.select({ id: users.id }).from(users).limit(1);
    if (!u) throw new Error("Tidak ada user di DB — jalankan seed dulu.");
    userId = u.id;

    // Bersihkan sisa run sebelumnya supaya run berulang konsisten.
    await hapusAuditMilikSendiri();
    await db.delete(chargeCodes).where(eq(chargeCodes.kode, KODE_CC));
    await db.delete(customers).where(like(customers.nama, `${PREFIX}%`));
    await db.delete(vendors).where(like(vendors.nama, `${PREFIX}%`));
    await db.delete(ports).where(like(ports.nama, `${PREFIX}%`));
    await db.delete(shipLines).where(like(shipLines.nama, `${PREFIX}%`));
  });

  afterAll(async () => {
    await hapusAuditMilikSendiri();
    await db.delete(chargeCodes).where(eq(chargeCodes.kode, KODE_CC));
    if (customerIds.length)
      await db.delete(customers).where(inArray(customers.id, customerIds));
    if (vendorIds.length) await db.delete(vendors).where(inArray(vendors.id, vendorIds));
    if (portIds.length) await db.delete(ports).where(inArray(ports.id, portIds));
    if (shipLineIds.length)
      await db.delete(shipLines).where(inArray(shipLines.id, shipLineIds));
    await db.$client.end();
  });

  const owner = () => ({ id: userId, role: "OWNER" as const });
  const manager = () => ({ id: userId, role: "MANAGER" as const });
  const staff = () => ({ id: userId, role: "STAFF" as const });

  it("MANAGER diizinkan buat & edit master data (RENCANA §9.2)", async () => {
    const buat = await buatCustomer(db, manager(), { nama: `${PREFIX}Manager Bisa` });
    expect(buat.ok).toBe(true);
    if (!buat.ok) return;
    customerIds.push(buat.data.id);

    const ubah = await ubahCustomer(db, manager(), buat.data.id, {
      nama: `${PREFIX}Manager Bisa Edit`,
    });
    expect(ubah.ok).toBe(true);
  });

  it("STAFF ditolak: tidak ada baris baru, tidak ada audit", async () => {
    const hasil = await buatCustomer(db, staff(), { nama: `${PREFIX}Ditolak` });
    expect(hasil.ok).toBe(false);
    const baris = await db
      .select()
      .from(customers)
      .where(eq(customers.nama, `${PREFIX}Ditolak`));
    expect(baris).toHaveLength(0);
    const audit = await db
      .select()
      .from(auditLog)
      .where(like(auditLog.sesudah, `%${PREFIX}Ditolak%`));
    expect(audit).toHaveLength(0);
  });

  it("OWNER buat customer → 1 baris audit CREATE dengan sesudah terisi", async () => {
    const hasil = await buatCustomer(db, owner(), {
      nama: `${PREFIX}Samudera Jaya`,
    });
    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;
    customerIds.push(hasil.data.id);

    const audit = await db
      .select()
      .from(auditLog)
      .where(
        and(eq(auditLog.entitas, "CUSTOMER"), eq(auditLog.entitasId, hasil.data.id)),
      );
    expect(audit).toHaveLength(1);
    expect(audit[0]?.aksi).toBe("CREATE");
    expect(audit[0]?.sebelum).toBeNull();
    expect(audit[0]?.sesudah).toContain(`${PREFIX}Samudera Jaya`);
  });

  it("nama mirip terdeteksi saat buat customer kedua", async () => {
    const hasil = await buatCustomer(db, owner(), {
      nama: `${PREFIX}Samudera Jaia`,
    });
    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;
    customerIds.push(hasil.data.id);
    expect(hasil.miripDengan?.length ?? 0).toBeGreaterThan(0);
  });

  it("EDIT customer → audit EDIT dengan sebelum & sesudah berbeda", async () => {
    // Buat customer khusus test ini supaya jumlah audit EDIT pasti 1.
    const buat = await buatCustomer(db, owner(), {
      nama: `${PREFIX}Samudera Jaya`,
    });
    expect(buat.ok).toBe(true);
    if (!buat.ok) return;
    customerIds.push(buat.data.id);

    const hasil = await ubahCustomer(db, owner(), buat.data.id, {
      nama: `${PREFIX}Samudera Jaya Raya`,
    });
    expect(hasil.ok).toBe(true);

    const audit = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entitas, "CUSTOMER"),
          eq(auditLog.entitasId, buat.data.id),
          eq(auditLog.aksi, "EDIT"),
        ),
      );
    expect(audit).toHaveLength(1);
    expect(audit[0]?.sebelum).toContain(`${PREFIX}Samudera Jaya"`);
    expect(audit[0]?.sesudah).toContain(`${PREFIX}Samudera Jaya Raya`);
  });

  it("NONAKTIFKAN tanpa alasan ditolak; dengan alasan → aktif=false + audit", async () => {
    const id = customerIds[0];
    if (!id) throw new Error("customer pertama belum terbuat");

    const tanpaAlasan = await ubahStatusAktif(db, owner(), "CUSTOMER", id, false);
    expect(tanpaAlasan.ok).toBe(false);

    const hasil = await ubahStatusAktif(db, owner(), "CUSTOMER", id, false, {
      alasan: "uji coba",
    });
    expect(hasil.ok).toBe(true);

    const [baris] = await db.select().from(customers).where(eq(customers.id, id));
    expect(baris?.aktif).toBe(false);

    const audit = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entitas, "CUSTOMER"),
          eq(auditLog.entitasId, id),
          eq(auditLog.aksi, "NONAKTIFKAN"),
        ),
      );
    expect(audit).toHaveLength(1);
    expect(audit[0]?.alasan).toBe("uji coba");

    // reaktivasi
    const aktifkan = await ubahStatusAktif(db, owner(), "CUSTOMER", id, true);
    expect(aktifkan.ok).toBe(true);
    const [lagi] = await db.select().from(customers).where(eq(customers.id, id));
    expect(lagi?.aktif).toBe(true);
  });

  it("vendor: jenis tidak dikenal ditolak; valid tersimpan + audit", async () => {
    const buruk = await buatVendor(db, owner(), {
      nama: `${PREFIX}Vendor`,
      vendorType: "KAPAL",
    });
    expect(buruk.ok).toBe(false);

    const hasil = await buatVendor(db, owner(), {
      nama: `${PREFIX}Trucking Cepat`,
      vendorType: "TRUCKING",
      paymentTerm: "TEMPO",
      paymentTermDays: 30,
    });
    expect(hasil.ok).toBe(true);
    if (!hasil.ok) return;
    vendorIds.push(hasil.data.id);

    const audit = await db
      .select()
      .from(auditLog)
      .where(and(eq(auditLog.entitas, "VENDOR"), eq(auditLog.entitasId, hasil.data.id)));
    expect(audit).toHaveLength(1);
    expect(audit[0]?.aksi).toBe("CREATE");

    const ubah = await ubahVendor(db, owner(), hasil.data.id, {
      nama: `${PREFIX}Trucking Cepat Sekali`,
      vendorType: "TRUCKING",
      paymentTerm: "TEMPO",
      paymentTermDays: 45,
    });
    expect(ubah.ok).toBe(true);
    const auditEdit = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entitas, "VENDOR"),
          eq(auditLog.entitasId, hasil.data.id),
          eq(auditLog.aksi, "EDIT"),
        ),
      );
    expect(auditEdit).toHaveLength(1);
  });

  it("port & ship line: buat + edit + audit", async () => {
    const p = await buatPort(db, owner(), {
      kode: "zztst",
      nama: `${PREFIX}Tanjung Priok`,
    });
    expect(p.ok).toBe(true);
    if (p.ok) portIds.push(p.data.id);

    const s = await buatShipLine(db, owner(), { nama: `${PREFIX}Pelayaran Test` });
    expect(s.ok).toBe(true);
    if (s.ok) shipLineIds.push(s.data.id);

    const auditPort = await db
      .select()
      .from(auditLog)
      .where(
        and(eq(auditLog.entitas, "PORT"), eq(auditLog.entitasId, p.ok ? p.data.id : "")),
      );
    expect(auditPort).toHaveLength(1);
    // kode dinormalisasi jadi uppercase
    expect(auditPort[0]?.sesudah).toContain("ZZTST");

    const auditShip = await db
      .select()
      .from(auditLog)
      .where(
        and(
          eq(auditLog.entitas, "SHIP_LINE"),
          eq(auditLog.entitasId, s.ok ? s.data.id : ""),
        ),
      );
    expect(auditShip).toHaveLength(1);
  });

  it("charge code: kode immutable + segment scope tervalidasi + audit (entitasId null)", async () => {
    // setup: masukkan kode uji langsung lewat db (create charge code jalur seed)
    await db.insert(chargeCodes).values({
      kode: KODE_CC,
      keterangan: "Kode uji",
      kategori: "OPSIONAL",
      segmentScope: "BOTH",
    });

    const gantiKode = await ubahChargeCode(db, owner(), KODE_CC, {
      kode: "ZZTEST-LAIN",
      keterangan: "Kode uji",
    });
    expect(gantiKode.ok).toBe(false);

    const scopeBuruk = await ubahChargeCode(db, owner(), KODE_CC, {
      keterangan: "Kode uji",
      segmentScope: "SEMUA" as never,
    });
    expect(scopeBuruk.ok).toBe(false);

    const hasil = await ubahChargeCode(db, owner(), KODE_CC, {
      keterangan: "Kode uji diubah",
      segmentScope: "DOM",
    });
    expect(hasil.ok).toBe(true);

    const audit = await db
      .select()
      .from(auditLog)
      .where(
        and(eq(auditLog.entitas, "CHARGE_CODE"), like(auditLog.sesudah, `%${KODE_CC}%`)),
      );
    expect(audit).toHaveLength(1);
    expect(audit[0]?.entitasId).toBeNull(); // PK TEXT → kolom uuid null
    expect(audit[0]?.sesudah).toContain("DOM");

    // NONAKTIFKAN charge code via kode (entitasId audit null)
    const nonaktif = await ubahStatusAktif(db, owner(), "CHARGE_CODE", KODE_CC, false, {
      alasan: "tidak dipakai",
    });
    expect(nonaktif.ok).toBe(true);
    const [cc] = await db.select().from(chargeCodes).where(eq(chargeCodes.kode, KODE_CC));
    expect(cc?.aktif).toBe(false);
  });
});
