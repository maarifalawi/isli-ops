"use client";

/*
 * Form buat/ubah pelayaran (ship line) — client component (RENCANA §8).
 * Server action dibungkus useActionState agar hasil (ok/error) bisa
 * dirender tanpa navigasi penuh. Wrapper meneruskan hanya FormData,
 * karena actionBuatShipLine/actionUbahShipLine bertanda tangan (fd: FormData).
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
  actionBuatShipLine,
  actionUbahShipLine,
} from "@/lib/actions/master";
import { useActionState } from "react";

export function FormBuatShipLine() {
  const [hasil, formAction, pending] = useActionState(
    async (_prev: HasilAction | null, fd: FormData) => actionBuatShipLine(fd),
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
      <div className="flex items-center gap-3">
        <TombolPill>{pending ? "Menyimpan…" : "Simpan"}</TombolPill>
      </div>
      <PesanHasil hasil={hasil} />
    </form>
  );
}

export function FormUbahShipLine({
  id,
  kode,
  nama,
}: {
  id: string;
  kode: string;
  nama: string;
}) {
  const [hasil, formAction, pending] = useActionState(
    async (_prev: HasilAction | null, fd: FormData) => actionUbahShipLine(fd),
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
      <div className="flex items-center gap-3">
        <TombolPill>{pending ? "Menyimpan…" : "Simpan Perubahan"}</TombolPill>
        <a href="/master/ship-lines" className={kelasTombolSekunder}>
          Batal
        </a>
      </div>
      <PesanHasil hasil={hasil} />
    </form>
  );
}
