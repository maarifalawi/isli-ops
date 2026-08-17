import { HalamanJudul } from "@/components/master/primitives";
import { db } from "@/db/index";
import { jobs } from "@/db/schema/index";
import { daftarInvoicePelanggan } from "@/lib/invoice/index";
import { requireUser } from "@/lib/session/index";
import { and, eq, isNull } from "drizzle-orm";
import { PanelInvoice } from "./panel";

/*
 * Halaman Invoice Customer — Irisan 10 Item 6. Server component: daftar
 * invoice (join job+customer) + daftar job FINAL eligible untuk draft.
 * Semua nilai uang dikirim sebagai string bigint; KOMPONEN HANYA MEMFORMAT
 * (toLocaleString) — tidak ada hitungan uang di UI (pola Irisan 8).
 */

export const dynamic = "force-dynamic";

export default async function HalamanInvoice({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; customer?: string }>;
}) {
  const user = await requireUser();
  const { status: statusFilter, customer: customerFilter } = await searchParams;

  const [semua, jobFinal] = await Promise.all([
    daftarInvoicePelanggan(db),
    db
      .select({ id: jobs.id, jobNo: jobs.jobNo })
      .from(jobs)
      .where(and(eq(jobs.status, "FINAL"), isNull(jobs.deletedAt)))
      .orderBy(jobs.jobNo),
  ]);

  const invoices = semua
    .filter((i) => (statusFilter ? i.status === statusFilter : true))
    .filter((i) => (customerFilter ? i.customerId === customerFilter : true));

  return (
    <div>
      <HalamanJudul
        judul="Invoice"
        keterangan="Invoice customer per job: draft (tanpa nomor) → terbit (nomor + pajak beku) → kirim → bayar. Nomor dialokasikan server saat terbit (R2); angka beku sejak terbit (I-INV-1)."
      />
      <PanelInvoice
        user={{ id: user.id, role: user.role }}
        jobFinal={jobFinal}
        invoices={invoices.map((i) => ({
          id: i.id,
          invoiceNo: i.invoiceNo,
          status: i.status,
          jobId: i.jobId,
          jobNo: i.jobNo,
          customerNama: i.customerNama,
          issueDate: i.issueDate,
          dueDate: i.dueDate,
          grandTotalIdr: i.grandTotalIdr?.toString() ?? null,
          dppIdr: i.dppIdr?.toString() ?? null,
          ppnIdr: i.ppnIdr?.toString() ?? null,
          pph23Applied: i.pph23Applied,
          pph23Idr: i.pph23Idr?.toString() ?? null,
        }))}
      />
    </div>
  );
}
