/*
 * Halaman master pelabuhan — Irisan 3 (RENCANA-IRISAN-3-CRUD §10.4).
 * Server component: membaca daftarPort langsung; form buat/ubah adalah
 * client component (./form) yang membungkus server action dengan
 * useActionState. Dialog edit dipicu searchParams `?edit=<id>`.
 * Pelabuhan TIDAK punya tombol nonaktifkan (RENCANA §6).
 */

import { HalamanJudul } from "@/components/master/primitives";
import { db } from "@/db/index";
import { daftarPort } from "@/lib/master-data/index";
import { requireUser } from "@/lib/session/index";
import { FormBuatPort, FormUbahPort } from "./form";

export const dynamic = "force-dynamic";

export default async function HalamanPorts({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  await requireUser();
  const { edit } = await searchParams;
  const ports = await daftarPort(db);
  const sedangEdit = edit ? ports.find((p) => p.id === edit) : undefined;

  return (
    <div>
      <HalamanJudul
        judul="Pelabuhan"
        keterangan="Master data pelabuhan: kode, nama, negara."
      />

      <section className="mb-6 max-w-md rounded border border-hairline bg-pearl p-4">
        {sedangEdit ? (
          <>
            <h2 className="mb-3 text-label font-medium">Ubah Pelabuhan</h2>
            <FormUbahPort
              id={sedangEdit.id}
              kode={sedangEdit.kode ?? ""}
              nama={sedangEdit.nama}
              negara={sedangEdit.negara}
            />
          </>
        ) : (
          <>
            <h2 className="mb-3 text-label font-medium">Tambah Pelabuhan</h2>
            <FormBuatPort />
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
              <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                Negara
              </th>
              <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                Aksi
              </th>
            </tr>
          </thead>
          <tbody>
            {ports.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-6 text-body text-ink-48">
                  Belum ada pelabuhan.
                </td>
              </tr>
            ) : (
              ports.map((p) => (
                <tr key={p.id} className="border-b border-divider">
                  <td className="px-3 py-2 text-body">{p.kode ?? "—"}</td>
                  <td className="px-3 py-2 text-body">{p.nama}</td>
                  <td className="px-3 py-2 text-body">{p.negara}</td>
                  <td className="px-3 py-2 text-right">
                    <a
                      href={`/master/ports?edit=${p.id}`}
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
