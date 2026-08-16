/*
 * Halaman Job — Irisan 4a (buat job + daftar).
 *
 * Server component: membaca daftar job & customer aktif langsung; form buat
 * job adalah client component (./form) yang membungkus server action.
 *
 * Cakupan 4a: penomoran + kombinasi leg (R10) + kolom kurs USD per job.
 * BUKAN 4a: costing / GP / konversi kurs (menyusul 4b-4e). Kolom GP sengaja
 * TIDAK ditampilkan di sini supaya tidak ada angka uang yang menyesatkan
 * sebelum costing dibangun.
 */

import { HalamanJudul } from "@/components/master/primitives";
import { db } from "@/db/index";
import { daftarJob } from "@/lib/job/index";
import { daftarCustomer } from "@/lib/master-data/index";
import { requireUser } from "@/lib/session/index";
import Link from "next/link";
import { FormBuatJob } from "./form";

export const dynamic = "force-dynamic";

function legText(t: boolean, f: boolean, d: boolean): string {
  const parts: string[] = [];
  if (t) parts.push("1");
  if (f) parts.push("2");
  if (d) parts.push("3");
  return parts.length ? parts.join("+") : "—";
}

export default async function HalamanJobs() {
  await requireUser();
  const [jobs, customers] = await Promise.all([daftarJob(db), daftarCustomer(db)]);
  const customerNama = new Map(customers.map((c) => [c.id, c.nama]));
  const customerAktif = customers
    .filter((c) => c.aktif)
    .map((c) => ({ id: c.id, nama: c.nama }));

  return (
    <div>
      <HalamanJudul
        judul="Job"
        keterangan="Pencatatan job: penomoran, kombinasi leg (R10), dan kurs USD per job."
      />

      <section className="mb-6 max-w-md rounded border border-hairline bg-pearl p-4">
        <h2 className="mb-3 text-label font-medium">Buat Job</h2>
        <FormBuatJob customers={customerAktif} />
      </section>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-parchment">
              <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                Nomor Job
              </th>
              <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                Segmen
              </th>
              <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                Customer
              </th>
              <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                Leg
              </th>
              <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                Status
              </th>
            </tr>
          </thead>
          <tbody>
            {jobs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-3 py-6 text-body text-ink-48">
                  Belum ada job.
                </td>
              </tr>
            ) : (
              jobs.map((j) => (
                <tr key={j.id} className="border-b border-divider">
                  <td className="px-3 py-2 text-body tabular-nums">
                    <Link href={`/jobs/${j.id}`} className="text-accent">
                      {j.jobNo}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-body">{j.seqScope}</td>

                  <td className="px-3 py-2 text-body">
                    {customerNama.get(j.customerId) ?? "—"}
                  </td>
                  <td className="px-3 py-2 text-body tabular-nums">
                    {legText(j.legTrucking, j.legFreight, j.legDelivery)}
                    {j.legOverrideAlasan ? (
                      <span className="ml-1 text-micro text-ink-48">(alasan)</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-2 text-body">{j.status}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
