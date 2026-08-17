import { HalamanJudul } from "@/components/master/primitives";
import { db } from "@/db/index";
import { daftarVendor } from "@/lib/master-data/index";
import { requireUser } from "@/lib/session/index";
import { daftarInvoiceVendor } from "@/lib/vendor-invoice/index";

/*
 * Halaman Invoice Vendor (AP) — Irisan 10 Item 5. Server component: daftar
 * invoice per vendor terpilih + sisa kuota (1:1 junction, Irisan 7) +
 * form terima (V-INV-2 real-time di client) + panel aksi (V-INV-3 gating).
 */

export const dynamic = "force-dynamic";

export default async function HalamanInvoiceVendor({
  searchParams,
}: {
  searchParams: Promise<{ vendor?: string }>;
}) {
  const user = await requireUser();
  const { vendor: vendorIdParam } = await searchParams;
  const vendors = await daftarVendor(db);
  const vendorAktif = vendors
    .filter((v) => v.aktif)
    .map((v) => ({ id: v.id, nama: v.nama }));

  const vendorId =
    vendorIdParam && vendorAktif.some((v) => v.id === vendorIdParam)
      ? vendorIdParam
      : null;
  const invoices = vendorId ? await daftarInvoiceVendor(db, vendorId) : [];

  return (
    <div>
      <HalamanJudul
        judul="Invoice Vendor"
        keterangan="Penerimaan, verifikasi, dan pembayaran invoice vendor. Peringatan nomor mirip tampil sebelum simpan (V-INV-2); status pembayaran wajib dilihat sebelum bayar (V-INV-3)."
      />
      <PanelInvoiceVendor
        user={{ id: user.id, role: user.role }}
        vendors={vendorAktif}
        vendorId={vendorId}
        invoices={invoices.map((i) => ({
          id: i.id,
          vendorInvoiceNo: i.vendorInvoiceNo,
          tanggalInvoice: i.tanggalInvoice,
          jumlahIdr: i.jumlahIdr.toString(),
          pph23Idr: i.pph23Idr.toString(),
          status: i.status,
          diterimaOleh: i.diterimaOleh,
        }))}
      />
    </div>
  );
}

import { PanelInvoiceVendor } from "./panel";
