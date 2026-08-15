import {
  chargeCodes,
  customers,
  ports,
  shipLines,
  vendors,
} from "@/db/schema/index";
import type { db } from "@/db/index";
import { AuthorizationError, assertCan } from "@/lib/authz/index";
import { writeAudit } from "@/lib/audit/index";
import { cariKandidatMirip } from "@/lib/similarity/index";
import { eq } from "drizzle-orm";

/*
 * Logika CRUD master data — Irisan 3 (RENCANA-IRISAN-3-CRUD §4 & §6).
 *
 * Pola (RENCANA §4):
 * 1. requireSession (dilakukan caller server action)
 * 2. assertCan(role, "master:manage") — SATU pintu (ADR-0004)
 * 3. validasi input
 * 4. db.transaction: snapshot → mutasi → writeAudit (TEPAT 1 baris per mutasi)
 *
 * Modul ini MURNI logika + DB, tanpa Supabase/Next — sama seperti
 * src/lib/job-number — supaya test integrasi bisa memanggilnya langsung
 * dengan userId buatan tanpa mock.
 *
 * Aturan per entitas (RENCANA §6):
 * - soft delete: UPDATE aktif=false + audit NONAKTIFKAN (alasan WAJIB);
 *   reaktivasi AKTIFKAN. Tidak ada DELETE keras (.clinerules/05).
 * - charge_codes.kode IMMUTABLE: server menolak perubahan kode, jangan
 *   percaya UI saja.
 * - segment_scope hanya DOM|EXIM|BOTH (CHECK DB); nilai lain → error yang
 *   pesannya diteruskan apa adanya.
 */

/** Tipe tx yang diterima callback db.transaction. */
type Tx = Parameters<typeof db.transaction>[0] extends (tx: infer T) => unknown
  ? T
  : never;

/** `db` maupun `tx` hasil db.transaction sama-sama punya `.select/.insert/...`. */
export type DbOrTx = typeof db | Tx;

/** Minimal dari session yang dibutuhkan operasi master data. */
export interface PelaksanaMaster {
  id: string;
  role: "OWNER" | "MANAGER" | "STAFF";
}

export type HasilMaster<T> =
  | { ok: true; data: T; miripDengan?: { id: string; nama: string; skor: number }[] }
  | { ok: false; error: string };

export const VENDOR_TYPES = ["PELAYARAN", "TRUCKING", "DOORING", "EMKL", "LAINNYA"] as const;
export const PAYMENT_TERMS = ["CASH", "TEMPO"] as const;
export const CHARGE_CATEGORIES = ["FREIGHT", "TERMINAL", "DARAT", "DOKUMEN", "INTERNAL"] as const;
export const CHARGE_KATEGORIS = ["FIXED", "OPSIONAL"] as const;
export const SEGMENT_SCOPES = ["DOM", "EXIM", "BOTH"] as const;

// ── util kecil ────────────────────────────────────────────────────────────────

function teks(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s.length > 0 ? s : null;
}

function gagal(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

/**
 * Terjemahkan AuthorizationError jadi hasil gagal yang ramah UI; selain itu
 * dilempar ulang (bug/DB error jangan ditelan diam-diam).
 */
function salahWewenang(e: unknown): { ok: false; error: string } {
  if (e instanceof AuthorizationError) return gagal(e.message);
  throw e;
}

/** Cek wewenang sekali di depan; hasil gagal langsung dikembalikan. */
function cekWewenang(role: PelaksanaMaster["role"]): { ok: false; error: string } | null {
  try {
    assertCan(role, "master:manage");
    return null;
  } catch (e) {
    return salahWewenang(e);
  }
}

// ── CUSTOMER ──────────────────────────────────────────────────────────────────

export interface CustomerInput {
  nama: string;
  legalName?: string | null;
  npwp?: string | null;
  alamat?: string | null;
  topHari?: number | null;
  pph23Default?: boolean | null;
}

export async function buatCustomer(
  dbOrTx: DbOrTx,
  user: PelaksanaMaster,
  input: CustomerInput,
): Promise<HasilMaster<{ id: string }>> {
  const tolak = cekWewenang(user.role);
  if (tolak) return tolak;
  const nama = teks(input.nama);
  if (!nama) return gagal("Nama customer wajib diisi.");

  return dbOrTx.transaction(async (tx) => {
    const aktif = await tx
      .select({ id: customers.id, nama: customers.nama })
      .from(customers)
      .where(eq(customers.aktif, true));
    const miripDengan = cariKandidatMirip(nama, aktif);

    // top_hari & pph23_default di DB adalah NOT NULL + DEFAULT (warisan
    // Irisan-1: 30 / false) — pakai default DB bila tidak diisi.
    const [baris] = await tx
      .insert(customers)
      .values({
        nama,
        legalName: teks(input.legalName),
        npwp: teks(input.npwp),
        alamat: teks(input.alamat),
        topHari: input.topHari ?? 30,
        pph23Default: input.pph23Default ?? false,
      })
      .returning();
    await writeAudit(tx, {
      userId: user.id,
      aksi: "CREATE",
      entitas: "CUSTOMER",
      entitasId: baris?.id ?? null,
      sesudah: baris,
    });
    return { ok: true, data: { id: baris?.id ?? "" }, miripDengan };
  });
}

export async function ubahCustomer(
  dbOrTx: DbOrTx,
  user: PelaksanaMaster,
  id: string,
  input: CustomerInput,
): Promise<HasilMaster<{ id: string }>> {
  const tolak = cekWewenang(user.role);
  if (tolak) return tolak;
  const nama = teks(input.nama);
  if (!nama) return gagal("Nama customer wajib diisi.");

  return dbOrTx.transaction(async (tx) => {
    const [sebelum] = await tx.select().from(customers).where(eq(customers.id, id));
    if (!sebelum) return gagal("Customer tidak ditemukan.");

    const aktif = await tx
      .select({ id: customers.id, nama: customers.nama })
      .from(customers)
      .where(eq(customers.aktif, true));
    const miripDengan = cariKandidatMirip(nama, aktif, { idKecuali: id });

    const [sesudah] = await tx
      .update(customers)
      .set({
        nama,
        legalName: teks(input.legalName),
        npwp: teks(input.npwp),
        alamat: teks(input.alamat),
        topHari: input.topHari ?? 30,
        pph23Default: input.pph23Default ?? false,
      })
      .where(eq(customers.id, id))
      .returning();
    await writeAudit(tx, {
      userId: user.id,
      aksi: "EDIT",
      entitas: "CUSTOMER",
      entitasId: id,
      sebelum,
      sesudah,
    });
    return { ok: true, data: { id }, miripDengan };
  });
}

// ── VENDOR ────────────────────────────────────────────────────────────────────

export interface VendorInput {
  nama: string;
  legalName?: string | null;
  npwp?: string | null;
  vendorType?: string | null;
  paymentTerm?: string | null;
  paymentTermDays?: number | null;
  pph23Default?: boolean | null;
}

export async function buatVendor(
  dbOrTx: DbOrTx,
  user: PelaksanaMaster,
  input: VendorInput,
): Promise<HasilMaster<{ id: string }>> {
  const tolak = cekWewenang(user.role);
  if (tolak) return tolak;
  const nama = teks(input.nama);
  if (!nama) return gagal("Nama vendor wajib diisi.");
  if (input.vendorType && !VENDOR_TYPES.includes(input.vendorType as never)) {
    return gagal(`Jenis vendor tidak dikenal. Pilih salah satu: ${VENDOR_TYPES.join(", ")}.`);
  }
  if (input.paymentTerm && !PAYMENT_TERMS.includes(input.paymentTerm as never)) {
    return gagal("Termin pembayaran harus CASH atau TEMPO.");
  }

  return dbOrTx.transaction(async (tx) => {
    const aktif = await tx
      .select({ id: vendors.id, nama: vendors.nama })
      .from(vendors)
      .where(eq(vendors.aktif, true));
    const miripDengan = cariKandidatMirip(nama, aktif);

    const [baris] = await tx
      .insert(vendors)
      .values({
        nama,
        legalName: teks(input.legalName),
        npwp: teks(input.npwp),
        vendorType: teks(input.vendorType),
        paymentTerm: teks(input.paymentTerm),
        paymentTermDays: input.paymentTermDays ?? null,
        pph23Default: input.pph23Default ?? false,
      })
      .returning();
    await writeAudit(tx, {
      userId: user.id,
      aksi: "CREATE",
      entitas: "VENDOR",
      entitasId: baris?.id ?? null,
      sesudah: baris,
    });
    return { ok: true, data: { id: baris?.id ?? "" }, miripDengan };
  });
}

export async function ubahVendor(
  dbOrTx: DbOrTx,
  user: PelaksanaMaster,
  id: string,
  input: VendorInput,
): Promise<HasilMaster<{ id: string }>> {
  const tolak = cekWewenang(user.role);
  if (tolak) return tolak;
  const nama = teks(input.nama);
  if (!nama) return gagal("Nama vendor wajib diisi.");
  if (input.vendorType && !VENDOR_TYPES.includes(input.vendorType as never)) {
    return gagal(`Jenis vendor tidak dikenal. Pilih salah satu: ${VENDOR_TYPES.join(", ")}.`);
  }
  if (input.paymentTerm && !PAYMENT_TERMS.includes(input.paymentTerm as never)) {
    return gagal("Termin pembayaran harus CASH atau TEMPO.");
  }

  return dbOrTx.transaction(async (tx) => {
    const [sebelum] = await tx.select().from(vendors).where(eq(vendors.id, id));
    if (!sebelum) return gagal("Vendor tidak ditemukan.");

    const aktif = await tx
      .select({ id: vendors.id, nama: vendors.nama })
      .from(vendors)
      .where(eq(vendors.aktif, true));
    const miripDengan = cariKandidatMirip(nama, aktif, { idKecuali: id });

    const [sesudah] = await tx
      .update(vendors)
      .set({
        nama,
        legalName: teks(input.legalName),
        npwp: teks(input.npwp),
        vendorType: teks(input.vendorType),
        paymentTerm: teks(input.paymentTerm),
        paymentTermDays: input.paymentTermDays ?? null,
        pph23Default: input.pph23Default ?? false,
      })
      .where(eq(vendors.id, id))
      .returning();
    await writeAudit(tx, {
      userId: user.id,
      aksi: "EDIT",
      entitas: "VENDOR",
      entitasId: id,
      sebelum,
      sesudah,
    });
    return { ok: true, data: { id }, miripDengan };
  });
}

// ── PORT & SHIP LINE (tanpa nonaktifkan — RENCANA §6) ─────────────────────────

export interface PortInput {
  kode?: string | null;
  nama: string;
  negara?: string | null;
}

export async function buatPort(
  dbOrTx: DbOrTx,
  user: PelaksanaMaster,
  input: PortInput,
): Promise<HasilMaster<{ id: string }>> {
  const tolak = cekWewenang(user.role);
  if (tolak) return tolak;
  const nama = teks(input.nama);
  if (!nama) return gagal("Nama pelabuhan wajib diisi.");

  return dbOrTx.transaction(async (tx) => {
    const [baris] = await tx
      .insert(ports)
      .values({
        kode: teks(input.kode)?.toUpperCase() ?? null,
        nama,
        negara: teks(input.negara) ?? "ID",
      })
      .returning();
    await writeAudit(tx, {
      userId: user.id,
      aksi: "CREATE",
      entitas: "PORT",
      entitasId: baris?.id ?? null,
      sesudah: baris,
    });
    return { ok: true, data: { id: baris?.id ?? "" } };
  });
}

export async function ubahPort(
  dbOrTx: DbOrTx,
  user: PelaksanaMaster,
  id: string,
  input: PortInput,
): Promise<HasilMaster<{ id: string }>> {
  const tolak = cekWewenang(user.role);
  if (tolak) return tolak;
  const nama = teks(input.nama);
  if (!nama) return gagal("Nama pelabuhan wajib diisi.");

  return dbOrTx.transaction(async (tx) => {
    const [sebelum] = await tx.select().from(ports).where(eq(ports.id, id));
    if (!sebelum) return gagal("Pelabuhan tidak ditemukan.");
    const [sesudah] = await tx
      .update(ports)
      .set({
        kode: teks(input.kode)?.toUpperCase() ?? null,
        nama,
        negara: teks(input.negara) ?? "ID",
      })
      .where(eq(ports.id, id))
      .returning();
    await writeAudit(tx, {
      userId: user.id,
      aksi: "EDIT",
      entitas: "PORT",
      entitasId: id,
      sebelum,
      sesudah,
    });
    return { ok: true, data: { id } };
  });
}

export interface ShipLineInput {
  kode?: string | null;
  nama: string;
}

export async function buatShipLine(
  dbOrTx: DbOrTx,
  user: PelaksanaMaster,
  input: ShipLineInput,
): Promise<HasilMaster<{ id: string }>> {
  const tolak = cekWewenang(user.role);
  if (tolak) return tolak;
  const nama = teks(input.nama);
  if (!nama) return gagal("Nama perusahaan pelayaran wajib diisi.");

  return dbOrTx.transaction(async (tx) => {
    const [baris] = await tx
      .insert(shipLines)
      .values({ kode: teks(input.kode)?.toUpperCase() ?? null, nama })
      .returning();
    await writeAudit(tx, {
      userId: user.id,
      aksi: "CREATE",
      entitas: "SHIP_LINE",
      entitasId: baris?.id ?? null,
      sesudah: baris,
    });
    return { ok: true, data: { id: baris?.id ?? "" } };
  });
}

export async function ubahShipLine(
  dbOrTx: DbOrTx,
  user: PelaksanaMaster,
  id: string,
  input: ShipLineInput,
): Promise<HasilMaster<{ id: string }>> {
  const tolak = cekWewenang(user.role);
  if (tolak) return tolak;
  const nama = teks(input.nama);
  if (!nama) return gagal("Nama perusahaan pelayaran wajib diisi.");

  return dbOrTx.transaction(async (tx) => {
    const [sebelum] = await tx.select().from(shipLines).where(eq(shipLines.id, id));
    if (!sebelum) return gagal("Perusahaan pelayaran tidak ditemukan.");
    const [sesudah] = await tx
      .update(shipLines)
      .set({ kode: teks(input.kode)?.toUpperCase() ?? null, nama })
      .where(eq(shipLines.id, id))
      .returning();
    await writeAudit(tx, {
      userId: user.id,
      aksi: "EDIT",
      entitas: "SHIP_LINE",
      entitasId: id,
      sebelum,
      sesudah,
    });
    return { ok: true, data: { id } };
  });
}

// ── CHARGE CODE (kode immutable) ──────────────────────────────────────────────

export interface ChargeCodeInput {
  keterangan: string;
  nameId?: string | null;
  category?: string | null;
  defaultLeg?: number | null;
  kategori?: "FIXED" | "OPSIONAL";
  segmentScope?: "DOM" | "EXIM" | "BOTH";
  defaultReimburse?: boolean;
  isAtCostDefault?: boolean;
  isTaxable?: boolean;
  pph23Applicable?: boolean;
  butuhVendor?: boolean;
}

/**
 * EDIT charge code. `kode` IMMUTABLE: bila input.kode berbeda dari baris
 * yang dituju, DITOLAK di server — jangan percaya UI saja (RENCANA §6).
 */
export async function ubahChargeCode(
  dbOrTx: DbOrTx,
  user: PelaksanaMaster,
  kode: string,
  input: ChargeCodeInput & { kode?: string },
): Promise<HasilMaster<{ kode: string }>> {
  const tolak = cekWewenang(user.role);
  if (tolak) return tolak;
  const keterangan = teks(input.keterangan);
  if (!keterangan) return gagal("Keterangan kode biaya wajib diisi.");
  const kodeDiminta = teks(input.kode);
  if (kodeDiminta && kodeDiminta !== kode) {
    return gagal("Kode biaya tidak boleh diubah (immutable).");
  }
  if (input.category && !CHARGE_CATEGORIES.includes(input.category as never)) {
    return gagal(`Kategori tidak dikenal. Pilih salah satu: ${CHARGE_CATEGORIES.join(", ")}.`);
  }
  if (input.segmentScope && !SEGMENT_SCOPES.includes(input.segmentScope)) {
    return gagal("Segment scope harus DOM, EXIM, atau BOTH.");
  }
  if (input.defaultLeg != null && ![1, 2, 3].includes(input.defaultLeg)) {
    return gagal("Leg default harus 1, 2, 3, atau kosong.");
  }

  return dbOrTx.transaction(async (tx) => {
    const [sebelum] = await tx.select().from(chargeCodes).where(eq(chargeCodes.kode, kode));
    if (!sebelum) return gagal("Kode biaya tidak ditemukan.");
    const [sesudah] = await tx
      .update(chargeCodes)
      .set({
        keterangan,
        nameId: teks(input.nameId),
        category: teks(input.category),
        defaultLeg: input.defaultLeg ?? null,
        kategori: input.kategori ?? "OPSIONAL",
        segmentScope: input.segmentScope ?? "BOTH",
        defaultReimburse: input.defaultReimburse ?? false,
        isAtCostDefault: input.isAtCostDefault ?? false,
        isTaxable: input.isTaxable ?? true,
        pph23Applicable: input.pph23Applicable ?? false,
        butuhVendor: input.butuhVendor ?? true,
      })
      .where(eq(chargeCodes.kode, kode))
      .returning();
    await writeAudit(tx, {
      userId: user.id,
      aksi: "EDIT",
      entitas: "CHARGE_CODE",
      entitasId: null, // PK-nya TEXT, kolom entitas_id uuid — kode terekam di JSON
      sebelum,
      sesudah,
      alasan: `EDIT kode ${kode}`,
    });
    return { ok: true, data: { kode } };
  });
}

// ── NONAKTIFKAN / AKTIFKAN (soft delete, RENCANA §6) ──────────────────────────

type EntitasAktif = "CUSTOMER" | "VENDOR" | "CHARGE_CODE";

export interface UbahStatusInput {
  alasan?: string | null;
}

/**
 * NONAKTIFKAN: alasan WAJIB (RENCANA §6). Reaktivasi: alasan opsional.
 * Tidak ada DELETE — baris tetap ada supaya FK lama (charge_lines dll)
 * tetap valid.
 */
export async function ubahStatusAktif(
  dbOrTx: DbOrTx,
  user: PelaksanaMaster,
  entitas: EntitasAktif,
  id: string,
  aktifBaru: boolean,
  input: UbahStatusInput = {},
): Promise<HasilMaster<{ id: string }>> {
  const tolak = cekWewenang(user.role);
  if (tolak) return tolak;
  const alasan = teks(input.alasan);
  if (!aktifBaru && !alasan) {
    return gagal("Alasan nonaktifkan wajib diisi.");
  }

  return dbOrTx.transaction(async (tx) => {
    let sebelum: unknown;
    let sesudah: unknown;

    if (entitas === "CUSTOMER") {
      const rows = await tx.select().from(customers).where(eq(customers.id, id));
      sebelum = rows[0];
      if (!sebelum) return gagal("Customer tidak ditemukan.");
      const rows2 = await tx
        .update(customers)
        .set({ aktif: aktifBaru })
        .where(eq(customers.id, id))
        .returning();
      sesudah = rows2[0];
    } else if (entitas === "VENDOR") {
      const rows = await tx.select().from(vendors).where(eq(vendors.id, id));
      sebelum = rows[0];
      if (!sebelum) return gagal("Vendor tidak ditemukan.");
      const rows2 = await tx
        .update(vendors)
        .set({ aktif: aktifBaru })
        .where(eq(vendors.id, id))
        .returning();
      sesudah = rows2[0];
    } else {
      // CHARGE_CODE: PK TEXT, entitas_id audit tetap null
      const rows = await tx.select().from(chargeCodes).where(eq(chargeCodes.kode, id));
      sebelum = rows[0];
      if (!sebelum) return gagal("Kode biaya tidak ditemukan.");
      const rows2 = await tx
        .update(chargeCodes)
        .set({ aktif: aktifBaru })
        .where(eq(chargeCodes.kode, id))
        .returning();
      sesudah = rows2[0];
    }

    await writeAudit(tx, {
      userId: user.id,
      aksi: aktifBaru ? "AKTIFKAN" : "NONAKTIFKAN",
      entitas,
      entitasId: entitas === "CHARGE_CODE" ? null : id,
      sebelum,
      sesudah,
      alasan: alasan ?? null,
    });
    return { ok: true, data: { id } };
  });
}

// ── pembacaan untuk halaman server component ──────────────────────────────────

export async function daftarCustomer(dbOrTx: DbOrTx) {
  return dbOrTx.select().from(customers).orderBy(customers.nama);
}

export async function daftarVendor(dbOrTx: DbOrTx) {
  return dbOrTx.select().from(vendors).orderBy(vendors.nama);
}

export async function daftarPort(dbOrTx: DbOrTx) {
  return dbOrTx.select().from(ports).orderBy(ports.nama);
}

export async function daftarShipLine(dbOrTx: DbOrTx) {
  return dbOrTx.select().from(shipLines).orderBy(shipLines.nama);
}

export async function daftarChargeCode(dbOrTx: DbOrTx) {
  return dbOrTx.select().from(chargeCodes).orderBy(chargeCodes.kode);
}
