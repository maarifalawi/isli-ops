import { HalamanJudul } from "@/components/master/primitives";
import { db } from "@/db/index";
import { daftarChargeLine } from "@/lib/charge-line/index";
import { daftarJob } from "@/lib/job/index";
import { rupiah } from "@/lib/money/index";
import { daftarSemuaRealokasi } from "@/lib/realokasi/index";
import { requireUser } from "@/lib/session/index";
import { isLocked } from "@/lib/state-machine/index";
import { PanelRealokasi } from "./panel";

/*
 * Halaman Realokasi — Irisan 10 Item 8. Server component: daftar proposal
 * (status per baris), form pengajuan (baris dari job asal terpilih, job
 * tujuan non-locked), aksi Setujui/Tolak via gating can(). Overlay GP hanya
 * untuk APPROVED — konsisten agregat Irisan 8 (tidak disentuh).
 */

export const dynamic = "force-dynamic";

export default async function HalamanRealokasi({
  searchParams,
}: {
  searchParams: Promise<{ job?: string }>;
}) {
  const user = await requireUser();
  const { job: jobId } = await searchParams;

  const [semuaJob, proposals] = await Promise.all([
    daftarJob(db),
    daftarSemuaRealokasi(db),
  ]);
  // Job aktif non-locked untuk dropdown asal & tujuan (service tetap guard).
  const jobEligible = semuaJob
    .filter((j) => !j.deletedAt && !isLocked(j.status as Parameters<typeof isLocked>[0]))
    .map((j) => ({ id: j.id, jobNo: j.jobNo }));

  const jobTerpilih = jobId && jobId !== "" ? jobId : null;
  const barisJob = jobTerpilih
    ? (await daftarChargeLine(db, jobTerpilih))
        .filter((l) => !l.deletedAt)
        .map((l) => ({
          id: l.id,
          label: `${l.chargeCode} · cadangan ${rupiah(l.pencadanganIdr).toLocaleString("id-ID")}`,
        }))
    : [];

  return (
    <div>
      <HalamanJudul
        judul="Realokasi"
        keterangan="Pemindahan biaya antar job sebagai overlay logis — baris fisik tidak pernah diubah. Proposal PENDING tidak mengubah GP; hanya APPROVED yang menjadi overlay (agregat Irisan 8)."
      />
      <PanelRealokasi
        user={{ id: user.id, role: user.role }}
        jobEligible={jobEligible}
        jobTerpilih={jobTerpilih}
        barisJob={barisJob}
        proposals={proposals.map((p) => ({
          id: p.id,
          originJobNo: p.originJobNo,
          jumlahTeks: rupiah(p.jumlahIdr).toLocaleString("id-ID"),
          alasan: p.alasan,
          createdBy: p.createdBy,
          approved: p.approvedBy !== null,
        }))}
      />
    </div>
  );
}
