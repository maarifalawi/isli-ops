"use client";

/*
 * Panel realokasi — Irisan 10 Item 8. Komponen hanya merender string
 * terformat dari server + memanggil wrapper action; semua guard (cap,
 * FINAL-lock, ≠ pembuat, audit) tetap di service 4e.
 */

import {
  Field,
  PesanHasil,
  TombolPill,
  kelasInput,
} from "@/components/master/primitives";
import {
  type HasilRealokasiAction,
  actionAjukanRealokasi,
  actionSetujuiRealokasi,
  actionTolakRealokasi,
} from "@/lib/actions/realokasi";
import type { Role } from "@/lib/authz/index";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { bolehMengajukan, bolehMenyetujui } from "./gating";

type ProposalUi = {
  id: string;
  originJobNo: string;
  jumlahTeks: string;
  alasan: string;
  createdBy: string;
  approved: boolean;
};

export function PanelRealokasi({
  user,
  jobEligible,
  jobTerpilih,
  barisJob,
  proposals,
}: {
  user: { id: string; role: Role };
  jobEligible: { id: string; jobNo: string }[];
  jobTerpilih: string | null;
  barisJob: { id: string; label: string }[];
  proposals: ProposalUi[];
}) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {bolehMengajukan(user.role) ? (
        <FormAjukan
          jobEligible={jobEligible}
          jobTerpilih={jobTerpilih}
          barisJob={barisJob}
          onSelesai={() => router.refresh()}
        />
      ) : null}
      <TabelProposal
        user={user}
        proposals={proposals}
        onSelesai={() => router.refresh()}
      />
    </div>
  );
}

/** Form pengajuan: pilih job asal (GET) → baris asal + job tujuan + jumlah + alasan. */
function FormAjukan({
  jobEligible,
  jobTerpilih,
  barisJob,
  onSelesai,
}: {
  jobEligible: { id: string; jobNo: string }[];
  jobTerpilih: string | null;
  barisJob: { id: string; label: string }[];
  onSelesai: () => void;
}) {
  const [hasil, formAction, pending] = useActionState(
    async (_prev: HasilRealokasiAction | null, fd: FormData) => {
      const res = await actionAjukanRealokasi(fd);
      if (res.ok) onSelesai();
      return res;
    },
    null,
  );

  return (
    <section className="max-w-2xl space-y-3 rounded border border-hairline bg-pearl p-4">
      <h2 className="text-label font-medium">Ajukan realokasi</h2>
      <form method="get" className="flex items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-micro uppercase text-ink-48">Job asal</span>
          <select name="job" defaultValue={jobTerpilih ?? ""} className={kelasInput}>
            <option value="">— pilih job asal —</option>
            {jobEligible.map((j) => (
              <option key={j.id} value={j.id}>
                {j.jobNo}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="min-h-touch rounded-full border border-hairline px-4 text-label"
        >
          Muat baris
        </button>
      </form>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="originJobId" value={jobTerpilih ?? ""} />
        <Field label="Baris biaya asal">
          <select
            name="originChargeLineId"
            required
            className={kelasInput}
            disabled={!jobTerpilih}
          >
            <option value="">— pilih baris —</option>
            {barisJob.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Job tujuan">
          <select
            name="destinationJobId"
            required
            className={kelasInput}
            disabled={!jobTerpilih}
          >
            <option value="">— pilih job tujuan —</option>
            {jobEligible
              .filter((j) => j.id !== jobTerpilih)
              .map((j) => (
                <option key={j.id} value={j.id}>
                  {j.jobNo}
                </option>
              ))}
          </select>
        </Field>
        <div className="flex gap-3">
          <Field label="Jumlah (Rp)">
            <input
              name="jumlahIdr"
              type="number"
              min={1}
              step={1}
              required
              disabled={!jobTerpilih}
              className={`${kelasInput} text-right tabular-nums`}
            />
          </Field>
          <div className="flex-1">
            <Field label="Alasan (wajib, Q06)">
              <input
                name="alasan"
                required
                minLength={3}
                disabled={!jobTerpilih}
                className={kelasInput}
              />
            </Field>
          </div>
        </div>
        <TombolPill>{pending ? "Mengirim…" : "Ajukan"}</TombolPill>
        <PesanHasil hasil={hasil} />
      </form>
    </section>
  );
}

/** Daftar proposal + aksi Setujui/Tolak (M/O, ≠ pembuat — service guard). */
function TabelProposal({
  user,
  proposals,
  onSelesai,
}: {
  user: { id: string; role: Role };
  proposals: ProposalUi[];
  onSelesai: () => void;
}) {
  const [tolakAktif, setTolakAktif] = useState<string | null>(null);
  const [hasil, aksiForm, pending] = useActionState(
    async (_prev: HasilRealokasiAction | null, fd: FormData) => {
      const aksi = String(fd.get("aksi") ?? "");
      const res =
        aksi === "setujui"
          ? await actionSetujuiRealokasi(fd)
          : await actionTolakRealokasi(fd);
      if (res.ok) {
        setTolakAktif(null);
        onSelesai();
      }
      return res;
    },
    null,
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse" data-testid="tabel-realokasi">
        <thead>
          <tr className="bg-parchment">
            <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
              Job asal
            </th>
            <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
              Jumlah
            </th>
            <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
              Alasan
            </th>
            <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
              Status
            </th>
            <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          {proposals.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-3 py-6 text-body text-ink-48">
                Belum ada proposal realokasi.
              </td>
            </tr>
          ) : (
            proposals.map((p) => {
              const bisaAksi =
                !p.approved && bolehMenyetujui(user.role) && p.createdBy !== user.id;
              return (
                <tr key={p.id} className="border-b border-divider">
                  <td className="px-3 py-2 text-body tabular-nums">{p.originJobNo}</td>
                  <td className="px-3 py-2 text-right text-body tabular-nums">
                    {p.jumlahTeks}
                  </td>
                  <td className="px-3 py-2 text-body">{p.alasan}</td>
                  <td className="px-3 py-2 text-body">
                    {p.approved ? (
                      <span data-testid={`status-approved-${p.id}`}>APPROVED</span>
                    ) : (
                      <span data-testid={`status-pending-${p.id}`}>PENDING</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {bisaAksi && tolakAktif !== p.id ? (
                      <div className="flex flex-wrap justify-end gap-1">
                        <form action={aksiForm} className="inline">
                          <input type="hidden" name="aksi" value="setujui" />
                          <input type="hidden" name="proposalId" value={p.id} />
                          <button
                            type="submit"
                            disabled={pending}
                            data-testid={`setujui-${p.id}`}
                            className="min-h-touch rounded-full border border-hairline px-3 text-label text-accent"
                          >
                            Setujui
                          </button>
                        </form>
                        <button
                          type="button"
                          onClick={() => setTolakAktif(p.id)}
                          className="min-h-touch rounded-full border px-3 text-label"
                          style={{ color: "#d70015", borderColor: "#d70015" }}
                        >
                          Tolak
                        </button>
                      </div>
                    ) : null}
                    {tolakAktif === p.id ? (
                      <form
                        action={aksiForm}
                        className="mt-2 space-y-2 rounded border border-hairline p-2 text-left"
                      >
                        <input type="hidden" name="aksi" value="tolak" />
                        <input type="hidden" name="proposalId" value={p.id} />
                        <Field label="Alasan penolakan (wajib)">
                          <input
                            name="alasan"
                            required
                            minLength={3}
                            className={kelasInput}
                          />
                        </Field>
                        <div className="flex gap-2">
                          <TombolPill varian="merusak">
                            {pending ? "Memproses…" : "Tolak"}
                          </TombolPill>
                          <button
                            type="button"
                            onClick={() => setTolakAktif(null)}
                            className="min-h-touch rounded-full border border-hairline px-3 text-label"
                          >
                            Batal
                          </button>
                        </div>
                      </form>
                    ) : null}
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
      {hasil && !hasil.ok ? (
        <output className="mt-2 block text-micro" style={{ color: "#d70015" }}>
          {hasil.error}
        </output>
      ) : null}
    </div>
  );
}
