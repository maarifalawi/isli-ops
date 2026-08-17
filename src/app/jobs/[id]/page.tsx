/*
 * Halaman detail job + editor charge line — Irisan 4b + 10 Item 7.
 *
 * Server component: membaca job, charge line aktif, master charge_codes &
 * vendor, lalu menyerahkan ke editor client (./charge-lines).
 * Kartu GP/GP%/NETT (Item 7): dihitung server dari baris aktif (basis
 * pencadangan, Q-4d-2), PPN dari kolom beku invoice TERBIT+, overlay
 * realokasi APPROVED — komponen hanya merender string terformat.
 */

import { HalamanJudul } from "@/components/master/primitives";
import { db } from "@/db/index";
import { customerInvoices } from "@/db/schema/index";
import { daftarChargeLine } from "@/lib/charge-line/index";
import { daftarJob } from "@/lib/job/index";
import { detailJobUntukLaporan, kartuGpJob } from "@/lib/laporan/queries";
import { daftarChargeCode, daftarVendor } from "@/lib/master-data/index";
import { rupiah } from "@/lib/money/index";
import { requireUser } from "@/lib/session/index";
import { statusChargeLine } from "@/lib/vendor-invoice/index";
import { and, eq, ne, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { AksiJob } from "../aksi-job";
import { EditorChargeLine } from "./charge-lines";

export const dynamic = "force-dynamic";

export default async function HalamanDetailJob({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;

  const [jobs, lines, chargeCodes, vendors] = await Promise.all([
    daftarJob(db),
    daftarChargeLine(db, id),
    daftarChargeCode(db),
    daftarVendor(db),
  ]);
  const job = jobs.find((j) => j.id === id);
  if (!job) notFound();

  /*
   * Item 7: GP/GP%/NETT + overlay realokasi — semua di server.
   * detailJobUntukLaporan dipakai ulang untuk baris aktif + gpPostRealokasi
   * (logika realokasi TIDAK ditulis ulang — pola agregat Irisan 8).
   * PPN hanya dari invoice TERBIT+ (kolom beku I-INV-1) — tidak dihitung
   * ulang; null = belum ada invoice → NETT tampil "— (menunggu invoice)".
   */
  const detail = await detailJobUntukLaporan(db, id);
  const gpLines = (detail?.barisBiaya ?? []).map((b) => ({
    sellingIdr: b.sellingIdr,
    pencadanganIdr: b.pencadanganIdr,
    isReimburse: b.isReimburse,
    deletedAt: null,
  }));
  const [ppnRow] = await db
    .select({ total: sql<string>`COALESCE(SUM(${customerInvoices.ppnIdr}), 0)::text` })
    .from(customerInvoices)
    .where(
      and(
        eq(customerInvoices.jobId, id),
        ne(customerInvoices.status, "DRAFT"),
        ne(customerInvoices.status, "BATAL"),
      ),
    );
  const ppnInvoice = rupiah(BigInt(ppnRow?.total ?? "0"));
  const kartu = kartuGpJob(gpLines, ppnInvoice, detail?.gpPostRealokasi ?? null);

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

  const barisUi = await Promise.all(
    lines.map(async (l) => ({
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
      statusPembayaran: await statusChargeLine(db, l.id),
    })),
  );

  return (
    <div>
      <HalamanJudul
        judul={`Job ${job.jobNo}`}
        keterangan="Charge line: baris biaya (selling & buying), leg, at-cost, dan vendor."
      />

      <div className="space-y-6">
        <AksiJob
          jobId={job.id}
          status={job.status}
          role={user.role}
          userId={user.id}
          makerId={job.makerId}
        />
        <section
          data-testid="kartu-gp"
          className="grid grid-cols-2 gap-3 rounded border border-hairline bg-pearl p-4 md:grid-cols-4"
        >
          <div>
            <p className="text-micro uppercase text-ink-48">GP (pencadangan)</p>
            <p className="text-section tabular-nums" data-testid="gp-rupiah">
              {kartu.gpTeks ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-micro uppercase text-ink-48">GP %</p>
            <p className="text-section tabular-nums" data-testid="gp-persen">
              {kartu.gpPersenTeks ?? "—"}
            </p>
          </div>
          <div>
            <p className="text-micro uppercase text-ink-48">NETT</p>
            <p className="text-section tabular-nums" data-testid="nett-rupiah">
              {kartu.nettTeks ??
                (kartu.nettMenungguInvoice ? "— (menunggu invoice)" : "—")}
            </p>
          </div>
          <div>
            <p className="text-micro uppercase text-ink-48">GP setelah realokasi</p>
            <p
              className="text-section tabular-nums"
              data-testid="gp-post-realokasi"
              style={
                kartu.gpPostRealokasiTeks === null ? undefined : { color: "#c93400" }
              }
            >
              {kartu.gpPostRealokasiTeks ?? "—"}
            </p>
          </div>
        </section>
        <EditorChargeLine
          jobId={job.id}
          baris={barisUi}
          chargeCodes={kodeAktif}
          vendors={vendorAktif}
        />
      </div>
    </div>
  );
}
