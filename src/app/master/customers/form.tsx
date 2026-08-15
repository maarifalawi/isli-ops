"use client";

/*
 * Form buat/ubah/status customer — client component (RENCANA §8).
 * Server action dibungkus useActionState agar hasil (ok/error) bisa
 * dirender tanpa navigasi penuh; saat sukses tanpa kandidat mirip,
 * router.push + router.refresh mengembalikan ke daftar bersih.
 * PeringatanMirip tampil bila action mengembalikan miripDengan
 * (deteksi duplikat nama).
 * Nonaktifkan WAJIB alasan (divalidasi ubahStatusAktif); aktifkan
 * alasan opsional — tombol langsung aktifBaru="true".
 * pph23Default = checkbox manual sesuai DOMAIN-RULES R3.5 (BLOCKER):
 * JANGAN disimpulkan dari data lain.
 */

import {
  Field,
  PeringatanMirip,
  PesanHasil,
  TombolPill,
  kelasInput,
  kelasTombolSekunder,
} from "@/components/master/primitives";
import {
  type HasilAction,
  actionBuatCustomer,
  actionStatusCustomer,
  actionUbahCustomer,
} from "@/lib/actions/master";
import { useRouter } from "next/navigation";
import { useActionState } from "react";

/**
 * Ambil kandidat nama mirip dari HasilAction dengan narrowing eksplisit:
 * hanya cabang `{ ok: true }` yang memiliki `miripDengan`; cek
 * `res.ok === true` dulu sebelum akses (union tanpa discriminator
 * literal tidak boleh diakses langsung via optional chaining).
 */
function kandidatMirip(
  hasil: HasilAction | null,
): { id: string; nama: string; skor: number }[] {
  if (hasil && hasil.ok === true && hasil.miripDengan) {
    return hasil.miripDengan;
  }
  return [];
}

export function FormBuatCustomer() {
  const router = useRouter();
  const [hasil, formAction, pending] = useActionState(
    async (_prev: HasilAction | null, fd: FormData) => {
      const res = await actionBuatCustomer(fd);
      if (res.ok) {
        if ((res.miripDengan?.length ?? 0) === 0) {
          router.push("/master/customers");
        }
        router.refresh();
      }
      return res;
    },
    null,
  );
  return (
    <form action={formAction} className="space-y-3">
      <Field label="Nama">
        <input
          name="nama"
          required
          minLength={2}
          className={kelasInput}
          maxLength={160}
        />
      </Field>
      <Field label="Nama Legal">
        <input name="legalName" className={kelasInput} maxLength={160} />
      </Field>
      <Field label="NPWP">
        <input name="npwp" className={kelasInput} maxLength={32} />
      </Field>
      <Field label="Alamat">
        <input name="alamat" className={kelasInput} maxLength={255} />
      </Field>
      <Field label="TOP (hari)">
        <input
          name="topHari"
          type="number"
          min={0}
          defaultValue={30}
          className={kelasInput}
        />
      </Field>
      <label className="flex items-center gap-2 text-body">
        <input type="checkbox" name="pph23Default" className="h-4 w-4 accent-accent" />
        Potong PPh 23 secara default
      </label>
      <div className="flex items-center gap-3">
        <TombolPill>{pending ? "Menyimpan…" : "Simpan"}</TombolPill>
      </div>
      <PesanHasil hasil={hasil} />
      <PeringatanMirip items={kandidatMirip(hasil)} />
    </form>
  );
}

export function FormUbahCustomer({
  id,
  nama,
  legalName,
  npwp,
  alamat,
  topHari,
  pph23Default,
}: {
  id: string;
  nama: string;
  legalName: string;
  npwp: string;
  alamat: string;
  topHari: number | null;
  pph23Default: boolean | null;
}) {
  const router = useRouter();
  const [hasil, formAction, pending] = useActionState(
    async (_prev: HasilAction | null, fd: FormData) => {
      const res = await actionUbahCustomer(fd);
      if (res.ok) {
        if ((res.miripDengan?.length ?? 0) === 0) {
          router.push("/master/customers");
        }
        router.refresh();
      }
      return res;
    },
    null,
  );
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <Field label="Nama">
        <input
          name="nama"
          required
          minLength={2}
          defaultValue={nama}
          className={kelasInput}
          maxLength={160}
        />
      </Field>
      <Field label="Nama Legal">
        <input
          name="legalName"
          defaultValue={legalName}
          className={kelasInput}
          maxLength={160}
        />
      </Field>
      <Field label="NPWP">
        <input name="npwp" defaultValue={npwp} className={kelasInput} maxLength={32} />
      </Field>
      <Field label="Alamat">
        <input
          name="alamat"
          defaultValue={alamat}
          className={kelasInput}
          maxLength={255}
        />
      </Field>
      <Field label="TOP (hari)">
        <input
          name="topHari"
          type="number"
          min={0}
          defaultValue={topHari ?? 30}
          className={kelasInput}
        />
      </Field>
      <label className="flex items-center gap-2 text-body">
        <input
          type="checkbox"
          name="pph23Default"
          defaultChecked={pph23Default ?? false}
          className="h-4 w-4 accent-accent"
        />
        Potong PPh 23 secara default
      </label>
      <div className="flex items-center gap-3">
        <TombolPill>{pending ? "Menyimpan…" : "Simpan Perubahan"}</TombolPill>
        <a href="/master/customers" className={kelasTombolSekunder}>
          Batal
        </a>
      </div>
      <PesanHasil hasil={hasil} />
      <PeringatanMirip items={kandidatMirip(hasil)} />
    </form>
  );
}

/**
 * Form nonaktifkan customer — alasan WAJIB (ubahStatusAktif menolak
 * tanpa alasan). Dipakai saat searchParams `?nonaktif=<id>` cocok.
 */
export function FormNonaktifCustomer({ id }: { id: string }) {
  const router = useRouter();
  const [hasil, formAction, pending] = useActionState(
    async (_prev: HasilAction | null, fd: FormData) => {
      const res = await actionStatusCustomer(fd);
      if (res.ok) {
        router.push("/master/customers");
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
        <a href="/master/customers" className={kelasTombolSekunder}>
          Batal
        </a>
      </div>
      <PesanHasil hasil={hasil} />
    </form>
  );
}

/**
 * Tombol aktifkan langsung di baris tabel (alasan opsional untuk
 * reaktivasi). Form kecil POST actionStatusCustomer aktifBaru="true".
 */
export function FormAktifkanCustomer({ id }: { id: string }) {
  const router = useRouter();
  const [, formAction, pending] = useActionState(
    async (_prev: HasilAction | null, fd: FormData) => {
      const res = await actionStatusCustomer(fd);
      if (res.ok) {
        router.push("/master/customers");
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
