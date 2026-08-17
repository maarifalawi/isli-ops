import { db } from "@/db/index";
import { customerInvoices, customers, invoiceLines, jobs } from "@/db/schema/index";
import { type DataInvoicePdf, renderInvoicePdf } from "@/lib/invoice-pdf/index";
import { formatIdr, rupiah } from "@/lib/money/index";
import { requireUser } from "@/lib/session/index";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/*
 * GET /invoice/[id]/pdf — render on-demand dari kolom BEKU (ADR-0005).
 * RBAC: semua peran boleh melihat (report:view — sekelas laporan; mutasi
 * tetap lewat service). Hanya invoice TERBIT+ (DRAFT/BATAL tanpa nomor sah
 * tidak punya PDF). ?download=1 → attachment; default inline (preview).
 */

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireUser();
  void user; // autentikasi saja — semua peran boleh melihat invoice.
  const { id } = await params;

  const [inv] = await db
    .select({
      id: customerInvoices.id,
      invoiceNo: customerInvoices.invoiceNo,
      status: customerInvoices.status,
      issueDate: customerInvoices.issueDate,
      dueDate: customerInvoices.dueDate,
      topDays: customerInvoices.topDays,
      subTotalIdr: customerInvoices.subTotalIdr,
      reimburseIdr: customerInvoices.reimburseIdr,
      dppIdr: customerInvoices.dppIdr,
      ppnIdr: customerInvoices.ppnIdr,
      pph23Idr: customerInvoices.pph23Idr,
      grandTotalIdr: customerInvoices.grandTotalIdr,
      terbilang: customerInvoices.terbilang,
      jobId: customerInvoices.jobId,
      customerId: customerInvoices.customerId,
    })
    .from(customerInvoices)
    .where(eq(customerInvoices.id, id))
    .limit(1);
  if (!inv || !inv.invoiceNo) {
    return NextResponse.json({ error: "Invoice tidak ditemukan." }, { status: 404 });
  }
  if (inv.status === "DRAFT" || inv.status === "BATAL") {
    return NextResponse.json(
      { error: "Hanya invoice TERBIT ke atas yang punya PDF (I-INV-1)." },
      { status: 409 },
    );
  }

  const [job] = await db
    .select({ jobNo: jobs.jobNo })
    .from(jobs)
    .where(eq(jobs.id, inv.jobId))
    .limit(1);
  // Nama customer lewat join customers (identitas pelanggan, bukan angka).
  const [cust] = await db
    .select({ nama: customers.nama })
    .from(customers)
    .where(eq(customers.id, inv.customerId))
    .limit(1);

  const baris = await db
    .select({
      urutan: invoiceLines.urutan,
      keterangan: invoiceLines.keterangan,
      amountIdr: invoiceLines.amountIdr,
    })
    .from(invoiceLines)
    .where(eq(invoiceLines.invoiceId, id))
    .orderBy(invoiceLines.urutan);

  // Format display-only di server; modul PDF hanya menerima string.
  const data: DataInvoicePdf = {
    invoiceNo: inv.invoiceNo,
    jobNo: job?.jobNo ?? "-",
    customerNama: cust?.nama ?? "-",
    issueDate: String(inv.issueDate ?? "-"),
    dueDate: String(inv.dueDate ?? "-"),
    topDays: inv.topDays,
    subTotalTeks: formatIdr(rupiah(inv.subTotalIdr)),
    reimburseTeks: formatIdr(rupiah(inv.reimburseIdr)),
    dppTeks: formatIdr(rupiah(inv.dppIdr)),
    ppnTeks: formatIdr(rupiah(inv.ppnIdr)),
    pph23Teks: formatIdr(rupiah(inv.pph23Idr)),
    grandTotalTeks: formatIdr(rupiah(inv.grandTotalIdr)),
    terbilang: inv.terbilang ?? "",
    baris: baris.map((b) => ({
      urutan: b.urutan,
      keterangan: b.keterangan,
      jumlahTeks: formatIdr(rupiah(b.amountIdr)),
    })),
  };

  const buf = await renderInvoicePdf(data);
  const unduh = new URL(req.url).searchParams.get("download") === "1";
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `${unduh ? "attachment" : "inline"}; filename="${inv.invoiceNo}.pdf"`,
    },
  });
}
