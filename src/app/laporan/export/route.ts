/*
 * Route export Excel laporan — Irisan 8e.
 *
 * GET /laporan/export?dari=YYYY-MM&sampai=YYYY-MM&sumbu=customer
 * Mengikuti rentang dan sumbu yang sedang aktif di halaman laporan.
 * Wajib login + izin report:view (assertCan di server, bukan hanya UI).
 */

import { db } from "@/db/index";
import { can } from "@/lib/authz/index";
import { buatWorkbookLaporan } from "@/lib/laporan/export-excel";
import { parseRentangDariUrl, rentangKeLabel } from "@/lib/laporan/periode";
import type { SumbuPendapatan } from "@/lib/laporan/queries";
import { requireUser } from "@/lib/session/index";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const user = await requireUser();
  if (!can(user.role, "report:view")) {
    return NextResponse.json(
      { galat: "Anda tidak memiliki izin mengunduh laporan." },
      { status: 403 },
    );
  }

  const url = new URL(request.url);
  const rentang = parseRentangDariUrl(
    url.searchParams.get("dari") ?? "",
    url.searchParams.get("sampai") ?? "",
  );
  if (!rentang) {
    return NextResponse.json(
      {
        galat: "Rentang bulan tidak valid. Kembali ke halaman laporan dan pilih rentang.",
      },
      { status: 400 },
    );
  }

  const sumbuRaw = url.searchParams.get("sumbu") ?? "customer";
  const sumbu: SumbuPendapatan = (
    ["customer", "segmen", "sales", "rute"] as const
  ).includes(sumbuRaw as SumbuPendapatan)
    ? (sumbuRaw as SumbuPendapatan)
    : "customer";

  const buffer = await buatWorkbookLaporan(db, rentang, sumbu);
  const namaFile = `laporan-${rentangKeLabel(rentang)}-${sumbu}.xlsx`;

  return new NextResponse(buffer as ArrayBuffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${namaFile}"`,
    },
  });
}
