"use client";

/*
 * Form buat/ubah pelabuhan — client component (RENCANA §8).
 * Server action dibungkus useActionState agar hasil (ok/error) bisa
 * dirender tanpa navigasi penuh. Wrapper meneruskan hanya FormData,
 * karena actionBuatPort/actionUbahPort bertanda tangan (fd: FormData).
 */

import {
  Field,
  PesanHasil,
  TombolPill,
  kelasInput,
  kelasTombolSekunder,
} from "@/components/master/primitives";
import { type HasilAction, actionBuatPort, actionUbahPort } from "@/lib/actions/master";
import { useActionState } from "react";

export function FormBuatPort() {
  const [hasil, formAction, pending] = useActionState(
    async (_prev: HasilAction | null, fd: FormData) => actionBuatPort(fd),
    null,
  );
  return (
    <form action={formAction} className="space-y-3">
      <Field label="Kode">
        <input name="kode" className={kelasInput} maxLength={16} />
      </Field>
      <Field label="Nama">
        <input name="nama" required className={kelasInput} maxLength={160} />
      </Field>
      <Field label="Negara">
        <input name="negara" className={kelasInput} maxLength={2} placeholder="ID" />
      </Field>
      <div className="flex items-center gap-3">
        <TombolPill>{pending ? "Menyimpan…" : "Simpan"}</TombolPill>
      </div>
      <PesanHasil hasil={hasil} />
    </form>
  );
}

export function FormUbahPort({
  id,
  kode,
  nama,
  negara,
}: {
  id: string;
  kode: string;
  nama: string;
  negara: string;
}) {
  const [hasil, formAction, pending] = useActionState(
    async (_prev: HasilAction | null, fd: FormData) => actionUbahPort(fd),
    null,
  );
  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={id} />
      <Field label="Kode">
        <input name="kode" defaultValue={kode} className={kelasInput} maxLength={16} />
      </Field>
      <Field label="Nama">
        <input
          name="nama"
          required
          defaultValue={nama}
          className={kelasInput}
          maxLength={160}
        />
      </Field>
      <Field label="Negara">
        <input name="negara" defaultValue={negara} className={kelasInput} maxLength={2} />
      </Field>
      <div className="flex items-center gap-3">
        <TombolPill>{pending ? "Menyimpan…" : "Simpan Perubahan"}</TombolPill>
        <a href="/master/ports" className={kelasTombolSekunder}>
          Batal
        </a>
      </div>
      <PesanHasil hasil={hasil} />
    </form>
  );
}
