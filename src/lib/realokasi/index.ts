import type { db } from "@/db/index";
import { chargeLines, costReallocations, jobs } from "@/db/schema/index";
import { writeAudit } from "@/lib/audit/index";
import { AuthorizationError, assertCan, assertNotSelfApproval } from "@/lib/authz/index";
import { and, eq, sql } from "drizzle-orm";

/*
 * Realokasi biaya antar job — Irisan 4e (Q06, ADR-0006 Opsi B).
 *
 * Mekanisme: overlay logis. Proposal disimpan di tabel `cost_reallocations`;
 * baris fisik `charge_lines` TIDAK PERNAH diubah. `jumlah_idr` adalah IDR
 * beku baris asal — tidak dikonversi ulang dari USD (kurs beku, Irisan 4c).
 *
 * Alur satu tingkat:
 *   - AJUKAN  : pemegang `job:edit` (termasuk STAFF) — INSERT proposal
 *               (approved_by NULL = pending).
 *   - SETUJUI : pemegang `job:reallocate` (MANAGER/OWNER), approver ≠ pembuat
 *               (R-A1, assertNotSelfApproval), dan CAP dicek ULANG saat ini.
 *   - TOLAK   : pemegang `job:reallocate` — HARD DELETE proposal yang masih
 *               pending + audit HAPUS dengan alasan wajib. Proposal yang sudah
 *               disetujui TIDAK BOLEH dihapus.
 *
 * Cap (keputusan user poin 4): jumlah diajukan + SUM(realokasi APPROVED lain
 * di baris asal yang sama) ≤ pencadangan_idr baris asal. Proposal PENDING
 * lain TIDAK dihitung saat pengajuan. Cap dicek ulang saat approve — menutup
 * race dua approval tanpa locking rumit.
 *
 * FINAL-lock (keputusan poin 5, per J-INV-1): tolak jika job ASAL ATAU TUJUAN
 * berstatus FINAL. Tidak ada kolom/migrasi baru.
 *
 * Pola kode mengikuti src/lib/charge-line/index.ts: transaksi + TEPAT 1 baris
 * audit per aksi + HasilRealokasi {ok}. Semua uang bigint rupiah bulat
 * (ADR-0002).
 */

/** Tipe tx callback db.transaction. */
type Tx = Parameters<typeof db.transaction>[0] extends (tx: infer T) => unknown
  ? T
  : never;
export type DbOrTx = typeof db | Tx;

export interface PelaksanaRealokasi {
  id: string;
  role: "OWNER" | "MANAGER" | "STAFF";
}

export type HasilRealokasi<T> = { ok: true; data: T } | { ok: false; error: string };

export interface InputAjukanRealokasi {
  /** Baris biaya asal (charge_lines.id) — harus aktif (belum soft-delete). */
  originChargeLineId: string;
  /** Job asal; WAJIB cocok dengan job baris asal (asal ≠ tujuan dicek terpisah). */
  originJobId: string;
  /** Job tujuan menerima beban biaya. */
  destinationJobId: string;
  /** IDR beku yang dipindahkan. Bulat, > 0 (pecahan/nol/negatif ditolak). */
  jumlahIdr: number | bigint;
  /** Alasan tertulis — WAJIB (Q06). */
  alasan: string;
}

export interface BarisRealokasi {
  id: string;
  originChargeLineId: string;
  originJobId: string;
  destinationJobId: string;
  jumlahIdr: bigint;
  alasan: string;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: Date | null;
  createdAt: Date;
}

function teks(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s.length > 0 ? s : null;
}

function gagal(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function salahWewenang(e: unknown): { ok: false; error: string } {
  if (e instanceof AuthorizationError) return gagal(e.message);
  throw e;
}

function cekWewenang(
  role: PelaksanaRealokasi["role"],
  action: "job:edit" | "job:reallocate",
): { ok: false; error: string } | null {
  try {
    assertCan(role, action);
    return null;
  } catch (e) {
    return salahWewenang(e);
  }
}

/** Snapshot proposal untuk JSON audit (bigint → string ditangani writeAudit). */
function snapshotBaris(b: {
  id: string;
  originChargeLineId: string;
  originJobId: string;
  destinationJobId: string;
  jumlahIdr: bigint;
  alasan: string;
  createdBy: string;
  approvedBy: string | null;
  approvedAt: Date | null;
}): Record<string, unknown> {
  return {
    id: b.id,
    originChargeLineId: b.originChargeLineId,
    originJobId: b.originJobId,
    destinationJobId: b.destinationJobId,
    jumlahIdr: b.jumlahIdr,
    alasan: b.alasan,
    createdBy: b.createdBy,
    approvedBy: b.approvedBy,
    approvedAt: b.approvedAt?.toISOString() ?? null,
  };
}

// ---------------------------------------------------------------------------
// Validasi murni (diekspor untuk test unit — tidak menyentuh DB).
// ---------------------------------------------------------------------------

/**
 * Jumlah realokasi: bulat, > 0. null/undefined/NaN/pecahan/negatif ditolak.
 * (BigInt 0n dan negatif juga ditolak.)
 */
export function cekJumlahPositifBulat(
  v: number | bigint | null | undefined,
): { ok: true; value: bigint } | { ok: false; error: string } {
  if (v === null || v === undefined) return gagal("Jumlah realokasi wajib diisi.");
  if (typeof v === "bigint") {
    if (v <= 0n) return gagal("Jumlah realokasi harus lebih dari nol.");
    return { ok: true, value: v };
  }
  if (typeof v !== "number" || !Number.isFinite(v)) {
    return gagal("Jumlah realokasi harus bilangan bulat rupiah (tanpa pecahan).");
  }
  if (!Number.isInteger(v)) {
    return gagal("Jumlah realokasi harus bilangan bulat rupiah (tanpa pecahan).");
  }
  if (!Number.isSafeInteger(v)) {
    return gagal("Jumlah realokasi di luar rentang aman; pakai nilai lebih kecil.");
  }
  if (v <= 0) return gagal("Jumlah realokasi harus lebih dari nol.");
  return { ok: true, value: BigInt(v) };
}

/**
 * Cap jumlah (keputusan poin 4): diajukan + totalDisetujuiLain ≤ cap.
 * `totalDisetujuiLain` = SUM realokasi APPROVED lain di baris asal yang sama
 * (0n saat belum ada). Pending lain sengaja tidak dihitung di sini.
 */
export function cekCap(
  diajukan: bigint,
  totalDisetujuiLain: bigint,
  cap: bigint,
): { ok: true } | { ok: false; error: string } {
  if (diajukan + totalDisetujuiLain <= cap) return { ok: true };
  return gagal(
    `Jumlah realokasi melebihi sisa pencadangan baris asal. Sudah disetujui ${totalDisetujuiLain}, diajukan ${diajukan}, padahal pencadangan baris asal hanya ${cap}.`,
  );
}

/**
 * FINAL-lock (keputusan poin 5, per J-INV-1): job asal ATAU tujuan berstatus
 * FINAL → tolak. Status lain tidak dikunci di Irisan 4e.
 */
export function cekFinal(
  statusAsal: string,
  statusTujuan: string,
): { ok: true } | { ok: false; error: string } {
  if (statusAsal === "FINAL") {
    return gagal(
      "Job asal sudah FINAL — realokasi dari job FINAL tidak diizinkan (J-INV-1).",
    );
  }
  if (statusTujuan === "FINAL") {
    return gagal(
      "Job tujuan sudah FINAL — realokasi ke job FINAL tidak diizinkan (J-INV-1).",
    );
  }
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Query internal (dipakai ajukan & approve).
// ---------------------------------------------------------------------------

/**
 * SUM(jumlah_idr) realokasi APPROVED di satu baris asal. `kecualiId` dipakai
 * saat approve supaya proposal yang sedang disetujui tidak ikut terhitung.
 *
 * SUM(bigint) di PostgreSQL bertipe NUMERIC dan bisa tiba sebagai string —
 * dinormalkan ke bigint supaya aritmetika cap tidak pernah salah tipe.
 */
async function totalDisetujui(
  tx: Tx,
  originChargeLineId: string,
  kecualiId?: string,
): Promise<bigint> {
  const [row] = await tx
    .select({
      total: sql<bigint | string>`COALESCE(SUM(${costReallocations.jumlahIdr}), 0)`,
    })
    .from(costReallocations)
    .where(
      and(
        eq(costReallocations.originChargeLineId, originChargeLineId),
        sql`${costReallocations.approvedBy} IS NOT NULL`,
        kecualiId ? sql`${costReallocations.id} != ${kecualiId}` : sql`TRUE`,
      ),
    );
  const total = row?.total;
  if (total === null || total === undefined) return 0n;
  if (typeof total === "bigint") return total;
  return BigInt(String(total));
}

/** Ambil baris + status kedua job + validasi keberadaan/soft-delete/FINAL. */
async function ambilKonteks(
  tx: Tx,
  originChargeLineId: string,
  originJobId: string,
  destinationJobId: string,
): Promise<
  | {
      ok: true;
      baris: { id: string; jobId: string; pencadanganIdr: bigint };
      statusAsal: string;
      statusTujuan: string;
    }
  | { ok: false; error: string }
> {
  const [baris] = await tx
    .select({
      id: chargeLines.id,
      jobId: chargeLines.jobId,
      pencadanganIdr: chargeLines.pencadanganIdr,
      deletedAt: chargeLines.deletedAt,
    })
    .from(chargeLines)
    .where(eq(chargeLines.id, originChargeLineId));
  if (!baris) return gagal("Baris biaya asal tidak ditemukan.");
  if (baris.deletedAt)
    return gagal("Baris biaya asal sudah dihapus; tidak bisa direalokasi.");
  if (baris.jobId !== originJobId) {
    return gagal("Job asal tidak cocok dengan baris biaya asal.");
  }

  const [jobAsal] = await tx
    .select({ id: jobs.id, status: jobs.status, deletedAt: jobs.deletedAt })
    .from(jobs)
    .where(eq(jobs.id, originJobId));
  if (!jobAsal || jobAsal.deletedAt) return gagal("Job asal tidak ditemukan.");

  const [jobTujuan] = await tx
    .select({ id: jobs.id, status: jobs.status, deletedAt: jobs.deletedAt })
    .from(jobs)
    .where(eq(jobs.id, destinationJobId));
  if (!jobTujuan || jobTujuan.deletedAt) return gagal("Job tujuan tidak ditemukan.");

  return {
    ok: true,
    baris: { id: baris.id, jobId: baris.jobId, pencadanganIdr: baris.pencadanganIdr },
    statusAsal: jobAsal.status,
    statusTujuan: jobTujuan.status,
  };
}

// ---------------------------------------------------------------------------
// AJUKAN — pemegang job:edit (termasuk STAFF).
// ---------------------------------------------------------------------------

/**
 * Buat proposal realokasi (pending; approved_by NULL).
 *
 * Validasi: wewenang job:edit → baris asal ada & aktif → jobs ada → asal ≠
 * tujuan → jumlah bulat > 0 → alasan wajib → FINAL-lock → cap (pending lain
 * tidak dihitung). Transaksi: INSERT + 1 baris audit REALOKASI.
 */
export async function ajukanRealokasi(
  dbOrTx: DbOrTx,
  user: PelaksanaRealokasi,
  input: InputAjukanRealokasi,
): Promise<HasilRealokasi<{ id: string }>> {
  const tolak = cekWewenang(user.role, "job:edit");
  if (tolak) return tolak;

  const originChargeLineId = teks(input.originChargeLineId);
  const originJobId = teks(input.originJobId);
  const destinationJobId = teks(input.destinationJobId);
  const alasan = teks(input.alasan);
  if (!originChargeLineId) return gagal("Baris biaya asal wajib dipilih.");
  if (!originJobId) return gagal("Job asal wajib dipilih.");
  if (!destinationJobId) return gagal("Job tujuan wajib dipilih.");
  if (originJobId === destinationJobId) {
    return gagal("Job asal dan tujuan tidak boleh sama — itu bukan realokasi.");
  }
  if (!alasan) return gagal("Alasan realokasi wajib diisi.");

  const jumlah = cekJumlahPositifBulat(input.jumlahIdr);
  if (!jumlah.ok) return gagal(jumlah.error);

  return dbOrTx.transaction(async (tx) => {
    const konteks = await ambilKonteks(
      tx,
      originChargeLineId,
      originJobId,
      destinationJobId,
    );
    if (!konteks.ok) return gagal(konteks.error);

    const final = cekFinal(konteks.statusAsal, konteks.statusTujuan);
    if (!final.ok) return gagal(final.error);

    const sudahDisetujui = await totalDisetujui(tx, originChargeLineId);
    const cap = cekCap(jumlah.value, sudahDisetujui, konteks.baris.pencadanganIdr);
    if (!cap.ok) return gagal(cap.error);

    const [baris] = await tx
      .insert(costReallocations)
      .values({
        originChargeLineId,
        originJobId,
        destinationJobId,
        jumlahIdr: jumlah.value,
        alasan,
        createdBy: user.id,
      })
      .returning();

    await writeAudit(tx, {
      userId: user.id,
      aksi: "REALOKASI",
      entitas: "COST_REALLOCATION",
      entitasId: baris?.id ?? null,
      sesudah: baris ? snapshotBaris(baris) : null,
      alasan,
    });
    return { ok: true, data: { id: baris?.id ?? "" } };
  });
}

// ---------------------------------------------------------------------------
// SETUJUI — pemegang job:reallocate (MANAGER/OWNER), approver ≠ pembuat.
// ---------------------------------------------------------------------------

/**
 * Setujui proposal pending. Menolak bila: sudah disetujui/dihapus, approver =
 * pembuat (R-A1), FINAL (dicek ulang sekarang), atau cap terlampaui (dicek
 * ulang sekarang — proposal lain mungkin disetujui duluan; proposal ini
 * sendiri tidak ikut dihitung).
 */
export async function setujuiRealokasi(
  dbOrTx: DbOrTx,
  user: PelaksanaRealokasi,
  proposalId: string,
): Promise<HasilRealokasi<{ id: string }>> {
  const tolak = cekWewenang(user.role, "job:reallocate");
  if (tolak) return tolak;
  const id = teks(proposalId);
  if (!id) return gagal("Proposal realokasi tidak valid.");

  return dbOrTx.transaction(async (tx) => {
    const [proposal] = await tx
      .select()
      .from(costReallocations)
      .where(eq(costReallocations.id, id));
    if (!proposal) return gagal("Proposal realokasi tidak ditemukan.");
    if (proposal.approvedBy) return gagal("Proposal ini sudah disetujui.");

    try {
      assertNotSelfApproval(user.id, proposal.createdBy);
    } catch (e) {
      return gagal((e as Error).message);
    }

    const konteks = await ambilKonteks(
      tx,
      proposal.originChargeLineId,
      proposal.originJobId,
      proposal.destinationJobId,
    );
    if (!konteks.ok) return gagal(konteks.error);

    const final = cekFinal(konteks.statusAsal, konteks.statusTujuan);
    if (!final.ok) return gagal(final.error);

    // Re-check cap saat approve (menutup race): proposal lain mungkin sudah
    // disetujui sejak proposal ini diajukan. Baris ini sendiri dikecualikan.
    const sudahDisetujuiLain = await totalDisetujui(tx, proposal.originChargeLineId, id);
    const cap = cekCap(
      proposal.jumlahIdr,
      sudahDisetujuiLain,
      konteks.baris.pencadanganIdr,
    );
    if (!cap.ok) return gagal(cap.error);

    const sekarang = new Date();
    const [sesudah] = await tx
      .update(costReallocations)
      .set({ approvedBy: user.id, approvedAt: sekarang })
      .where(eq(costReallocations.id, id))
      .returning();

    await writeAudit(tx, {
      userId: user.id,
      aksi: "EDIT",
      entitas: "COST_REALLOCATION",
      entitasId: id,
      sebelum: snapshotBaris(proposal),
      sesudah: sesudah ? snapshotBaris(sesudah) : null,
      alasan: "Persetujuan realokasi biaya (disetujui oleh approver).",
    });
    return { ok: true, data: { id } };
  });
}

// ---------------------------------------------------------------------------
// TOLAK — HARD DELETE proposal pending + audit HAPUS alasan wajib.
// ---------------------------------------------------------------------------

/**
 * Tolak proposal: hanya boleh kalau masih pending (approved_by IS NULL) —
 * proposal yang sudah disetujui TIDAK BOLEH dihapus. Barisnya dihapus keras
 * dari cost_reallocations (bukan charge_lines — fisik tidak pernah disentuh),
 * dan jejaknya tetap hidup di audit_log (aksi HAPUS, alasan wajib).
 */
export async function tolakRealokasi(
  dbOrTx: DbOrTx,
  user: PelaksanaRealokasi,
  proposalId: string,
  alasan: string,
): Promise<HasilRealokasi<{ id: string }>> {
  const tolak = cekWewenang(user.role, "job:reallocate");
  if (tolak) return tolak;
  const id = teks(proposalId);
  if (!id) return gagal("Proposal realokasi tidak valid.");
  const alasanBersih = teks(alasan);
  if (!alasanBersih) return gagal("Alasan penolakan wajib diisi.");

  return dbOrTx.transaction(async (tx) => {
    const [proposal] = await tx
      .select()
      .from(costReallocations)
      .where(eq(costReallocations.id, id));
    if (!proposal) return gagal("Proposal realokasi tidak ditemukan.");
    if (proposal.approvedBy) {
      return gagal("Proposal yang sudah disetujui tidak boleh dihapus.");
    }

    await tx.delete(costReallocations).where(eq(costReallocations.id, id));

    await writeAudit(tx, {
      userId: user.id,
      aksi: "HAPUS",
      entitas: "COST_REALLOCATION",
      entitasId: id,
      sebelum: snapshotBaris(proposal),
      alasan: alasanBersih,
    });
    return { ok: true, data: { id } };
  });
}

// ---------------------------------------------------------------------------
// Query baca.
// ---------------------------------------------------------------------------

/** Daftar proposal realokasi satu baris asal (semua status). */
export async function daftarRealokasiBaris(dbOrTx: DbOrTx, originChargeLineId: string) {
  return dbOrTx
    .select()
    .from(costReallocations)
    .where(eq(costReallocations.originChargeLineId, originChargeLineId))
    .orderBy(costReallocations.createdAt);
}
