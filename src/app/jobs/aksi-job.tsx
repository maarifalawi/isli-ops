"use client";

/*
 * Tombol state machine job. Komponen ini hanya menentukan affordance UI;
 * semua izin, R-A1, row lock, approval cycle, dan audit tetap dijaga oleh
 * service Irisan 5 yang dipanggil server action.
 */

import { PesanHasil, TombolPill, kelasInput } from "@/components/master/primitives";
import {
  type HasilTransisiAction,
  actionBatalkanJob,
  actionBukaKunci,
  actionKembalikanJob,
  actionMintaUnlock,
  actionSetujuiFinal,
  actionSetujuiL1,
  actionSubmitJob,
  actionTolakUnlock,
} from "@/lib/actions/job-transisi";
import { type Role, can } from "@/lib/authz/index";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

type JobStatus =
  | "DRAFT"
  | "DIAJUKAN"
  | "DISETUJUI_1"
  | "FINAL"
  | "UNLOCK_REQUESTED"
  | "DIBATALKAN";
type AksiUi =
  | "submit"
  | "cancel"
  | "approve_l1"
  | "reject"
  | "approve_final"
  | "request_unlock"
  | "unlock_granted"
  | "unlock_denied";

const LABEL: Record<AksiUi, string> = {
  submit: "Ajukan",
  cancel: "Batalkan",
  approve_l1: "Setujui L1",
  reject: "Kembalikan",
  approve_final: "Setujui Final",
  request_unlock: "Minta Buka Kunci",
  unlock_granted: "Buka Kunci",
  unlock_denied: "Tolak Pembukaan",
};

function aksiTersedia(
  status: JobStatus,
  role: Role,
  userId: string,
  makerId: string,
): AksiUi[] {
  const bukanMaker = userId !== makerId;
  switch (status) {
    case "DRAFT":
      return [
        ...(userId === makerId && can(role, "job:submit") ? (["submit"] as const) : []),
        ...(userId === makerId || can(role, "job:approve_first")
          ? can(role, "job:cancel")
            ? (["cancel"] as const)
            : []
          : []),
      ];
    case "DIAJUKAN":
      return [
        ...(bukanMaker && can(role, "job:approve_first")
          ? (["approve_l1"] as const)
          : []),
        ...(can(role, "job:reject") &&
        (can(role, "job:approve_first") || can(role, "job:approve_final"))
          ? (["reject"] as const)
          : []),
      ];
    case "DISETUJUI_1":
      return [
        ...(bukanMaker && can(role, "job:approve_final")
          ? (["approve_final"] as const)
          : []),
        ...(can(role, "job:reject") ? (["reject"] as const) : []),
      ];
    case "FINAL":
      return can(role, "job:request_unlock") ? ["request_unlock"] : [];
    case "UNLOCK_REQUESTED":
      return can(role, "job:unlock") ? ["unlock_granted", "unlock_denied"] : [];
    case "DIBATALKAN":
      return [];
  }
}

function actionUntuk(aksi: AksiUi) {
  switch (aksi) {
    case "submit":
      return actionSubmitJob;
    case "cancel":
      return actionBatalkanJob;
    case "approve_l1":
      return actionSetujuiL1;
    case "reject":
      return actionKembalikanJob;
    case "approve_final":
      return actionSetujuiFinal;
    case "request_unlock":
      return actionMintaUnlock;
    case "unlock_granted":
      return actionBukaKunci;
    case "unlock_denied":
      return actionTolakUnlock;
  }
}

function perluAlasan(aksi: AksiUi): boolean {
  return ["reject", "request_unlock", "unlock_granted", "unlock_denied"].includes(aksi);
}

export function AksiJob({
  jobId,
  status,
  role,
  userId,
  makerId,
  compact = false,
}: {
  jobId: string;
  status: JobStatus;
  role: Role;
  userId: string;
  makerId: string;
  compact?: boolean;
}) {
  const tersedia = aksiTersedia(status, role, userId, makerId);
  const [aksi, setAksi] = useState<AksiUi | null>(null);
  const router = useRouter();
  const [hasil, formAction, pending] = useActionState(
    async (_prev: HasilTransisiAction | null, fd: FormData) => {
      const dipilih = String(fd.get("aksi") ?? "") as AksiUi;
      const hasilAksi = await actionUntuk(dipilih)(fd);
      if (hasilAksi.ok) {
        setAksi(null);
        router.refresh();
      }
      return hasilAksi;
    },
    null,
  );

  if (tersedia.length === 0) return null;

  if (compact && aksi === null) {
    return (
      <div className="flex flex-wrap justify-end gap-1">
        {tersedia.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setAksi(item)}
            className="min-h-touch rounded-full border border-hairline px-3 text-label text-accent"
          >
            {LABEL[item]}
          </button>
        ))}
      </div>
    );
  }

  const dipilih = aksi ?? tersedia[0];
  if (!dipilih) return null;
  return (
    <section
      className={
        compact
          ? "rounded border border-hairline bg-pearl p-3"
          : "rounded border border-hairline bg-pearl p-4"
      }
    >
      {!compact ? <h2 className="mb-3 text-section">Aksi persetujuan</h2> : null}
      {tersedia.length > 1 ? (
        <div className="mb-3 flex flex-wrap gap-2">
          {tersedia.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setAksi(item)}
              className={`min-h-touch rounded-full border px-3 text-label ${
                dipilih === item
                  ? "border-accent text-accent"
                  : "border-hairline text-ink-80"
              }`}
            >
              {LABEL[item]}
            </button>
          ))}
        </div>
      ) : null}
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="jobId" value={jobId} />
        <input type="hidden" name="aksi" value={dipilih} />
        {perluAlasan(dipilih) ? (
          <label className="block">
            <span className="mb-1 block text-micro uppercase text-ink-48">
              Alasan (wajib)
            </span>
            <textarea
              name="alasan"
              required
              minLength={3}
              className={`${kelasInput} min-h-12 py-2`}
            />
          </label>
        ) : null}
        {dipilih === "request_unlock" ? (
          <label className="block">
            <span className="mb-1 block text-micro uppercase text-ink-48">
              URL berita acara (wajib)
            </span>
            <input name="beritaAcaraFileUrl" required type="url" className={kelasInput} />
          </label>
        ) : null}
        <div className="flex items-center gap-2">
          <TombolPill
            varian={
              dipilih === "cancel" || dipilih === "unlock_denied" ? "merusak" : "utama"
            }
          >
            {pending ? "Memproses..." : LABEL[dipilih]}
          </TombolPill>
          {compact || tersedia.length > 1 ? (
            <button
              type="button"
              onClick={() => setAksi(null)}
              className="min-h-touch rounded-full border border-hairline px-3 text-label"
            >
              Batal
            </button>
          ) : null}
        </div>
        <PesanHasil hasil={hasil} />
      </form>
    </section>
  );
}
