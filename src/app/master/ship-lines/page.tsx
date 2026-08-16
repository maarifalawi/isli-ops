/*
 * Halaman master pelayaran (ship line) — Irisan 3 (RENCANA-IRISAN-3-CRUD §10.4).
 * Server component: membaca daftarShipLine langsung; form buat/ubah adalah
 * client component (./form) yang membungkus server action dengan
 * useActionState. Dialog edit dipicu searchParams `?edit=<id>`.
 * Ship line TIDAK punya tombol nonaktifkan (RENCANA §6).
 */

import { HalamanJudul } from "@/components/master/primitives";
import { db } from "@/db/index";
import { daftarShipLine } from "@/lib/master-data/index";
import { requireUser } from "@/lib/session/index";
import { FormBuatShipLine, FormUbahShipLine } from "./form";

export const dynamic = "force-dynamic";

export default async function HalamanShipLines({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireUser();
  const { edit } = await searchParams;
  const shipLines = await daftarShipLine(db);
  const sedangEdit = edit ? shipLines.find((s) => s.id === edit) : undefined;

  return (
    <div>
      <HalamanJudul
        judul="Pelayaran"
        keterangan="Master data pelayaran (ship line): kode, nama."
      />

      <section className="mb-6 max-w-md rounded border border-hairline bg-pearl p-4">
        {sedangEdit ? (
          <>
            <h2 className="mb-3 text-label font-medium">Ubah Pelayaran</h2>
            <FormUbahShipLine
              id={sedangEdit.id}
              kode={sedangEdit.kode ?? ""}
              nama={sedangEdit.nama}
            />
          </>
        ) : (
          <>
            <h2 className="mb-3 text-label font-medium">Tambah Pelayaran</h2>
            <FormBuatShipLine />
          </>
        )}
      </section>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-parchment">
              <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                Kode
              </th>
              <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                Nama
              </th>
              <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {shipLines.length === 0 ? (
              <tr>
                <td colSpan={3} className="px-3 py-6 text-body text-ink-48">
                  Belum ada pelayaran.
                </td>
              </tr>
            ) : (
              shipLines.map((s) => (
                <tr key={s.id} className="border-b border-divider">
                  <td className="px-3 py-2 text-body">{s.kode ?? "—"}</td>
                  <td className="px-3 py-2 text-body">{s.nama}</td>
                  <td className="px-3 py-2 text-right">
                    <a
                      href={`/master/ship-lines?edit=${s.id}`}
                      className="text-label text-accent hover:underline"
                    >
                      Ubah
                    </a>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
