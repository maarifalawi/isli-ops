/*
 * Hub master data — Irisan 3 (RENCANA-IRISAN-3-CRUD §3; langkah terakhir §10.4).
 * Server component: hanya daftar tautan ke lima halaman master data yang
 * sudah selesai. Akses: requireUser() saja — sama seperti halaman lain;
 * otorisasi mutasi tetap dijaga di server action masing-masing halaman,
 * bukan di hub.
 *
 * DESIGN-SYSTEM: kartu 1px --hairline sudut 11px padding 16px, tanpa
 * bayangan/gradien/emoji; hover --parchment; sasaran sentuh >= 44px.
 */

import { HalamanJudul } from "@/components/master/primitives";
import { requireUser } from "@/lib/session/index";

export const dynamic = "force-dynamic";

const DAFTAR_MASTER = [
  {
    href: "/master/customers",
    nama: "Customer",
    keterangan: "Nama, TOP (hari), PPh 23.",
  },
  {
    href: "/master/vendors",
    nama: "Vendor",
    keterangan: "Nama, tipe, term pembayaran, PPh 23.",
  },
  { href: "/master/ports", nama: "Pelabuhan", keterangan: "Kode, nama, negara." },
  { href: "/master/ship-lines", nama: "Pelayaran", keterangan: "Kode, nama." },
  {
    href: "/master/charge-codes",
    nama: "Kode Biaya",
    keterangan: "Kategori, segment scope, flag pajak & vendor.",
  },
];

export default async function HalamanMasterHub() {
  await requireUser();

  return (
    <div>
      <HalamanJudul
        judul="Master Data"
        keterangan="Kamus data operasional. Pilih entitas untuk melihat dan mengelola."
      />

      <ul className="grid gap-3 sm:grid-cols-2">
        {DAFTAR_MASTER.map((item) => (
          <li key={item.href}>
            <a
              href={item.href}
              className="block min-h-touch rounded-md border border-hairline bg-canvas p-4 hover:bg-parchment"
            >
              <span className="block text-section">{item.nama}</span>
              <span className="mt-1 block text-label text-ink-48">{item.keterangan}</span>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
