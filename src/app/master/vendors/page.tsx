/*
 * Halaman master vendor — Irisan 3 (RENCANA-IRISAN-3-CRUD §10.4).
 * Server component: membaca daftarVendor langsung; form buat/ubah/nonaktif
 * adalah client component (./form) yang membungkus server action dengan
 * useActionState. Dialog edit dipicu searchParams `?edit=<id>`;
 * nonaktifkan dipicu `?nonaktif=<id>` dengan alasan WAJIB
 * (divalidasi ubahStatusAktif). Reaktivasi via tombol Aktifkan langsung.
 */

import { BadgeStatus, HalamanJudul } from "@/components/master/primitives";
import { db } from "@/db/index";
import { daftarVendor } from "@/lib/master-data/index";
import { requireUser } from "@/lib/session/index";
import {
  FormAktifkanVendor,
  FormBuatVendor,
  FormNonaktifVendor,
  FormUbahVendor,
} from "./form";

export const dynamic = "force-dynamic";

export default async function HalamanVendors({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; nonaktif?: string }>;
}) {
  await requireUser();
  const { edit, nonaktif } = await searchParams;
  const vendors = await daftarVendor(db);
  const sedangEdit = edit ? vendors.find((v) => v.id === edit) : undefined;
  const sedangNonaktif = nonaktif ? vendors.find((v) => v.id === nonaktif) : undefined;

  return (
    <div>
      <HalamanJudul
        judul="Vendor"
        keterangan="Master data vendor: nama, tipe, term pembayaran, PPh 23."
      />

      <section className="mb-6 max-w-md rounded border border-hairline bg-pearl p-4">
        {sedangEdit ? (
          <>
            <h2 className="mb-3 text-label font-medium">Ubah Vendor</h2>
            <FormUbahVendor
              id={sedangEdit.id}
              nama={sedangEdit.nama}
              legalName={sedangEdit.legalName ?? ""}
              npwp={sedangEdit.npwp ?? ""}
              vendorType={sedangEdit.vendorType}
              paymentTerm={sedangEdit.paymentTerm}
              paymentTermDays={sedangEdit.paymentTermDays}
              pph23Default={sedangEdit.pph23Default}
            />
          </>
        ) : sedangNonaktif ? (
          <>
            <h2 className="mb-3 text-label font-medium">Nonaktifkan Vendor</h2>
            <p className="mb-3 text-body text-ink-48">
              {sedangNonaktif.nama} — alasan nonaktif wajib diisi.
            </p>
            <FormNonaktifVendor id={sedangNonaktif.id} />
          </>
        ) : (
          <>
            <h2 className="mb-3 text-label font-medium">Tambah Vendor</h2>
            <FormBuatVendor />
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
                Tipe
              </th>
              <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                Term (+hari)
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
            {vendors.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-body text-ink-48">
                  Belum ada vendor.
                </td>
              </tr>
            ) : (
              vendors.map((v) => (
                <tr key={v.id} className="border-b border-divider">
                  <td className="px-3 py-2 text-body">{v.nama}</td>
                  <td className="px-3 py-2 text-body">{v.vendorType}</td>
                  <td className="px-3 py-2 text-body tabular-nums">
                    {v.paymentTerm} ({v.paymentTermDays} hari)
                  </td>
                  <td className="px-3 py-2 text-body">
                    {v.pph23Default ? "Ya" : "Tidak"}
                  </td>
                  <td className="px-3 py-2">
                    <BadgeStatus aktif={v.aktif} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-3">
                      <a
                        href={`/master/vendors?edit=${v.id}`}
                        className="text-label text-accent hover:underline"
                      >
                        Ubah
                      </a>
                      {v.aktif ? (
                        <a
                          href={`/master/vendors?nonaktif=${v.id}`}
                          className="text-label hover:underline"
                          style={{ color: "#d70015" }}
                        >
                          Nonaktifkan
                        </a>
                      ) : (
                        <FormAktifkanVendor id={v.id} />
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
