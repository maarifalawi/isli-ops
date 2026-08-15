"use client";

/*
 * Form buat/ubah/status charge code — client component (RENCANA §10.4).
 * Mengikuti pola vendors/customers: server action dibungkus useActionState
 * agar hasil (ok/error) dirender tanpa navigasi penuh; saat sukses
 * router.push + router.refresh mengembalikan ke daftar bersih.
 *
 * Perbedaan khusus charge codes (WAJIB, lihat prompt Irisan 3 §10.4):
 * 1. `kode` IMMUTABLE — hanya diisi saat buat baru. Pada form ubah,
 *    kode ditampilkan sebagai input disabled (tanpa atribut name) dan
 *    dikirim lewat input hidden `name="kode"` karena input disabled
 *    TIDAK ikut submit (actionUbahChargeCode mencari baris lewat
 *    fd.get("kode"), BUKAN "id").
 * 2. segmentScope dirender <select> DOM|EXIM|BOTH (enum, bukan teks bebas).
 * 3. kategori FIXED|OPSIONAL: default OPSIONAL. Kedua form (buat & ubah)
 *    memakai checkbox `kategoriFixed` EKSPLISIT yang default TIDAK
 *    tercentang (actionBuatChargeCode pun membaca fd "kategoriFixed";
 *    tanpa centang → OPSIONAL). Tidak ada jalan menandai FIXED tanpa sadar.
 * 4. butuhVendor = checkbox biasa.
 * 5. Nonaktifkan WAJIB alasan (divalidasi ubahStatusAktif); aktifkan
 *    alasan opsional — tombol langsung aktifBaru="true".
 */

import {
  Field,
  PesanHasil,
  TombolPill,
  kelasInput,
  kelasTombolSekunder,
} from "@/components/master/primitives";
import {
  type HasilAction,
  actionBuatChargeCode,
  actionStatusChargeCode,
  actionUbahChargeCode,
} from "@/lib/actions/master";
import { useRouter } from "next/navigation";
import { useActionState } from "react";

export function FormBuatChargeCode() {
  const router = useRouter();
  const [hasil, formAction, pending] = useActionState(
    async (_prev: HasilAction | null, fd: FormData) => {
      const res = await actionBuatChargeCode(fd);
      if (res.ok) {
        router.push("/master/charge-codes");
        router.refresh();
      }
      return res;
    },
    null,
  );
  return (
    <form action={formAction} className="space-y-3">
      <Field label="Kode">
        <input
          name="kode"
          required
          minLength={2}
          className={kelasInput}
          maxLength={16}
          placeholder="mis. THC"
        />
      </Field>
      <Field label="Keterangan">
        <input name="keterangan" required className={kelasInput} maxLength={160} />
      </Field>
      <Field label="Name ID">
        <input name="nameId" className={kelasInput} maxLength={64} />
      </Field>
      <Field label="Kategori Beban">
        <input name="category" className={kelasInput} maxLength={32} />
      </Field>
      <Field label="Segment Scope">
        <select name="segmentScope" defaultValue="BOTH" className={kelasInput}>
          <option value="DOM">DOM</option>
          <option value="EXIM">EXIM</option>
          <option value="BOTH">BOTH</option>
        </select>
      </Field>
      <Field label="Default Leg (opsional)">
        <input name="defaultLeg" type="number" min={0} className={kelasInput} />
      </Field>
      <label className="flex items-center gap-2 text-body">
        <input
          type="checkbox"
          name="defaultReimburse"
          className="h-4 w-4 accent-accent"
        />
        Default reimburse
      </label>
      <label className="flex items-center gap-2 text-body">
        <input type="checkbox" name="isAtCostDefault" className="h-4 w-4 accent-accent" />
        Default at cost
      </label>
      <label className="flex items-center gap-2 text-body">
        <input type="checkbox" name="isTaxable" className="h-4 w-4 accent-accent" />
        Kena pajak (taxable)
      </label>
      <label className="flex items-center gap-2 text-body">
        <input type="checkbox" name="pph23Applicable" className="h-4 w-4 accent-accent" />
        Berlaku PPh 23
      </label>
      <label className="flex items-center gap-2 text-body">
        <input type="checkbox" name="butuhVendor" className="h-4 w-4 accent-accent" />
        Butuh vendor
      </label>
      <label className="flex items-center gap-2 text-body">
        {/* TANPA defaultChecked — tanpa centang, kode baru = OPSIONAL.
            Menandai FIXED harus eksplisit (RENCANA §6). */}
        <input type="checkbox" name="kategoriFixed" className="h-4 w-4 accent-accent" />
        Tandai sebagai kategori FIXED (eksplisit; tanpa centang = OPSIONAL)
      </label>
      <p className="text-label text-ink-48">
        Kode baru default kategori OPSIONAL sampai dicentang FIXED di atas.
      </p>
      <div className="flex items-center gap-3">
        <TombolPill>{pending ? "Menyimpan…" : "Simpan"}</TombolPill>
      </div>
      <PesanHasil hasil={hasil} />
    </form>
  );
}

export function FormUbahChargeCode({
  kode,
  keterangan,
  nameId,
  category,
  defaultLeg,
  segmentScope,
  kategoriFixed,
  defaultReimburse,
  isAtCostDefault,
  isTaxable,
  pph23Applicable,
  butuhVendor,
}: {
  kode: string;
  keterangan: string;
  nameId: string | null;
  category: string | null;
  defaultLeg: number | null;
  segmentScope: string;
  kategoriFixed: boolean;
  defaultReimburse: boolean;
  isAtCostDefault: boolean;
  isTaxable: boolean;
  pph23Applicable: boolean;
  butuhVendor: boolean;
}) {
  const router = useRouter();
  const [hasil, formAction, pending] = useActionState(
    async (_prev: HasilAction | null, fd: FormData) => {
      const res = await actionUbahChargeCode(fd);
      if (res.ok) {
        router.push("/master/charge-codes");
        router.refresh();
      }
      return res;
    },
    null,
  );
  return (
    <form action={formAction} className="space-y-3">
      {/* Lookup actionUbahChargeCode memakai kode; input disabled tidak
          ikut submit sehingga kode dikirim via input hidden. */}
      <input type="hidden" name="kode" value={kode} />
      <Field label="Kode (tidak dapat diubah)">
        <input value={kode} disabled className={`${kelasInput} opacity-60`} />
      </Field>
      <Field label="Keterangan">
        <input
          name="keterangan"
          required
          defaultValue={keterangan}
          className={kelasInput}
          maxLength={160}
        />
      </Field>
      <Field label="Name ID">
        <input
          name="nameId"
          defaultValue={nameId ?? ""}
          className={kelasInput}
          maxLength={64}
        />
      </Field>
      <Field label="Kategori Beban">
        <input
          name="category"
          defaultValue={category ?? ""}
          className={kelasInput}
          maxLength={32}
        />
      </Field>
      <Field label="Segment Scope">
        <select name="segmentScope" defaultValue={segmentScope} className={kelasInput}>
          <option value="DOM">DOM</option>
          <option value="EXIM">EXIM</option>
          <option value="BOTH">BOTH</option>
        </select>
      </Field>
      <Field label="Default Leg (opsional)">
        <input
          name="defaultLeg"
          type="number"
          min={0}
          defaultValue={defaultLeg ?? ""}
          className={kelasInput}
        />
      </Field>
      <label className="flex items-center gap-2 text-body">
        <input
          type="checkbox"
          name="kategoriFixed"
          defaultChecked={kategoriFixed}
          className="h-4 w-4 accent-accent"
        />
        Tandai sebagai kategori FIXED (eksplisit)
      </label>
      <label className="flex items-center gap-2 text-body">
        <input
          type="checkbox"
          name="defaultReimburse"
          defaultChecked={defaultReimburse}
          className="h-4 w-4 accent-accent"
        />
        Default reimburse
      </label>
      <label className="flex items-center gap-2 text-body">
        <input
          type="checkbox"
          name="isAtCostDefault"
          defaultChecked={isAtCostDefault}
          className="h-4 w-4 accent-accent"
        />
        Default at cost
      </label>
      <label className="flex items-center gap-2 text-body">
        <input
          type="checkbox"
          name="isTaxable"
          defaultChecked={isTaxable}
          className="h-4 w-4 accent-accent"
        />
        Kena pajak (taxable)
      </label>
      <label className="flex items-center gap-2 text-body">
        <input
          type="checkbox"
          name="pph23Applicable"
          defaultChecked={pph23Applicable}
          className="h-4 w-4 accent-accent"
        />
        Berlaku PPh 23
      </label>
      <label className="flex items-center gap-2 text-body">
        <input
          type="checkbox"
          name="butuhVendor"
          defaultChecked={butuhVendor}
          className="h-4 w-4 accent-accent"
        />
        Butuh vendor
      </label>
      <div className="flex items-center gap-3">
        <TombolPill>{pending ? "Menyimpan…" : "Simpan Perubahan"}</TombolPill>
        <a href="/master/charge-codes" className={kelasTombolSekunder}>
          Batal
        </a>
      </div>
      <PesanHasil hasil={hasil} />
    </form>
  );
}

/**
 * Form nonaktifkan charge code — alasan WAJIB (ubahStatusAktif menolak
 * tanpa alasan). Dipakai saat searchParams `?nonaktif=<id>` cocok.
 */
export function FormNonaktifChargeCode({ id }: { id: string }) {
  const router = useRouter();
  const [hasil, formAction, pending] = useActionState(
    async (_prev: HasilAction | null, fd: FormData) => {
      const res = await actionStatusChargeCode(fd);
      if (res.ok) {
        router.push("/master/charge-codes");
        router.refresh();
      }
      return res;
    },
    null,
  );
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="aktifBaru" value="false" />
      <Field label="Alasan nonaktif (wajib)">
        <input
          name="alasan"
          required
          minLength={3}
          className={kelasInput}
          maxLength={200}
        />
      </Field>
      <div className="flex items-center gap-3">
        <TombolPill varian="merusak">
          {pending ? "Menonaktifkan…" : "Nonaktifkan"}
        </TombolPill>
        <a href="/master/charge-codes" className={kelasTombolSekunder}>
          Batal
        </a>
      </div>
      <PesanHasil hasil={hasil} />
    </form>
  );
}

/**
 * Tombol aktifkan langsung di baris tabel (alasan opsional untuk
 * reaktivasi). Form kecil POST actionStatusChargeCode aktifBaru="true".
 */
export function FormAktifkanChargeCode({ id }: { id: string }) {
  const router = useRouter();
  const [, formAction, pending] = useActionState(
    async (_prev: HasilAction | null, fd: FormData) => {
      const res = await actionStatusChargeCode(fd);
      if (res.ok) {
        router.push("/master/charge-codes");
        router.refresh();
      }
      return res;
    },
    null,
  );
  return (
    <form action={formAction} className="inline">
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="aktifBaru" value="true" />
      <button
        type="submit"
        disabled={pending}
        className="text-label text-accent hover:underline"
      >
        {pending ? "Memproses…" : "Aktifkan"}
      </button>
    </form>
  );
}
