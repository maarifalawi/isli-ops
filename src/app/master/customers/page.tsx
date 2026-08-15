/*
 * Halaman master customer — Irisan 3 (RENCANA-IRISAN-3-CRUD §10.4).
 * Server component: membaca daftarCustomer langsung; form buat/ubah/nonaktif
 * adalah client component (./form) yang membungkus server action dengan
 * useActionState. Dialog edit dipicu searchParams `?edit=<id>`;
 * nonaktifkan dipicu `?nonaktif=<id>` dengan alasan WAJIB
 * (divalidasi ubahStatusAktif). Reaktivasi via tombol Aktifkan langsung.
 */

import { BadgeStatus, HalamanJudul } from "@/components/master/primitives";
import { db } from "@/db/index";
import { daftarCustomer } from "@/lib/master-data/index";
import { requireUser } from "@/lib/session/index";
import {
  FormAktifkanCustomer,
  FormBuatCustomer,
  FormNonaktifCustomer,
  FormUbahCustomer,
} from "./form";

export const dynamic = "force-dynamic";

export default async function HalamanCustomers({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; nonaktif?: string }>;
}) {
  await requireUser();
  const { edit, nonaktif } = await searchParams;
  const customers = await daftarCustomer(db);
  const sedangEdit = edit ? customers.find((c) => c.id === edit) : undefined;
  const sedangNonaktif = nonaktif ? customers.find((c) => c.id === nonaktif) : undefined;

  return (
    <div>
      <HalamanJudul
        judul="Customer"
        keterangan="Master data customer: nama, TOP (hari), PPh 23."
      />

      <section className="mb-6 max-w-md rounded border border-hairline bg-pearl p-4">
        {sedangEdit ? (
          <>
            <h2 className="mb-3 text-label font-medium">Ubah Customer</h2>
            <FormUbahCustomer
              id={sedangEdit.id}
              nama={sedangEdit.nama}
              legalName={sedangEdit.legalName ?? ""}
              npwp={sedangEdit.npwp ?? ""}
              alamat={sedangEdit.alamat ?? ""}
              topHari={sedangEdit.topHari}
              pph23Default={sedangEdit.pph23Default}
            />
          </>
        ) : sedangNonaktif ? (
          <>
            <h2 className="mb-3 text-label font-medium">Nonaktifkan Customer</h2>
            <p className="mb-3 text-body text-ink-48">
              {sedangNonaktif.nama} — alasan nonaktif wajib diisi.
            </p>
            <FormNonaktifCustomer id={sedangNonaktif.id} />
          </>
        ) : (
          <>
            <h2 className="mb-3 text-label font-medium">Tambah Customer</h2>
            <FormBuatCustomer />
          </>
        )}
      </section>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-parchment">
              <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                Nama
              </th>
              <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                TOP (hari)
              </th>
              <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                PPh23
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
            {customers.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-body text-ink-48">
                  Belum ada customer.
                </td>
              </tr>
            ) : (
              customers.map((c) => (
                <tr key={c.id} className="border-b border-divider">
                  <td className="px-3 py-2 text-body">{c.nama}</td>
                  <td className="px-3 py-2 text-body tabular-nums">{c.topHari} hari</td>
                  <td className="px-3 py-2 text-body">
                    {c.pph23Default ? "Ya" : "Tidak"}
                  </td>
                  <td className="px-3 py-2">
                    <BadgeStatus aktif={c.aktif} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-3">
                      <a
                        href={`/master/customers?edit=${c.id}`}
                        className="text-label text-accent hover:underline"
                      >
                        Ubah
                      </a>
                      {c.aktif ? (
                        <a
                          href={`/master/customers?nonaktif=${c.id}`}
                          className="text-label hover:underline"
                          style={{ color: "#d70015" }}
                        >
                          Nonaktifkan
                        </a>
                      ) : (
                        <FormAktifkanCustomer id={c.id} />
                      )}
                    </div>
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
