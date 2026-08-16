/*
 * Halaman detail job + editor charge line — Irisan 4b.
 *
 * Server component: membaca job, charge line aktif, master charge_codes &
 * vendor, lalu menyerahkan ke editor client (./charge-lines).
 *
 * TIDAK menampilkan GP/GP%/NETT (itu 4c-4d) — supaya tidak ada angka
 * menyesatkan sebelum konversi kurs & costing dibangun. Currency ditampilkan
 * apa adanya tanpa konversi.
 */

import { HalamanJudul } from "@/components/master/primitives";
import { db } from "@/db/index";
import { daftarChargeLine } from "@/lib/charge-line/index";
import { daftarJob } from "@/lib/job/index";
import { daftarChargeCode, daftarVendor } from "@/lib/master-data/index";
import { requireUser } from "@/lib/session/index";
import { notFound } from "next/navigation";
import { EditorChargeLine } from "./charge-lines";

export const dynamic = "force-dynamic";

export default async function HalamanDetailJob({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireUser();
  const { id } = await params;

  const [jobs, lines, chargeCodes, vendors] = await Promise.all([
    daftarJob(db),
    daftarChargeLine(db, id),
    daftarChargeCode(db),
    daftarVendor(db),
  ]);
  const job = jobs.find((j) => j.id === id);
  if (!job) notFound();

  const kodeAktif = chargeCodes
    .filter((c) => c.aktif)
    .map((c) => ({
      kode: c.kode,
      keterangan: c.keterangan,
      butuhVendor: c.butuhVendor,
      isAtCostDefault: c.isAtCostDefault,
      defaultReimburse: c.defaultReimburse,
      defaultLeg: c.defaultLeg,
    }));
  const vendorAktif = vendors
    .filter((v) => v.aktif)
    .map((v) => ({ id: v.id, nama: v.nama }));

  const barisUi = lines.map((l) => ({
    id: l.id,
    chargeCode: l.chargeCode,
    vendorId: l.vendorId,
    keterangan: l.keterangan,
    sellingIdr: l.sellingIdr?.toString() ?? "0",
    pencadanganIdr: l.pencadanganIdr?.toString() ?? "0",
    isReimburse: l.isReimburse,
    isAtCost: l.isAtCost,
    leg: l.leg,
    currency: l.currency,
    urutan: l.urutan,
  }));

  return (
    <div>
      <HalamanJudul
        judul={`Job ${job.jobNo}`}
        keterangan="Charge line: baris biaya (selling & buying), leg, at-cost, dan vendor. Konversi kurs & GP menyusul di irisan berikutnya."
      />

      <EditorChargeLine
        jobId={job.id}
        baris={barisUi}
        chargeCodes={kodeAktif}
        vendors={vendorAktif}
      />
    </div>
  );
}
