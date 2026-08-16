"use client";

/*
 * Form buat job — client component (Irisan 4a).
 *
 * Menegakkan R10 di UI (kenyamanan; server tetap penjaga sebenarnya):
 *   - Default leg domestik 1+2+3; EXPORT/IMPORT bebas dari matriks.
 *   - Kalau domestik menyimpang dari 1+2+3, field alasan MUNCUL dan wajib.
 *   - 1+3 tanpa 2 dan "0 leg" tidak bisa disimpan (server menolak; UI memberi
 *     peringatan lebih dini).
 *
 * Uang TIDAK dihitung di sini. Kurs USD hanya angka integer yang diteruskan.
 * Semua label bahasa Indonesia; istilah dagang (job, freight, trucking,
 * dooring, vessel, ETD) dipertahankan.
 */

import {
  Field,
  PesanHasil,
  TombolPill,
  kelasInput,
} from "@/components/master/primitives";
import { type HasilJobAction, actionBuatJob } from "@/lib/actions/job";
import {
  type PilihanLeg,
  isKombinasiLegSah,
  isSatuTigaTanpaDua,
  validasiLeg,
} from "@/lib/job/leg-rules";
import { useRouter } from "next/navigation";
import { useActionState, useState } from "react";

type Segmen = "DOM" | "EXP" | "IMP";

const BULAN_INI = new Date();

export function FormBuatJob({
  customers,
}: {
  customers: { id: string; nama: string }[];
}) {
  const router = useRouter();
  const [segmen, setSegmen] = useState<Segmen>("DOM");
  const [legs, setLegs] = useState<PilihanLeg>({
    trucking: true,
    freight: true,
    delivery: true,
  });

  const [hasil, formAction, pending] = useActionState(
    async (_prev: HasilJobAction | null, fd: FormData) => {
      const res = await actionBuatJob(fd);
      if (res.ok) {
        router.push("/jobs");
        router.refresh();
      }
      return res;
    },
    null,
  );

  // Preview validasi R10 di klien (server tetap otoritatif).
  const validasi = validasiLeg(segmen, legs);
  const perluAlasan = segmen === "DOM" && validasi.ok === true && validasi.perluAlasan;
  const tolakKeras = !isKombinasiLegSah(legs);

  function setLeg(k: keyof PilihanLeg, v: boolean) {
    setLegs((prev) => ({ ...prev, [k]: v }));
  }

  function gantiSegmen(s: Segmen) {
    setSegmen(s);
    // Reset ke default yang wajar per segmen: domestik door-to-door,
    // EXIM biasanya freight saja sebagai titik awal.
    setLegs(
      s === "DOM"
        ? { trucking: true, freight: true, delivery: true }
        : { trucking: false, freight: true, delivery: false },
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <Field label="Segmen">
        <select
          name="segmen"
          value={segmen}
          onChange={(e) => gantiSegmen(e.target.value as Segmen)}
          className={kelasInput}
        >
          <option value="DOM">DOM — Domestik</option>
          <option value="EXP">EXP — Export</option>
          <option value="IMP">IMP — Import</option>
        </select>
      </Field>

      <div className="flex gap-3">
        <Field label="Tahun">
          <input
            name="tahun"
            type="number"
            required
            min={2000}
            max={2100}
            defaultValue={BULAN_INI.getFullYear()}
            className={kelasInput}
          />
        </Field>
        <Field label="Bulan">
          <input
            name="bulan"
            type="number"
            required
            min={1}
            max={12}
            defaultValue={BULAN_INI.getMonth() + 1}
            className={kelasInput}
          />
        </Field>
      </div>

      <Field label="Customer">
        <select name="customerId" required className={kelasInput}>
          <option value="">— pilih customer —</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nama}
            </option>
          ))}
        </select>
      </Field>

      {/* Leg R10 */}
      <fieldset className="rounded border border-hairline p-3">
        <legend className="px-1 text-micro uppercase text-ink-48">Leg (R10)</legend>
        <div className="space-y-2">
          <label className="flex min-h-touch items-center gap-2 text-body">
            <input
              type="checkbox"
              name="legTrucking"
              checked={legs.trucking}
              onChange={(e) => setLeg("trucking", e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Leg 1 — trucking (gudang → pelabuhan asal)
          </label>
          <label className="flex min-h-touch items-center gap-2 text-body">
            <input
              type="checkbox"
              name="legFreight"
              checked={legs.freight}
              onChange={(e) => setLeg("freight", e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Leg 2 — freight (pelabuhan asal → tujuan)
          </label>
          <label className="flex min-h-touch items-center gap-2 text-body">
            <input
              type="checkbox"
              name="legDelivery"
              checked={legs.delivery}
              onChange={(e) => setLeg("delivery", e.target.checked)}
              className="h-4 w-4 accent-accent"
            />
            Leg 3 — dooring (pelabuhan tujuan → alamat)
          </label>
        </div>

        {tolakKeras ? (
          <p className="mt-2 text-label text-red">
            {isSatuTigaTanpaDua(legs)
              ? "Leg 1+3 tanpa leg 2 tidak mungkin. Tambahkan freight."
              : "Minimal satu leg wajib dicentang."}
          </p>
        ) : null}
      </fieldset>

      {/* Alasan override — hanya muncul & wajib untuk domestik yang menyimpang */}
      {perluAlasan ? (
        <Field label="Alasan kombinasi leg tidak standar (wajib)">
          <input
            name="legOverrideAlasan"
            required
            minLength={3}
            maxLength={200}
            className={kelasInput}
            placeholder="mis. customer antar & ambil sendiri"
          />
        </Field>
      ) : (
        // Tetap kirim field kosong supaya server jelas menerima "tidak ada alasan".
        <input type="hidden" name="legOverrideAlasan" value="" />
      )}

      <div className="flex gap-3">
        <Field label="Jenis layanan">
          <select name="serviceType" className={kelasInput}>
            <option value="">—</option>
            <option value="FCL">FCL</option>
            <option value="LCL">LCL</option>
            <option value="AF">AF</option>
          </select>
        </Field>
        <Field label="Akhiran nomor (opsional)">
          <select name="suffix" className={kelasInput}>
            <option value="">—</option>
            <option value="EXP">EXP</option>
            <option value="IMP">IMP</option>
            <option value="AF">AF</option>
            <option value="SEAFREIGHT">SEAFREIGHT</option>
          </select>
        </Field>
      </div>

      <Field label="Rute">
        <input name="rute" className={kelasInput} maxLength={120} />
      </Field>
      <Field label="Vessel">
        <input name="vessel" className={kelasInput} maxLength={120} />
      </Field>
      <div className="flex gap-3">
        <Field label="ETD">
          <input name="etd" type="date" className={kelasInput} />
        </Field>
        <Field label="Sales">
          <input name="sales" className={kelasInput} maxLength={40} />
        </Field>
      </div>

      {/* Kurs USD per job (R8.1) — kolom saja, TANPA konversi di 4a */}
      <fieldset className="rounded border border-hairline p-3">
        <legend className="px-1 text-micro uppercase text-ink-48">
          Kurs USD per job (opsional, tanpa konversi)
        </legend>
        <div className="flex gap-3">
          <Field label="Nilai USD (bulat)">
            <input
              name="sellingUsd"
              type="number"
              min={0}
              step={1}
              className={`${kelasInput} text-right tabular-nums`}
            />
          </Field>
          <Field label="Kurs × 100 (mis. 18.200 → 1820000)">
            <input
              name="kursX100"
              type="number"
              min={0}
              step={1}
              className={`${kelasInput} text-right tabular-nums`}
            />
          </Field>
        </div>
        <p className="mt-1 text-micro text-ink-48">
          Konversi ke rupiah belum dikerjakan di tahap ini.
        </p>
      </fieldset>

      <div className="flex items-center gap-3">
        <TombolPill>{pending ? "Menyimpan…" : "Simpan Job"}</TombolPill>
      </div>
      <PesanHasil hasil={hasil} />
    </form>
  );
}
