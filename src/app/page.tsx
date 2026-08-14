import { db } from "@/db/index";
import { customers, jobs } from "@/db/schema/index";
import { can } from "@/lib/authz/index";
import { formatIdr, fromDb } from "@/lib/money/index";
import { requireUser } from "@/lib/session/index";
import { eq, isNull } from "drizzle-orm";

/*
 * Irisan 0 -- sekarang butuh login (requireUser melempar ke /login kalau
 * belum). Kolom GP TETAP belum ditampilkan di sini -- itu baru masuk Irisan
 * 4 bersama costing sungguhan. Guard `can(user.role, "job:view_margin")`
 * disiapkan di sini supaya saat kolom GP ditambahkan nanti, developer
 * berikutnya tidak lupa memeriksanya -- lihat authz/index.ts.
 */

export const dynamic = "force-dynamic";

export default async function Halaman() {
  const user = await requireUser();
  const bolehLihatMargin = can(user.role, "job:view_margin");

  const baris = await db
    .select({
      id: jobs.id,
      jobNo: jobs.jobNo,
      rute: jobs.rute,
      vessel: jobs.vessel,
      etd: jobs.etd,
      status: jobs.status,
      sellingIdr: jobs.sellingIdr,
      customerNama: customers.nama,
    })
    .from(jobs)
    .innerJoin(customers, eq(jobs.customerId, customers.id))
    .where(isNull(jobs.deletedAt))
    .orderBy(jobs.tahun, jobs.bulan, jobs.running);

  return (
    <section>
      <div className="flex items-baseline justify-between">
        <h1 className="text-title">Daftar Job</h1>
        <div className="flex items-center gap-3">
          <span className="text-label text-ink-48">
            {user.nama} · {user.role}
          </span>
          <form action="/logout" method="post">
            <button
              type="submit"
              className="min-h-touch border border-divider px-3 text-label text-ink-80"
            >
              Keluar
            </button>
          </form>
        </div>
      </div>
      <p className="mt-1 text-label text-ink-48">
        {baris.length} job · nilai dalam rupiah
        {!bolehLihatMargin && " \u00b7 margin tersembunyi untuk peran Anda"}
      </p>

      {baris.length === 0 ? (
        <p className="mt-6 text-body text-ink-48">
          Belum ada job. Jalankan <code>pnpm db:seed</code> untuk mengisi data contoh.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-parchment">
                <Th>No Job</Th>
                <Th>Customer</Th>
                <Th>Rute</Th>
                <Th>Vessel</Th>
                <Th>ETD</Th>
                <Th>Status</Th>
                <Th align="right">Selling</Th>
              </tr>
            </thead>
            <tbody>
              {baris.map((b) => (
                <tr key={b.id} className="border-b border-divider">
                  <Td>{b.jobNo}</Td>
                  <Td>{b.customerNama}</Td>
                  <Td>{b.rute ?? "\u2014"}</Td>
                  <Td>{b.vessel ?? "\u2014"}</Td>
                  <Td>{b.etd ?? "\u2014"}</Td>
                  <Td>{b.status}</Td>
                  <td
                    className="num px-3 py-2 text-body"
                    data-testid={`job-selling-${b.jobNo}`}
                  >
                    {formatIdr(fromDb(b.sellingIdr))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function Th({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
}) {
  return (
    <th
      className={`px-3 py-2 text-micro uppercase text-ink-48 ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return <td className="px-3 py-2 text-body">{children}</td>;
}
