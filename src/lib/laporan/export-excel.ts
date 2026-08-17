/*
 * Export Excel laporan — Irisan 8e (exceljs, sudah di TOOLCHAIN/package.json).
 *
 * Mengikuti rentang dan sumbu yang sedang AKTIF (BUILD-PLAN 8e): parameter
 * dipakai apa adanya dari URL halaman laporan. Angka ditulis sebagai NUMBER
 * penuh (bukan string) supaya bisa dijumlah di Excel; bigint rupiah
 * dikonversi via BigInt → number HANYA karena exceljs memakai number IEEE754
 * — nilai ISLI (maks ~2,1 miliar) jauh di bawah 2^53, aman. Kolom teks
 * tetap teks. Negatif ditulis apa adanya; Excel menampilkan minus.
 *
 * Tidak ada perhitungan baru — semua nilai dari queries.ts (sumber tunggal).
 */

import { formatIdr } from "@/lib/money/index";
import ExcelJS from "exceljs";
import { type RentangBulan, rentangKeLabel } from "./periode";
import {
  type SumbuPendapatan,
  dashboardGp,
  peringkatDariRingkasan,
  rekapPajakPerBulan,
  rekapVendorPerBulan,
  ringkasanJobDalamRentang,
} from "./queries";
import type { DbOrTx } from "./queries";

const NAMA_BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
] as const;

const SUMBU_LABEL: Record<SumbuPendapatan, string> = {
  customer: "Customer",
  segmen: "Segmen",
  sales: "Sales",
  rute: "Rute",
};

function judulSheetSumbu(s: SumbuPendapatan): string {
  return `Peringkat ${SUMBU_LABEL[s]}`;
}

/** bigint → number untuk exceljs (aman < 2^53; konteks ISLI maks miliaran). */
function keAngka(v: bigint): number {
  return Number(v);
}

export async function buatWorkbookLaporan(
  dbOrTx: DbOrTx,
  rentang: RentangBulan,
  sumbu: SumbuPendapatan,
): Promise<ExcelJS.Buffer> {
  const [dash, ringkasan, rekapVendor, rekapPajak] = await Promise.all([
    dashboardGp(dbOrTx, rentang),
    ringkasanJobDalamRentang(dbOrTx, rentang),
    rekapVendorPerBulan(dbOrTx, rentang),
    rekapPajakPerBulan(dbOrTx, rentang),
  ]);
  const peringkat = peringkatDariRingkasan(ringkasan, sumbu);

  const wb = new ExcelJS.Workbook();
  wb.creator = "ISLI Ops";
  wb.created = new Date();
  const labelRentang = rentangKeLabel(rentang);

  /* ---------- Sheet 1: Dashboard GP bulan × segmen ---------- */
  const shDash = wb.addWorksheet("Dashboard GP");
  shDash.addRow([`Dashboard GP — rentang ${labelRentang}`]);
  shDash.mergeCells(1, 1, 1, 7);
  shDash.getRow(1).font = { bold: true };
  shDash.addRow([]);
  shDash.addRow([
    "Bulan",
    "Segmen",
    "Job",
    "Job Berangka",
    "Selling (Rp)",
    "Cost (Rp)",
    "GP (Rp)",
    "GP%",
  ]);
  for (const r of dash) {
    shDash.addRow([
      `${NAMA_BULAN[r.bulan - 1]} ${r.tahun}`,
      r.segmen,
      r.jumlahJob,
      r.jumlahJobBerangka,
      keAngka(r.totalSelling),
      keAngka(r.totalCost),
      keAngka(r.totalGp),
      r.gpPersen ?? "—",
    ]);
  }
  lebar(shDash, [16, 10, 8, 12, 18, 18, 18, 8]);
  formatRp(shDash, [5, 6, 7]);

  /* ---------- Sheet 2: Peringkat sumbu aktif ---------- */
  const shPeringkat = wb.addWorksheet(judulSheetSumbu(sumbu).slice(0, 31));
  shPeringkat.addRow([`${judulSheetSumbu(sumbu)} — rentang ${labelRentang}`]);
  shPeringkat.mergeCells(1, 1, 1, 8);
  shPeringkat.getRow(1).font = { bold: true };
  shPeringkat.addRow([]);
  shPeringkat.addRow([
    SUMBU_LABEL[sumbu],
    "Job",
    "Selling (Rp)",
    "Cost (Rp)",
    "GP (Rp)",
    "GP%",
    "Pertama",
    "Terakhir",
  ]);
  for (const r of peringkat) {
    shPeringkat.addRow([
      r.label,
      r.jumlahJob,
      keAngka(r.totalSelling),
      keAngka(r.totalCost),
      keAngka(r.totalGp),
      r.gpPersen ?? "—",
      r.tanggalPertama ?? "—",
      r.tanggalTerakhir ?? "—",
    ]);
  }
  lebar(shPeringkat, [28, 8, 18, 18, 18, 8, 10, 10]);
  formatRp(shPeringkat, [3, 4, 5]);

  /* ---------- Sheet 3: Rekap vendor (R7.3) ---------- */
  const shVendor = wb.addWorksheet("Rekap Vendor");
  shVendor.addRow([`Rekap pembayaran vendor (hanya DIBAYAR) — rentang ${labelRentang}`]);
  shVendor.mergeCells(1, 1, 1, 5);
  shVendor.getRow(1).font = { bold: true };
  shVendor.addRow([]);
  shVendor.addRow(["Vendor", "Bulan", "Invoice", "Dibayar (Rp)", "PPh 23 (Rp)"]);
  for (const r of rekapVendor) {
    shVendor.addRow([
      r.vendorNama,
      `${NAMA_BULAN[r.bulan - 1]} ${r.tahun}`,
      r.jumlahInvoice,
      keAngka(r.totalDibayar),
      keAngka(r.totalPph23),
    ]);
  }
  lebar(shVendor, [28, 14, 10, 18, 18]);
  formatRp(shVendor, [4, 5]);

  /* ---------- Sheet 4: Rekap pajak ---------- */
  const shPajak = wb.addWorksheet("Rekap Pajak");
  shPajak.addRow([`Rekap pajak invoice customer (TERBIT+) — rentang ${labelRentang}`]);
  shPajak.mergeCells(1, 1, 1, 6);
  shPajak.getRow(1).font = { bold: true };
  shPajak.addRow([]);
  shPajak.addRow([
    "Bulan Terbit",
    "Invoice",
    "DPP (Rp)",
    "PPN 1,1% (Rp)",
    "PPh 23 (Rp)",
    "Grand Total (Rp)",
  ]);
  for (const r of rekapPajak) {
    shPajak.addRow([
      `${NAMA_BULAN[r.bulan - 1]} ${r.tahun}`,
      r.jumlahInvoice,
      keAngka(r.totalDpp),
      keAngka(r.totalPpn),
      keAngka(r.totalPph23),
      keAngka(r.totalGrandTotal),
    ]);
  }
  lebar(shPajak, [14, 10, 18, 16, 16, 18]);
  formatRp(shPajak, [3, 4, 5, 6]);

  return wb.xlsx.writeBuffer();
}

function lebar(sheet: ExcelJS.Worksheet, kolom: number[]) {
  kolom.forEach((w, i) => {
    sheet.getColumn(i + 1).width = w;
  });
}

/** Format pemisah ribuan pada kolom rupiah (angka tetap number). */
function formatRp(sheet: ExcelJS.Worksheet, kolom: number[]) {
  for (const c of kolom) {
    sheet.getColumn(c).numFmt = "#,##0";
  }
}

/* Dipakai halaman untuk pratinjau teks (opsional, tidak wajib). */
export { formatIdr };
