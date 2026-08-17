/*
 * Halaman Laporan — Irisan 8b/8c/8d.
 *
 * Server component. Semua angka uang dihitung & diformat server-side di
 * src/lib/laporan (queries.ts) — komponen hanya merender STRING yang sudah
 * jadi. Tidak ada impor modul uang & tidak ada aritmetika uang di sini
 * (aturan .clinerules/03 + dependency-cruiser no-money-math-in-ui).
 *
 * Rentang bulan hidup di URL (R14.1) supaya bisa dibagikan:
 *   ?dari=YYYY-MM&sampai=YYYY-MM
 * Tab sumbu peringkat (R14.2) & drill-down (R14.4):
 *   ?sumbu=customer|segmen|sales|rute&label=...
 *
 * Menggantikan ringkasan bulanan manual Excel dengan angka yang selalu bisa
 * dilacak ke hitungGP — nilai inti proyek ("mata satu" Pak Indra).
 */

import { HalamanJudul } from "@/components/master/primitives";
import { db } from "@/db/index";
import { can } from "@/lib/authz/index";
import { parseRentangDariUrl, rentangKeLabel } from "@/lib/laporan/periode";
import {
  type SumbuPendapatan,
  dashboardGp,
  jobEntitasDariRingkasan,
  kartuJobCariDariDetail,
  kartuLaporanDariRingkasan,
  peringkatDariRingkasan,
  rekapPajakPerBulan,
  rekapVendorPerBulan,
  ringkasanJobDalamRentang,
} from "@/lib/laporan/queries";
import { requireUser } from "@/lib/session/index";
import Link from "next/link";
import { PemilihRentang } from "./pemilih-rentang";

export const dynamic = "force-dynamic";

const NAMA_BULAN = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des",
] as const;

const SUMBU_LABEL: Record<SumbuPendapatan, string> = {
  customer: "Customer",
  segmen: "Segmen",
  sales: "Sales",
  rute: "Rute",
};

export default async function HalamanLaporan({
  searchParams,
}: {
  searchParams: Promise<{
    dari?: string;
    sampai?: string;
    sumbu?: string;
    label?: string;
    cari?: string;
  }>;
}) {
  const user = await requireUser();
  if (!can(user.role, "report:view")) {
    return (
      <div className="text-body text-ink-48">
        Anda tidak memiliki izin melihat laporan.
      </div>
    );
  }

  const sp = await searchParams;
  const rentang = parseRentangDariUrl(sp.dari ?? "", sp.sampai ?? "");
  if (!rentang) {
    return (
      <div>
        <HalamanJudul
          judul="Laporan"
          keterangan="Rentang bulan belum valid. Pilih rentang Apr–Jul 2026 untuk data contoh."
        />
        <PemilihRentang />
      </div>
    );
  }

  const sumbuRaw = sp.sumbu ?? "customer";
  const sumbu: SumbuPendapatan = (
    ["customer", "segmen", "sales", "rute"] as const
  ).includes(sumbuRaw as SumbuPendapatan)
    ? (sumbuRaw as SumbuPendapatan)
    : "customer";
  const labelTerpilih = sp.label ?? null;
  const cari = sp.cari?.trim() ?? "";

  const [dash, ringkasan, rekapVendor, rekapPajak] = await Promise.all([
    dashboardGp(db, rentang),
    ringkasanJobDalamRentang(db, rentang),
    rekapVendorPerBulan(db, rentang),
    rekapPajakPerBulan(db, rentang),
  ]);

  const kartu = kartuLaporanDariRingkasan(ringkasan);
  const peringkat = peringkatDariRingkasan(ringkasan, sumbu);
  const jobsDrill = labelTerpilih
    ? jobEntitasDariRingkasan(ringkasan, sumbu, labelTerpilih)
    : null;

  const dari = sp.dari ?? "";
  const sampai = sp.sampai ?? "";
  const qsSumbu = (s: SumbuPendapatan) =>
    `/laporan?dari=${dari}&sampai=${sampai}&sumbu=${s}`;

  return (
    <div>
      <HalamanJudul
        judul="Laporan"
        keterangan={`Dashboard GP, rekap vendor & pajak, peringkat, dan pencarian job — rentang ${rentangKeLabel(rentang)}.`}
      />

      <PemilihRentang dariAwal={dari} sampaiAwal={sampai} />

      {/* ---------------- Kartu ringkas ---------------- */}
      <section className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <div className="rounded border border-hairline bg-pearl p-4">
          <div className="text-micro uppercase text-ink-48">Job</div>
          <div className="text-h2 tabular-nums">{kartu.jumlahJob}</div>
        </div>
        <div className="rounded border border-hairline bg-pearl p-4">
          <div className="text-micro uppercase text-ink-48">Selling (Rp)</div>
          <div className="text-h2 tabular-nums">{kartu.totalSellingTeks}</div>
        </div>
        <div className="rounded border border-hairline bg-pearl p-4">
          <div className="text-micro uppercase text-ink-48">GP (Rp)</div>
          <div className="text-h2 tabular-nums">{kartu.totalGpTeks}</div>
        </div>
        <div className="rounded border border-hairline bg-pearl p-4">
          <div className="text-micro uppercase text-ink-48">Belum ada data</div>
          <div className="text-h2 tabular-nums">{kartu.jumlahJobKosong}</div>
        </div>
      </section>

      {/* ---------------- Dashboard GP: bulan × segmen ---------------- */}
      <section className="mb-6">
        <h2 className="mb-2 text-section">GP per Bulan × Segmen</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-parchment">
                <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                  Bulan
                </th>
                <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                  Segmen
                </th>
                <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                  Job
                </th>
                <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                  Selling (Rp)
                </th>
                <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                  Cost (Rp)
                </th>
                <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                  GP (Rp)
                </th>
                <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                  GP%
                </th>
              </tr>
            </thead>
            <tbody>
              {dash.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-body text-ink-48">
                    Tidak ada job pada rentang ini.
                  </td>
                </tr>
              ) : (
                dash.map((r) => (
                  <tr
                    key={`${r.tahun}-${r.bulan}-${r.segmen}`}
                    className="border-b border-divider"
                  >
                    <td className="px-3 py-2 text-body">
                      {NAMA_BULAN[r.bulan - 1]} {r.tahun}
                    </td>
                    <td className="px-3 py-2 text-body">{r.segmen}</td>
                    <td className="px-3 py-2 text-right text-body tabular-nums">
                      {r.jumlahJob}
                    </td>
                    <td className="px-3 py-2 text-right text-body tabular-nums">
                      {r.totalSelling.toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-body tabular-nums">
                      {r.totalCost.toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-body tabular-nums">
                      {r.totalGp.toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-body tabular-nums">
                      {r.gpPersen ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------- Peringkat (8c) + drill-down (8d) ---------------- */}
      <section className="mb-6">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-section">Peringkat Pendapatan</h2>
          {(["customer", "segmen", "sales", "rute"] as const).map((s) => (
            <a
              key={s}
              href={qsSumbu(s)}
              className={`flex min-h-[44px] items-center px-3 text-label ${
                s === sumbu ? "border-b-2 border-accent text-ink" : "text-ink-48"
              }`}
            >
              {SUMBU_LABEL[s]}
            </a>
          ))}
          <a
            href={`/laporan/export?dari=${dari}&sampai=${sampai}&sumbu=${sumbu}`}
            className="ml-auto flex min-h-[44px] items-center rounded border border-hairline px-3 text-label text-accent"
          >
            Export Excel
          </a>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-parchment">
                <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                  {SUMBU_LABEL[sumbu]}
                </th>
                <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                  Job
                </th>
                <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                  Selling (Rp)
                </th>
                <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                  Cost (Rp)
                </th>
                <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                  GP (Rp)
                </th>
                <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                  GP%
                </th>
                <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                  Pertama
                </th>
                <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                  Terakhir
                </th>
              </tr>
            </thead>
            <tbody>
              {peringkat.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-6 text-body text-ink-48">
                    Tidak ada data pada rentang ini.
                  </td>
                </tr>
              ) : (
                peringkat.map((r) => (
                  <tr key={r.label} className="border-b border-divider">
                    <td className="px-3 py-2 text-body">
                      <a
                        className="text-accent"
                        href={`/laporan?dari=${dari}&sampai=${sampai}&sumbu=${sumbu}&label=${encodeURIComponent(r.label)}`}
                      >
                        {r.label}
                      </a>
                    </td>
                    <td className="px-3 py-2 text-right text-body tabular-nums">
                      {r.jumlahJob}
                    </td>
                    <td className="px-3 py-2 text-right text-body tabular-nums">
                      {r.totalSelling.toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-body tabular-nums">
                      {r.totalCost.toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-body tabular-nums">
                      {r.totalGp.toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-body tabular-nums">
                      {r.gpPersen ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-body tabular-nums">
                      {r.tanggalPertama ?? "—"}
                    </td>
                    <td className="px-3 py-2 text-body tabular-nums">
                      {r.tanggalTerakhir ?? "—"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {jobsDrill !== null ? (
          <div className="mt-4">
            <h3 className="mb-2 text-label">
              Job untuk {SUMBU_LABEL[sumbu]} “{labelTerpilih}” ({jobsDrill.length} job)
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="bg-parchment">
                    <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                      Nomor Job
                    </th>
                    <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                      Status
                    </th>
                    <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                      Selling (Rp)
                    </th>
                    <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                      Cost (Rp)
                    </th>
                    <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                      GP (Rp)
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {jobsDrill.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-3 py-6 text-body text-ink-48">
                        Tidak ada job untuk label ini.
                      </td>
                    </tr>
                  ) : (
                    jobsDrill.map((j) => (
                      <tr key={j.jobId} className="border-b border-divider">
                        <td className="px-3 py-2 text-body">
                          <Link href={`/jobs/${j.jobId}`} className="text-accent">
                            {j.jobNo}
                          </Link>
                        </td>
                        <td className="px-3 py-2 text-body">{j.status}</td>
                        <td className="px-3 py-2 text-right text-body tabular-nums">
                          {j.selling.toLocaleString("id-ID")}
                        </td>
                        <td className="px-3 py-2 text-right text-body tabular-nums">
                          {j.cost.toLocaleString("id-ID")}
                        </td>
                        <td className="px-3 py-2 text-right text-body tabular-nums">
                          {j.gp === null ? "—" : j.gp.toLocaleString("id-ID")}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}
      </section>

      {/* ---------------- Rekap vendor per bulan (R7.3) ---------------- */}
      <section className="mb-6">
        <h2 className="mb-2 text-section">Rekap Pembayaran Vendor</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-parchment">
                <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                  Vendor
                </th>
                <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                  Bulan
                </th>
                <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                  Invoice
                </th>
                <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                  Dibayar (Rp)
                </th>
                <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                  PPh 23 (Rp)
                </th>
              </tr>
            </thead>
            <tbody>
              {rekapVendor.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-body text-ink-48">
                    Belum ada pembayaran vendor pada rentang ini.
                  </td>
                </tr>
              ) : (
                rekapVendor.map((r) => (
                  <tr
                    key={`${r.vendorId}-${r.tahun}-${r.bulan}`}
                    className="border-b border-divider"
                  >
                    <td className="px-3 py-2 text-body">{r.vendorNama}</td>
                    <td className="px-3 py-2 text-body">
                      {NAMA_BULAN[r.bulan - 1]} {r.tahun}
                    </td>
                    <td className="px-3 py-2 text-right text-body tabular-nums">
                      {r.jumlahInvoice}
                    </td>
                    <td className="px-3 py-2 text-right text-body tabular-nums">
                      {r.totalDibayar.toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-body tabular-nums">
                      {r.totalPph23.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------- Rekap pajak (PPN & PPh 23) ---------------- */}
      <section className="mb-6">
        <h2 className="mb-2 text-section">Rekap Pajak Invoice Customer</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-parchment">
                <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
                  Bulan Terbit
                </th>
                <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                  Invoice
                </th>
                <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                  DPP (Rp)
                </th>
                <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                  PPN 1,1% (Rp)
                </th>
                <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                  PPh 23 (Rp)
                </th>
                <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
                  Grand Total (Rp)
                </th>
              </tr>
            </thead>
            <tbody>
              {rekapPajak.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-6 text-body text-ink-48">
                    Belum ada invoice terbit pada rentang ini.
                  </td>
                </tr>
              ) : (
                rekapPajak.map((r) => (
                  <tr key={`${r.tahun}-${r.bulan}`} className="border-b border-divider">
                    <td className="px-3 py-2 text-body">
                      {NAMA_BULAN[r.bulan - 1]} {r.tahun}
                    </td>
                    <td className="px-3 py-2 text-right text-body tabular-nums">
                      {r.jumlahInvoice}
                    </td>
                    <td className="px-3 py-2 text-right text-body tabular-nums">
                      {r.totalDpp.toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-body tabular-nums">
                      {r.totalPpn.toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-body tabular-nums">
                      {r.totalPph23.toLocaleString("id-ID")}
                    </td>
                    <td className="px-3 py-2 text-right text-body tabular-nums">
                      {r.totalGrandTotal.toLocaleString("id-ID")}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* ---------------- Pencarian job (8b) ---------------- */}
      <section>
        <h2 className="mb-2 text-section">Pencarian Job</h2>
        <form method="get" action="/laporan" className="mb-3 flex flex-wrap gap-2">
          <input type="hidden" name="dari" value={dari} />
          <input type="hidden" name="sampai" value={sampai} />
          <input
            type="search"
            name="cari"
            defaultValue={cari}
            placeholder="Nomor job, contoh: ISLI-26.04-001"
            className="min-h-[44px] rounded border border-hairline bg-pearl px-3 text-body"
          />
          <button
            type="submit"
            className="min-h-[44px] rounded border border-hairline bg-pearl px-4 text-label"
          >
            Cari
          </button>
        </form>
        {cari !== "" ? <HasilCariJob kunci={cari} /> : null}
      </section>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Hasil pencarian job — server child. Angka dari queries (view-model).  */
/* ------------------------------------------------------------------ */

async function HasilCariJob({ kunci }: { kunci: string }) {
  const { detailJobUntukLaporan } = await import("@/lib/laporan/queries");
  const d = await detailJobUntukLaporan(db, kunci);
  if (!d) {
    return (
      <p className="text-body text-ink-48">
        Job “{kunci}” tidak ditemukan. Periksa kembali nomor job.
      </p>
    );
  }
  const kartu = kartuJobCariDariDetail(d);
  return (
    <div className="rounded border border-hairline bg-pearl p-4">
      <div className="mb-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
        <span className="text-h3">{d.job.jobNo}</span>
        <span className="text-label text-ink-48">
          {d.job.seqScope} · {d.job.status}
        </span>
        <span className="text-label">{d.job.customerNama ?? "—"}</span>
        <span className="text-label text-ink-48">
          {d.job.rute ?? "—"}
          {d.job.etd ? ` · ETD ${d.job.etd}` : ""}
        </span>
      </div>
      <div className="mb-3 flex flex-wrap gap-x-6 gap-y-1 text-body tabular-nums">
        <span>Selling (Rp): {kartu.sellingTeks}</span>
        <span>Pencadangan (Rp): {kartu.pencadanganTeks}</span>
        <span>GP (Rp): {kartu.gpTeks ?? "—"}</span>
        <span>GP setelah realokasi (Rp): {kartu.gpPostRealokasiTeks ?? "—"}</span>
      </div>
      <p className="text-label text-ink-48">
        {d.barisBiaya.length} baris biaya · {d.invoices.length} invoice —{" "}
        <Link href={`/jobs/${d.job.id}`} className="text-accent">
          buka detail job
        </Link>
      </p>
    </div>
  );
}
