"use client";

/*
 * Editor charge line (client) — Irisan 4b.
 *
 * Menampilkan daftar baris biaya job + form tambah/ubah/hapus. Semua validasi
 * OTORITATIF di server (src/lib/charge-line); UI hanya memberi peringatan dini
 * (mis. at-cost R4.3, vendor wajib R15) supaya user tidak bolak-balik.
 *
 * Uang TIDAK dihitung di sini — hanya diformat/diteruskan sebagai integer
 * rupiah. Tidak ada konversi kurs (itu 4c). Currency hanya penanda.
 *
 * Semua label bahasa Indonesia; istilah dagang (job, vendor, freight, dooring,
 * at-cost, reimburse) dipertahankan. Angka rata kanan + tabular-nums.
 */

import {
  Field,
  PesanHasil,
  TombolPill,
  kelasInput,
} from "@/components/master/primitives";
import {
  type HasilChargeLineAction,
  actionHapusChargeLine,
  actionTambahChargeLine,
  actionUbahChargeLine,
} from "@/lib/actions/charge-line";
import { isAtCostSeimbang } from "@/lib/charge-line/validation";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

type KodeUi = {
  kode: string;
  keterangan: string;
  butuhVendor: boolean;
  isAtCostDefault: boolean;
  defaultReimburse: boolean;
  defaultLeg: number | null;
};
type VendorUi = { id: string; nama: string };
type BarisUi = {
  id: string;
  chargeCode: string;
  vendorId: string | null;
  keterangan: string | null;
  sellingIdr: string;
  pencadanganIdr: string;
  isReimburse: boolean;
  isAtCost: boolean;
  leg: number | null;
  currency: string;
  urutan: number;
};

function formatRp(nilai: string): string {
  try {
    return BigInt(nilai).toLocaleString("id-ID");
  } catch {
    return nilai;
  }
}

function legText(leg: number | null): string {
  if (leg === 1) return "1 · trucking";
  if (leg === 2) return "2 · freight";
  if (leg === 3) return "3 · dooring";
  return "—";
}

export function EditorChargeLine({
  jobId,
  baris,
  chargeCodes,
  vendors,
}: {
  jobId: string;
  baris: BarisUi[];
  chargeCodes: KodeUi[];
  vendors: VendorUi[];
}) {
  const router = useRouter();
  const [edit, setEdit] = useState<BarisUi | null>(null);

  return (
    <div className="space-y-6">
      <TabelChargeLine jobId={jobId} baris={baris} vendors={vendors} onEdit={setEdit} />
      <section className="max-w-2xl rounded border border-hairline bg-pearl p-4">
        <h2 className="mb-3 text-label font-medium">
          {edit ? "Ubah baris biaya" : "Tambah baris biaya"}
        </h2>
        <FormChargeLine
          key={edit?.id ?? "baru"}
          jobId={jobId}
          chargeCodes={chargeCodes}
          vendors={vendors}
          awal={edit}
          onSelesai={() => {
            setEdit(null);
            router.refresh();
          }}
          onBatal={edit ? () => setEdit(null) : undefined}
        />
      </section>
    </div>
  );
}

function TabelChargeLine({
  jobId,
  baris,
  vendors,
  onEdit,
}: {
  jobId: string;
  baris: BarisUi[];
  vendors: VendorUi[];
  onEdit: (b: BarisUi) => void;
}) {
  const router = useRouter();
  const vendorNama = new Map(vendors.map((v) => [v.id, v.nama]));

  async function hapus(b: BarisUi) {
    const alasan = window.prompt(`Alasan menghapus baris "${b.chargeCode}"? (wajib)`);
    if (!alasan?.trim()) return;
    const fd = new FormData();
    fd.set("id", b.id);
    fd.set("jobId", jobId);
    fd.set("alasan", alasan);
    const res = await actionHapusChargeLine(fd);
    if (!res.ok) {
      window.alert(res.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-parchment">
            <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">Kode</th>
            <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
              Vendor
            </th>
            <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">Leg</th>
            <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
              Jual (Rp)
            </th>
            <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
              Beli (Rp)
            </th>
            <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
              Sifat
            </th>
            <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          {baris.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-6 text-body text-ink-48">
                Belum ada baris biaya.
              </td>
            </tr>
          ) : (
            baris.map((b) => (
              <tr key={b.id} className="border-b border-divider">
                <td className="px-3 py-2 text-body">{b.chargeCode}</td>
                <td className="px-3 py-2 text-body">
                  {b.vendorId ? (vendorNama.get(b.vendorId) ?? "—") : "—"}
                </td>
                <td className="px-3 py-2 text-body tabular-nums">{legText(b.leg)}</td>
                <td className="px-3 py-2 text-right text-body tabular-nums">
                  {formatRp(b.sellingIdr)}
                </td>
                <td className="px-3 py-2 text-right text-body tabular-nums">
                  {formatRp(b.pencadanganIdr)}
                </td>
                <td className="px-3 py-2 text-body">
                  {b.isAtCost ? "at-cost" : b.isReimburse ? "reimburse" : "—"}
                  {b.currency !== "IDR" ? (
                    <span className="ml-1 text-micro text-ink-48">{b.currency}</span>
                  ) : null}
                </td>
                <td className="px-3 py-2 text-right text-body">
                  <button
                    type="button"
                    onClick={() => onEdit(b)}
                    className="mr-3 min-h-touch text-accent"
                  >
                    Ubah
                  </button>
                  <button
                    type="button"
                    onClick={() => hapus(b)}
                    className="min-h-touch"
                    style={{ color: "#d70015" }}
                  >
                    Hapus
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function FormChargeLine({
  jobId,
  chargeCodes,
  vendors,
  awal,
  onSelesai,
  onBatal,
}: {
  jobId: string;
  chargeCodes: KodeUi[];
  vendors: VendorUi[];
  awal: BarisUi | null;
  onSelesai: () => void;
  onBatal?: (() => void) | undefined;
}) {
  const [kode, setKode] = useState(awal?.chargeCode ?? "");
  const [vendorId, setVendorId] = useState(awal?.vendorId ?? "");
  const [selling, setSelling] = useState(awal?.sellingIdr ?? "0");
  const [beli, setBeli] = useState(awal?.pencadanganIdr ?? "0");
  const [isAtCost, setIsAtCost] = useState(awal?.isAtCost ?? false);
  const [isReimburse, setIsReimburse] = useState(awal?.isReimburse ?? false);

  const kodeDipilih = chargeCodes.find((c) => c.kode === kode);
  const butuhVendor = kodeDipilih?.butuhVendor ?? true;

  // Peringatan dini (server tetap otoritatif).
  const sellingBig = amanBig(selling);
  const beliBig = amanBig(beli);
  const atCostTakSeimbang =
    isAtCost &&
    sellingBig !== null &&
    beliBig !== null &&
    !isAtCostSeimbang({ isAtCost, sellingIdr: sellingBig, pencadanganIdr: beliBig });
  const vendorKurang = butuhVendor && !vendorId;

  const [hasil, formAction, pending] = useActionState(
    async (_prev: HasilChargeLineAction | null, fd: FormData) => {
      const res = awal
        ? await actionUbahChargeLine(fd)
        : await actionTambahChargeLine(fd);
      if (res.ok) onSelesai();
      return res;
    },
    null,
  );

  return (
    <form action={formAction} className="space-y-3">
      {awal ? <input type="hidden" name="id" value={awal.id} /> : null}
      <input type="hidden" name="jobId" value={jobId} />

      <Field label="Kode biaya">
        <select
          name="chargeCode"
          required
          value={kode}
          onChange={(e) => {
            const k = e.target.value;
            setKode(k);
            const c = chargeCodes.find((x) => x.kode === k);
            if (c) {
              setIsAtCost(c.isAtCostDefault);
              setIsReimburse(c.defaultReimburse);
            }
          }}
          className={kelasInput}
        >
          <option value="">— pilih kode —</option>
          {chargeCodes.map((c) => (
            <option key={c.kode} value={c.kode}>
              {c.kode} — {c.keterangan}
            </option>
          ))}
        </select>
      </Field>

      <Field label={`Vendor${butuhVendor ? " (wajib)" : " (opsional)"}`}>
        <select
          name="vendorId"
          value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}
          className={kelasInput}
        >
          <option value="">— tanpa vendor —</option>
          {vendors.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nama}
            </option>
          ))}
        </select>
      </Field>
      {vendorKurang ? (
        <p className="text-label text-red">
          Kode ini wajib menyebut vendor (R15). Pilih vendor.
        </p>
      ) : null}

      <div className="flex gap-3">
        <Field label="Nilai jual (Rp, bulat)">
          <input
            name="sellingIdr"
            type="number"
            min={0}
            step={1}
            value={selling}
            onChange={(e) => setSelling(e.target.value)}
            className={`${kelasInput} text-right tabular-nums`}
          />
        </Field>
        <Field label="Nilai beli (Rp, bulat)">
          <input
            name="pencadanganIdr"
            type="number"
            min={0}
            step={1}
            value={beli}
            onChange={(e) => setBeli(e.target.value)}
            className={`${kelasInput} text-right tabular-nums`}
          />
        </Field>
      </div>

      <div className="flex gap-4">
        <Field label="Leg">
          <select name="leg" defaultValue={awal?.leg ?? ""} className={kelasInput}>
            <option value="">—</option>
            <option value="1">1 — trucking</option>
            <option value="2">2 — freight</option>
            <option value="3">3 — dooring</option>
          </select>
        </Field>
        <Field label="Mata uang">
          <select
            name="currency"
            defaultValue={awal?.currency ?? "IDR"}
            className={kelasInput}
          >
            <option value="IDR">IDR</option>
            <option value="USD">USD</option>
          </select>
        </Field>
      </div>

      <div className="space-y-2">
        <label className="flex min-h-touch items-center gap-2 text-body">
          <input
            type="checkbox"
            name="isAtCost"
            checked={isAtCost}
            onChange={(e) => setIsAtCost(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          at-cost (nilai jual wajib sama dengan nilai beli — R4.3)
        </label>
        <label className="flex min-h-touch items-center gap-2 text-body">
          <input
            type="checkbox"
            name="isReimburse"
            checked={isReimburse}
            onChange={(e) => setIsReimburse(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          reimburse (dikeluarkan dari DPP saat invoice)
        </label>
      </div>
      {atCostTakSeimbang ? (
        <p className="text-label text-red">
          Baris at-cost: nilai jual harus sama persis dengan nilai beli (R4.3).
        </p>
      ) : null}

      <Field label="Keterangan (opsional)">
        <input
          name="keterangan"
          defaultValue={awal?.keterangan ?? ""}
          maxLength={200}
          className={kelasInput}
        />
      </Field>

      <div className="flex items-center gap-3">
        <TombolPill>
          {pending ? "Menyimpan…" : awal ? "Simpan Perubahan" : "Tambah Baris"}
        </TombolPill>
        {onBatal ? (
          <button
            type="button"
            onClick={onBatal}
            className="min-h-touch rounded-full border border-hairline px-4 text-label font-medium"
          >
            Batal
          </button>
        ) : null}
      </div>
      <PesanHasil hasil={hasil} />
    </form>
  );
}

/** BigInt aman untuk peringatan dini; null kalau bukan integer valid. */
function amanBig(v: string): bigint | null {
  try {
    if (!/^-?\d+$/.test(v.trim())) return null;
    return BigInt(v.trim());
  } catch {
    return null;
  }
}
