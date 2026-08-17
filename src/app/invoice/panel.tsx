"use client";

/*
 * Panel invoice customer — Irisan 10 Item 6.
 *
 * KOMPONEN INI TIDAK MENGHITUNG UANG — semua nilai pajak/total dibaca dari
 * kolom BEKU yang diisi service saat terbit (I-INV-1), hanya diformat.
 * Nomor invoice TIDAK pernah diinput di sini: dialokasikan service.
 */

import {
  Field,
  PesanHasil,
  TombolPill,
  kelasInput,
} from "@/components/master/primitives";
import {
  type HasilInvoiceAction,
  actionBatalkanInvoice,
  actionBuatDraftInvoice,
  actionHapusDraftInvoice,
  actionKirimInvoice,
  actionTerbitkanInvoice,
} from "@/lib/actions/invoice";
import type { Role } from "@/lib/authz/index";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";
import { bolehBatalkan, bolehBuatDraft, bolehKirim, bolehTerbitkan } from "./gating";

type InvoiceUi = {
  id: string;
  invoiceNo: string | null;
  status: string;
  jobId: string;
  jobNo: string;
  customerNama: string;
  issueDate: string | null;
  dueDate: string | null;
  grandTotalIdr: string | null;
  dppIdr: string | null;
  ppnIdr: string | null;
  pph23Applied: boolean;
  pph23Idr: string | null;
};

function formatRp(nilai: string | null): string {
  if (nilai === null) return "—";
  try {
    return BigInt(nilai).toLocaleString("id-ID");
  } catch {
    return nilai;
  }
}

export function PanelInvoice({
  user,
  jobFinal,
  invoices,
}: {
  user: { id: string; role: Role };
  jobFinal: { id: string; jobNo: string }[];
  invoices: InvoiceUi[];
}) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      {bolehBuatDraft(user.role) ? (
        <FormDraft jobFinal={jobFinal} onSelesai={() => router.refresh()} />
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-parchment">
              <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                Nomor
              </th>
              <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                Job
              </th>
              <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                Customer
              </th>
              <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                Terbit
              </th>
              <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                Tempo
              </th>
              <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                DPP
              </th>
              <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                PPN
              </th>
              <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                PPh 23
              </th>
              <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                Total
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
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-3 py-6 text-body text-ink-48">
                  Belum ada invoice.
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
                <BarisInvoice
                  key={inv.id}
                  user={user}
                  inv={inv}
                  onSelesai={() => router.refresh()}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Form buat DRAFT — pilih job FINAL, tanggal POD (R9.4), centang PPh 23 (R3.5). */
function FormDraft({
  jobFinal,
  onSelesai,
}: {
  jobFinal: { id: string; jobNo: string }[];
  onSelesai: () => void;
}) {
  const [hasil, formAction, pending] = useActionState(
    async (_prev: HasilInvoiceAction | null, fd: FormData) => {
      const res = await actionBuatDraftInvoice(fd);
      if (res.ok) onSelesai();
      return res;
    },
    null,
  );

  return (
    <section className="max-w-2xl rounded border border-hairline bg-pearl p-4">
      <h2 className="mb-3 text-label font-medium">Buat draft invoice</h2>
      <form action={formAction} className="space-y-3">
        <Field label="Job FINAL">
          <select name="jobId" required className={kelasInput}>
            <option value="">— pilih job —</option>
            {jobFinal.map((j) => (
              <option key={j.id} value={j.id}>
                {j.jobNo}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex gap-3">
          <Field label="Tanggal POD diterima (R9.4)">
            <input name="podDiterimaAt" type="date" className={kelasInput} />
          </Field>
          <label className="flex min-h-touch items-center gap-2 text-body">
            <input
              type="checkbox"
              name="pph23Applicable"
              className="h-4 w-4 accent-accent"
            />
            Potong PPh 23 (R3.5 — keputusan Finance, bukan otomatis)
          </label>
        </div>
        <TombolPill>{pending ? "Menyimpan…" : "Buat Draft"}</TombolPill>
        <PesanHasil hasil={hasil} />
      </form>
    </section>
  );
}

/** Satu baris invoice + aksi sesuai status (gating via can(); service penjaga). */
function BarisInvoice({
  user,
  inv,
  onSelesai,
}: {
  user: { id: string; role: Role };
  inv: InvoiceUi;
  onSelesai: () => void;
}) {
  const [formAktif, setFormAktif] = useState<"terbit" | "batal" | null>(null);
  const [hasil, aksiForm, pending] = useActionState(
    async (_prev: HasilInvoiceAction | null, fd: FormData) => {
      const aksi = String(fd.get("aksi") ?? "");
      const res =
        aksi === "terbit"
          ? await actionTerbitkanInvoice(fd)
          : aksi === "kirim"
            ? await actionKirimInvoice(fd)
            : aksi === "batal"
              ? await actionBatalkanInvoice(fd)
              : await actionHapusDraftInvoice(fd);
      if (res.ok) {
        setFormAktif(null);
        onSelesai();
      }
      return res.ok ? { ok: true as const } : { ok: false as const, error: res.error };
    },
    null,
  );

  return (
    <tr className="border-b border-divider">
      <td className="px-3 py-2 text-body tabular-nums">{inv.invoiceNo ?? "—"}</td>
      <td className="px-3 py-2 text-body tabular-nums">{inv.jobNo}</td>
      <td className="px-3 py-2 text-body">{inv.customerNama}</td>
      <td className="px-3 py-2 text-body tabular-nums">{inv.issueDate ?? "—"}</td>
      <td className="px-3 py-2 text-body tabular-nums">{inv.dueDate ?? "—"}</td>
      <td className="px-3 py-2 text-right text-body tabular-nums">
        {formatRp(inv.dppIdr)}
      </td>
      <td className="px-3 py-2 text-right text-body tabular-nums">
        {formatRp(inv.ppnIdr)}
      </td>
      <td className="px-3 py-2 text-right text-body tabular-nums">
        {inv.pph23Applied ? formatRp(inv.pph23Idr) : "—"}
      </td>
      <td className="px-3 py-2 text-right text-body tabular-nums">
        {formatRp(inv.grandTotalIdr)}
      </td>
      <td className="px-3 py-2 text-body">{inv.status}</td>
      <td className="px-3 py-2 text-right">
        <div className="flex flex-wrap justify-end gap-1">
          {inv.status === "DRAFT" && bolehTerbitkan(user.role) && formAktif === null ? (
            <button
              type="button"
              onClick={() => setFormAktif("terbit")}
              data-testid={`terbitkan-${inv.jobNo}`}
              className="min-h-touch rounded-full border border-hairline px-3 text-label text-accent"
            >
              Terbitkan
            </button>
          ) : null}
          {inv.status === "DRAFT" && formAktif === null ? (
            <form action={aksiForm} className="inline">
              <input type="hidden" name="aksi" value="hapus" />
              <input type="hidden" name="invoiceId" value={inv.id} />
              <button
                type="submit"
                className="min-h-touch rounded-full border px-3 text-label"
                style={{ color: "#d70015", borderColor: "#d70015" }}
              >
                Hapus
              </button>
            </form>
          ) : null}
          {inv.status === "TERBIT" && bolehKirim(user.role) ? (
            <form action={aksiForm} className="inline">
              <input type="hidden" name="aksi" value="kirim" />
              <input type="hidden" name="invoiceId" value={inv.id} />
              <button
                type="submit"
                disabled={pending}
                className="min-h-touch rounded-full border border-hairline px-3 text-label text-accent"
              >
                Kirim
              </button>
            </form>
          ) : null}
          {inv.status === "TERBIT" && bolehBatalkan(user.role) && formAktif === null ? (
            <button
              type="button"
              onClick={() => setFormAktif("batal")}
              className="min-h-touch rounded-full border px-3 text-label"
              style={{ color: "#d70015", borderColor: "#d70015" }}
            >
              Batalkan
            </button>
          ) : null}
        </div>
        {formAktif === "terbit" ? (
          <form
            action={aksiForm}
            className="mt-2 space-y-2 rounded border border-hairline p-2 text-left"
          >
            <input type="hidden" name="aksi" value="terbit" />
            <input type="hidden" name="invoiceId" value={inv.id} />
            <div className="flex gap-2">
              <Field label="Tanggal terbit">
                <input name="issueDate" type="date" required className={kelasInput} />
              </Field>
              <Field label="Jatuh tempo (manual, R9.2)">
                <input name="dueDate" type="date" required className={kelasInput} />
              </Field>
            </div>
            <label className="flex min-h-touch items-center gap-2 text-body">
              <input
                type="checkbox"
                name="pph23Applicable"
                className="h-4 w-4 accent-accent"
              />
              Potong PPh 23 (R3.5)
            </label>
            <div className="flex gap-2">
              <TombolPill>{pending ? "Memproses…" : "Terbitkan"}</TombolPill>
              <button
                type="button"
                onClick={() => setFormAktif(null)}
                className="min-h-touch rounded-full border border-hairline px-3 text-label"
              >
                Batal
              </button>
            </div>
          </form>
        ) : null}
        {formAktif === "batal" ? (
          <form
            action={aksiForm}
            className="mt-2 space-y-2 rounded border border-hairline p-2 text-left"
          >
            <input type="hidden" name="aksi" value="batal" />
            <input type="hidden" name="invoiceId" value={inv.id} />
            <Field label="Alasan pembatalan (wajib)">
              <input name="alasan" required minLength={3} className={kelasInput} />
            </Field>
            <div className="flex gap-2">
              <TombolPill varian="merusak">
                {pending ? "Memproses…" : "Batalkan"}
              </TombolPill>
              <button
                type="button"
                onClick={() => setFormAktif(null)}
                className="min-h-touch rounded-full border border-hairline px-3 text-label"
              >
                Batal
              </button>
            </div>
          </form>
        ) : null}
        {hasil && !hasil.ok ? (
          <output className="mt-1 block text-micro" style={{ color: "#d70015" }}>
            {hasil.error}
          </output>
        ) : null}
      </td>
    </tr>
  );
}
