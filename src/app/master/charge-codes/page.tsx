/*
 * Halaman master kode biaya (charge codes) — Irisan 3 (RENCANA §10.4).
 * Server component: membaca daftarChargeCode langsung; form buat/ubah/
 * nonaktif adalah client component (./form) yang membungkus server action
 * dengan useActionState. Dialog edit dipicu searchParams `?edit=<kode>`;
 * nonaktifkan dipicu `?nonaktif=<kode>` dengan alasan WAJIB
 * (divalidasi ubahStatusAktif). Reaktivasi via tombol Aktifkan langsung.
 *
 * Keistimewaan charge codes dibanding vendors/customers (WAJIB):
 * 1. `kode` adalah PK TEXT dan IMMUTABLE — form ubah tidak menyentuhnya
 *    (actionUbahChargeCode lookup via kode; ubahChargeCode menolak bila
 *    input.kode berbeda dari baris yang dituju).
 * 2. kategori FIXED|OPSIONAL default OPSIONAL; checkbox eksplisit tanpa
 *    centang default.
 * 3. segmentScope DOM|EXIM|BOTH dirender <select>.
 * Catatan: ubahStatusAktif("CHARGE_CODE", id, ...) memakai `kode` sebagai
 * parameter id (PK TEXT; entitas_id audit tetap null).
 */

import { BadgeStatus, HalamanJudul } from "@/components/master/primitives";
import { db } from "@/db/index";
import { daftarChargeCode } from "@/lib/master-data/index";
import { requireUser } from "@/lib/session/index";
import {
  FormAktifkanChargeCode,
  FormBuatChargeCode,
  FormNonaktifChargeCode,
  FormUbahChargeCode,
} from "./form";

export const dynamic = "force-dynamic";

export default async function HalamanChargeCodes({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string; nonaktif?: string }>;
}) {
  await requireUser();
  const { edit, nonaktif } = await searchParams;
  const chargeCodes = await daftarChargeCode(db);
  const sedangEdit = edit ? chargeCodes.find((c) => c.kode === edit) : undefined;
  const sedangNonaktif = nonaktif
    ? chargeCodes.find((c) => c.kode === nonaktif)
    : undefined;

  return (
    <div>
      <HalamanJudul
        judul="Kode Biaya"
        keterangan="Master data charge codes: kategori, segment scope, flag pajak & vendor."
      />

      <section className="mb-6 max-w-md rounded border border-hairline bg-pearl p-4">
        {sedangEdit ? (
          <>
            <h2 className="mb-3 text-label font-medium">Ubah Kode Biaya</h2>
            <FormUbahChargeCode
              kode={sedangEdit.kode}
              keterangan={sedangEdit.keterangan}
              nameId={sedangEdit.nameId}
              category={sedangEdit.category}
              defaultLeg={sedangEdit.defaultLeg}
              segmentScope={sedangEdit.segmentScope}
              kategoriFixed={sedangEdit.kategori === "FIXED"}
              defaultReimburse={sedangEdit.defaultReimburse}
              isAtCostDefault={sedangEdit.isAtCostDefault}
              isTaxable={sedangEdit.isTaxable}
              pph23Applicable={sedangEdit.pph23Applicable}
              butuhVendor={sedangEdit.butuhVendor}
            />
          </>
        ) : sedangNonaktif ? (
          <>
            <h2 className="mb-3 text-label font-medium">Nonaktifkan Kode Biaya</h2>
            <p className="mb-3 text-body text-ink-48">
              {sedangNonaktif.kode} — {sedangNonaktif.keterangan} — alasan nonaktif wajib
              diisi.
            </p>
            <FormNonaktifChargeCode id={sedangNonaktif.kode} />
          </>
        ) : (
          <>
            <h2 className="mb-3 text-label font-medium">Tambah Kode Biaya</h2>
            <FormBuatChargeCode />
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
                Keterangan
              </th>
              <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                Kategori
              </th>
              <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                Segment
              </th>
              <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                Butuh Vendor
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
            {chargeCodes.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-3 py-6 text-body text-ink-48">
                  Belum ada kode biaya.
                </td>
              </tr>
            ) : (
              chargeCodes.map((c) => (
                <tr key={c.kode} className="border-b border-divider">
                  <td className="px-3 py-2 font-mono text-body">{c.kode}</td>
                  <td className="px-3 py-2 text-body">{c.keterangan}</td>
                  <td className="px-3 py-2 text-body">{c.kategori}</td>
                  <td className="px-3 py-2 text-body">{c.segmentScope}</td>
                  <td className="px-3 py-2 text-body">
                    {c.butuhVendor ? "Ya" : "Tidak"}
                  </td>
                  <td className="px-3 py-2">
                    <BadgeStatus aktif={c.aktif} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-3">
                      <a
                        href={`/master/charge-codes?edit=${encodeURIComponent(c.kode)}`}
                        className="text-label text-accent hover:underline"
                      >
                        Ubah
                      </a>
                      {c.aktif ? (
                        <a
                          href={`/master/charge-codes?nonaktif=${encodeURIComponent(c.kode)}`}
                          className="text-label hover:underline"
                          style={{ color: "#d70015" }}
                        >
                          Nonaktifkan
                        </a>
                      ) : (
                        <FormAktifkanChargeCode id={c.kode} />
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
