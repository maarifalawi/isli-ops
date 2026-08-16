import type { db } from "@/db/index";
import {
  approvals,
  chargeLines,
  costReopenRequests,
  customerInvoices,
  jobs,
} from "@/db/schema/index";
import { type AksiAudit, writeAudit } from "@/lib/audit/index";
import { AuthorizationError, assertCan, assertNotSelfApproval } from "@/lib/authz/index";
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { type AksiTransisi, IZIN_PER_AKSI, type JobStatus, canTransition } from "./index";

/*
 * Service transisi state job - Irisan 5. SATU pintu semua perubahan status.
 * Keputusan user 17 Agu 2026 (Q-IRIS5-1..8) yang ditegakkan di sini:
 *   - assertCan lewat IZIN_PER_AKSI (ADR-0004).
 *   - Tabel transisi murni (./index) menentukan dari->ke sah; selainnya
 *     DITOLAK. UPDATE memakai WHERE status=dari: dua transisi bersamaan
 *     hanya satu yang berhasil; approvals.uq_approval_sekali backstop kedua.
 *   - approve_l1/approve_final: approver != maker (J-INV-5/R-A1). Orang yang
 *     SAMA boleh approve L1 lalu Final (Q-IRIS5-5) - keduanya cukup != maker.
 *   - reject & unlock_granted: approval_cycle naik - approval cycle lama
 *     gugur (R6.2/R-A3, Q-IRIS5-3).
 *   - submit: min 1 baris aktif selling_idr > 0 DAN 1 baris pencadangan_idr
 *     > 0 (Q-IRIS5-6).
 *   - request_unlock: alasan + berita acara WAJIB (R6.4; Q79 free-form URL).
 *   - unlock_granted/denied: OWNER saja, != pengaju; invoice TERBIT+ memblokir
 *     unlock (J-INV-3/4).
 *   - cancel: STAFF hanya miliknya (maker_id); belum punya invoice.
 *   - TEPAT 1 baris audit per transisi (J-INV-6, Q-IRIS5-7 - aksi spesifik).
 * Semua dalam SATU transaksi: mutasi + approvals/reopen + audit atomik.
 */

type Tx = Parameters<typeof db.transaction>[0] extends (tx: infer T) => unknown
  ? T
  : never;
export type DbOrTx = typeof db | Tx;

export interface PelaksanaTransisi {
  id: string;
  role: "OWNER" | "MANAGER" | "STAFF";
}

export type HasilTransisi<T = unknown> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function gagal(error: string): { ok: false; error: string } {
  return { ok: false, error };
}

function teks(v: unknown): string | null {
  const s = String(v ?? "").trim();
  return s.length > 0 ? s : null;
}

/** Nama aksi audit_log per transisi (Q-IRIS5-7 - spesifik, bukan generik). */
const AKSI_AUDIT_PER_TRANSISI: Record<AksiTransisi, AksiAudit> = {
  submit: "SUBMIT",
  cancel: "CANCEL",
  approve_l1: "APPROVE_L1",
  reject: "REJECT",
  approve_final: "APPROVE_FINAL",
  request_unlock: "REQUEST_UNLOCK",
  unlock_granted: "UNLOCK_GRANTED",
  unlock_denied: "UNLOCK_DENIED",
};

interface KonteksJob {
  id: string;
  jobNo: string;
  status: JobStatus;
  approvalCycle: number;
  makerId: string;
}

/** Ambil job + row lock; null bila tidak ada / soft-deleted. */
async function ambilJob(tx: Tx, jobId: string): Promise<KonteksJob | null> {
  const [row] = await tx
    .select({
      id: jobs.id,
      jobNo: jobs.jobNo,
      status: jobs.status,
      approvalCycle: jobs.approvalCycle,
      makerId: jobs.makerId,
      deletedAt: jobs.deletedAt,
    })
    .from(jobs)
    .where(eq(jobs.id, jobId))
    .for("update");
  if (!row || row.deletedAt) return null;
  return {
    id: row.id,
    jobNo: row.jobNo,
    status: row.status,
    approvalCycle: row.approvalCycle,
    makerId: row.makerId,
  };
}

/** Job punya invoice customer selain DRAFT/BATAL? (J-INV-3/4). */
async function punyaInvoiceAktif(tx: Tx, jobId: string): Promise<boolean> {
  const [row] = await tx
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(customerInvoices)
    .where(
      and(
        eq(customerInvoices.jobId, jobId),
        ne(customerInvoices.status, "DRAFT"),
        ne(customerInvoices.status, "BATAL"),
      ),
    );
  return (row?.n ?? 0) > 0;
}

/** Syarat submit (Q-IRIS5-6): baris jual > 0 DAN baris cadang > 0. */
async function syaratSubmitLolos(tx: Tx, jobId: string): Promise<string | null> {
  const [jual] = await tx
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(chargeLines)
    .where(
      and(
        eq(chargeLines.jobId, jobId),
        isNull(chargeLines.deletedAt),
        sql`${chargeLines.sellingIdr} > 0`,
      ),
    );
  if ((jual?.n ?? 0) === 0) {
    return "Job belum memiliki baris biaya jual (selling > 0). Lengkapi dulu sebelum diajukan.";
  }
  const [beli] = await tx
    .select({ n: sql<number>`COUNT(*)::int` })
    .from(chargeLines)
    .where(
      and(
        eq(chargeLines.jobId, jobId),
        isNull(chargeLines.deletedAt),
        sql`${chargeLines.pencadanganIdr} > 0`,
      ),
    );
  if ((beli?.n ?? 0) === 0) {
    return "Job belum memiliki baris biaya beli (pencadangan > 0). Lengkapi dulu sebelum diajukan.";
  }
  return null;
}

/**
 * Reject - siapa yang boleh (Q-IRIS5-4 + mirror Q56):
 *   DIAJUKAN   : MANAGER, atau OWNER (job buatan MANAGER: OWNER satu-satunya
 *               lain yang berwenang - R-A1 melarang maker menilai sendiri).
 *   DISETUJUI_1: OWNER.
 */
function bolehReject(status: JobStatus, role: PelaksanaTransisi["role"]): boolean {
  if (role === "OWNER") return true;
  if (role === "MANAGER" && status === "DIAJUKAN") return true;
  return false;
}

/** Core transisi - dipanggil semua aksi publik. */
async function transisi(
  dbOrTx: DbOrTx,
  user: PelaksanaTransisi,
  jobId: string,
  aksi: AksiTransisi,
  opts: { alasan?: string | null; beritaAcaraFileUrl?: string | null },
): Promise<HasilTransisi<{ status: JobStatus; approvalCycle: number }>> {
  // 1. Wewenang - satu pintu (ADR-0004).
  const izin = IZIN_PER_AKSI[aksi] as Parameters<typeof assertCan>[1];
  try {
    assertCan(user.role, izin);
  } catch (e) {
    if (e instanceof AuthorizationError) return gagal(e.message);
    throw e;
  }

  const id = teks(jobId);
  if (!id) return gagal("Job wajib dipilih.");
  const alasan = teks(opts.alasan);

  return dbOrTx.transaction(async (tx) => {
    const job = await ambilJob(tx, id);
    if (!job) return gagal("Job tidak ditemukan.");

    // 2. Transisi sah? (tabel murni - tidak ada jalan lain.)
    const ke = canTransition(job.status, aksi);
    if (ke === null) {
      return gagal(
        `Transisi tidak sah: job ${job.jobNo} berstatus ${job.status} tidak bisa menerima aksi "${aksi}". Lihat docs/STATE-MACHINE.md.`,
      );
    }

    // 3. Syarat khusus per aksi.
    let naikCycle = false;

    if (aksi === "submit") {
      if (user.id !== job.makerId) {
        return gagal("Hanya pembuat job yang boleh mengajukannya (Maker).");
      }
      const syarat = await syaratSubmitLolos(tx, id);
      if (syarat) return gagal(syarat);
    }

    if (aksi === "cancel") {
      if (user.role === "STAFF" && user.id !== job.makerId) {
        return gagal("STAFF hanya boleh membatalkan job miliknya sendiri.");
      }
      if (await punyaInvoiceAktif(tx, id)) {
        return gagal("Job sudah memiliki invoice - tidak bisa dibatalkan.");
      }
    }

    if (aksi === "approve_l1" || aksi === "approve_final") {
      try {
        assertNotSelfApproval(user.id, job.makerId);
      } catch (e) {
        return gagal((e as Error).message);
      }
    }

    if (aksi === "reject") {
      if (!alasan) return gagal("Alasan penolakan wajib diisi.");
      if (!bolehReject(job.status, user.role)) {
        return gagal(
          `Penolakan di status ${job.status} hanya boleh oleh ${
            job.status === "DIAJUKAN" ? "Manager" : "Owner"
          }.`,
        );
      }
      naikCycle = true; // Q-IRIS5-3: semua approval gugur.
    }

    let reopenId: string | null = null;

    if (aksi === "request_unlock") {
      const berita = teks(opts.beritaAcaraFileUrl);
      if (!alasan) return gagal("Alasan pengajuan pembukaan wajib diisi.");
      if (!berita) {
        return gagal(
          "Unggah berita acara wajib sebelum mengajukan pembukaan (R6.4) - berapa pun nilainya.",
        );
      }
      const [row] = await tx
        .insert(costReopenRequests)
        .values({
          jobId: id,
          requestedBy: user.id,
          beritaAcaraFileUrl: berita,
          alasan,
        })
        .returning({ id: costReopenRequests.id });
      reopenId = row?.id ?? null;
    }

    if (aksi === "unlock_granted" || aksi === "unlock_denied") {
      if (!alasan) {
        return gagal("Alasan keputusan pembukaan wajib diisi.");
      }
      // J-INV-3/4: invoice TERBIT+ memblokir unlock (apalagi LUNAS).
      if (aksi === "unlock_granted" && (await punyaInvoiceAktif(tx, id))) {
        return gagal(
          "Job sudah memiliki invoice terbit/lunas - tidak boleh dibuka kembali (J-INV-3/J-INV-4). Batalkan invoice-nya dulu.",
        );
      }
      // Keputusan atas pengajuan TERAKHIR yang masih DIAJUKAN; pengambil
      // keputusan wajib OWNER (job:unlock) dan != pengaju.
      const [req] = await tx
        .select()
        .from(costReopenRequests)
        .where(
          and(
            eq(costReopenRequests.jobId, id),
            eq(costReopenRequests.status, "DIAJUKAN"),
          ),
        )
        .orderBy(sql`${costReopenRequests.createdAt} DESC`)
        .limit(1);
      if (!req) {
        return gagal("Tidak ada pengajuan pembukaan yang menunggu keputusan.");
      }
      try {
        assertNotSelfApproval(user.id, req.requestedBy);
      } catch (e) {
        return gagal((e as Error).message);
      }
      const [upd] = await tx
        .update(costReopenRequests)
        .set({
          status: aksi === "unlock_granted" ? "DISETUJUI" : "DITOLAK",
          decidedBy: user.id,
          decidedAt: new Date(),
          catatanKeputusan: alasan,
        })
        .where(eq(costReopenRequests.id, req.id))
        .returning({ id: costReopenRequests.id });
      reopenId = upd?.id ?? req.id;
      if (aksi === "unlock_granted") naikCycle = true; // R6.2.
    }

    // 4. UPDATE status dengan guard status-lama (race: dua klik bersamaan
    //    hanya satu yang lolos - yang lain mendapati 0 baris ter-update).
    const [sesudah] = await tx
      .update(jobs)
      .set({
        status: ke,
        ...(naikCycle ? { approvalCycle: job.approvalCycle + 1 } : {}),
        updatedAt: new Date(),
      })
      .where(and(eq(jobs.id, id), eq(jobs.status, job.status)))
      .returning({ status: jobs.status, approvalCycle: jobs.approvalCycle });
    if (!sesudah) {
      return gagal(
        "Status job sudah berubah di tengah proses - transisi dibatalkan. Muat ulang lalu coba lagi.",
      );
    }

    // 5. Jejak approval (uq_approval_sekali = backstop paralel kedua).
    if (aksi === "approve_l1" || aksi === "approve_final") {
      await tx.insert(approvals).values({
        jobId: id,
        cycle: job.approvalCycle,
        tingkat: aksi === "approve_l1" ? 1 : 2,
        approverId: user.id,
        catatan: alasan,
      });
    }

    // 6. TEPAT 1 baris audit per transisi (J-INV-6).
    await writeAudit(tx, {
      userId: user.id,
      aksi: AKSI_AUDIT_PER_TRANSISI[aksi],
      entitas: "JOB",
      entitasId: id,
      sebelum: {
        status: job.status,
        approvalCycle: job.approvalCycle,
        jobNo: job.jobNo,
      },
      sesudah: {
        status: sesudah.status,
        approvalCycle: sesudah.approvalCycle,
        jobNo: job.jobNo,
        ...(reopenId ? { costReopenRequestId: reopenId } : {}),
      },
      alasan: alasan ?? `Transisi ${aksi} job ${job.jobNo}.`,
    });

    return {
      ok: true,
      data: { status: sesudah.status, approvalCycle: sesudah.approvalCycle },
    };
  });
}

// ---------------------------------------------------------------------------
// API publik per aksi.
// ---------------------------------------------------------------------------

/** DRAFT -> DIAJUKAN (Maker; syarat Q-IRIS5-6). */
export function submitJob(dbOrTx: DbOrTx, user: PelaksanaTransisi, jobId: string) {
  return transisi(dbOrTx, user, jobId, "submit", {});
}

/** DRAFT -> DIBATALKAN (Maker/Manager/Owner; STAFF hanya miliknya; tanpa invoice). */
export function cancelJob(
  dbOrTx: DbOrTx,
  user: PelaksanaTransisi,
  jobId: string,
  alasan: string | null,
) {
  return transisi(dbOrTx, user, jobId, "cancel", { alasan });
}

/** DIAJUKAN -> DISETUJUI_1 (Manager/Owner, != maker). */
export function approveL1(
  dbOrTx: DbOrTx,
  user: PelaksanaTransisi,
  jobId: string,
  catatan?: string | null,
) {
  return transisi(dbOrTx, user, jobId, "approve_l1", { alasan: catatan ?? null });
}

/** DIAJUKAN|DISETUJUI_1 -> DRAFT (alasan wajib; cycle naik). */
export function rejectJob(
  dbOrTx: DbOrTx,
  user: PelaksanaTransisi,
  jobId: string,
  alasan: string,
) {
  return transisi(dbOrTx, user, jobId, "reject", { alasan });
}

/** DISETUJUI_1 -> FINAL (Owner, != maker). */
export function approveFinal(
  dbOrTx: DbOrTx,
  user: PelaksanaTransisi,
  jobId: string,
  catatan?: string | null,
) {
  return transisi(dbOrTx, user, jobId, "approve_final", { alasan: catatan ?? null });
}

/** FINAL -> UNLOCK_REQUESTED (Manager/Owner; alasan + berita acara WAJIB). */
export function requestUnlock(
  dbOrTx: DbOrTx,
  user: PelaksanaTransisi,
  jobId: string,
  alasan: string,
  beritaAcaraFileUrl: string,
) {
  return transisi(dbOrTx, user, jobId, "request_unlock", {
    alasan,
    beritaAcaraFileUrl,
  });
}

/** UNLOCK_REQUESTED -> DRAFT (Owner, != pengaju; cycle naik - R6.2). */
export function unlockGranted(
  dbOrTx: DbOrTx,
  user: PelaksanaTransisi,
  jobId: string,
  alasan: string,
) {
  return transisi(dbOrTx, user, jobId, "unlock_granted", { alasan });
}

/** UNLOCK_REQUESTED -> FINAL (Owner, != pengaju; alasan wajib). */
export function unlockDenied(
  dbOrTx: DbOrTx,
  user: PelaksanaTransisi,
  jobId: string,
  alasan: string,
) {
  return transisi(dbOrTx, user, jobId, "unlock_denied", { alasan });
}
