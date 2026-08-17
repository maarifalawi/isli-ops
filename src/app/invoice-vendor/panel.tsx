"use client";

/*
 * Panel invoice vendor — Irisan 10 Item 5.
 *
 * Hard requirement HANDOFF-IRISAN-7 yang ditegakkan di sini:
 *   V-INV-2: saat user memilih vendor & mengetik nomor, actionCekNomorMirip
 *   dipanggil debounced — peringatan MIRIP tampil SEBELUM tombol Simpan
 *   berarti apa pun (tetap boleh simpan; 01A vs 01B memang dua nomor sah).
 *   V-INV-3: tombol "Bayar" HANYA dirender setelah user mengklik "Lihat
 *   status" dan snapshot terpampang (gating.ts — dikunci unit test).
 */

import { PesanHasil, TombolPill, kelasInput } from "@/components/master/primitives";
import {
  type HasilVendorInvoiceAction,
  actionBayarInvoiceVendor,
  actionCekNomorMirip,
  actionLihatStatusPembayaran,
  actionTerimaInvoiceVendor,
} from "@/lib/actions/vendor-invoice";
import type { Role } from "@/lib/authz/index";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { bolehTampilTombolBayar, harusRetryOtomatis } from "./gating";

type InvoiceUi = {
  id: string;
  vendorInvoiceNo: string;
  tanggalInvoice: string;
  jumlahIdr: string;
  pph23Idr: string;
  status: string;
  diterimaOleh: string | null;
};

function formatRp(nilai: string): string {
  try {
    return BigInt(nilai).toLocaleString("id-ID");
  } catch {
    return nilai;
  }
}

export function PanelInvoiceVendor({
  user,
  vendors,
  vendorId,
  invoices,
}: {
  user: { id: string; role: Role };
  vendors: { id: string; nama: string }[];
  vendorId: string | null;
  invoices: InvoiceUi[];
}) {
  const router = useRouter();

  // Opsi D (Irisan 10 Item 5): navigasi PENUH ke URL dengan vendor yang sama,
  // BUKAN router.refresh(). Alasan: refresh RSC yang masih in-flight membuat
  // server action debounce (actionCekNomorMirip) tak pernah resolve saat
  // keduanya berlomba — terbukti di e2e mobile. Navigasi replace me-remount
  // panel bersih dengan data server terbaru tanpa race.
  function muatUlang() {
    router.replace(`/invoice-vendor?vendor=${vendorId ?? ""}`);
  }

  return (
    <div className="space-y-6">
      <form method="get" className="flex items-end gap-3">
        <label className="block">
          <span className="mb-1 block text-micro uppercase text-ink-48">Vendor</span>
          <select name="vendor" defaultValue={vendorId ?? ""} className={kelasInput}>
            <option value="">— pilih vendor —</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>
                {v.nama}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="min-h-touch rounded-full border border-hairline px-4 text-label"
        >
          Tampilkan
        </button>
      </form>

      {vendorId ? (
        <>
          <FormTerima vendorId={vendorId} onSelesai={muatUlang} />
          <TabelInvoice user={user} invoices={invoices} onSelesai={muatUlang} />
        </>
      ) : (
        <p className="text-body text-ink-48">
          Pilih vendor untuk melihat dan menerima invoice.
        </p>
      )}
    </div>
  );
}

/** Form terima invoice — V-INV-2: peringatan nomor mirip real-time sebelum submit. */
function FormTerima({
  vendorId,
  onSelesai,
}: { vendorId: string; onSelesai: () => void }) {
  const [nomor, setNomor] = useState("");
  const [mirip, setMirip] = useState<string[]>([]);
  const [cekGagal, setCekGagal] = useState(false);
  const [hasil, formAction, pending] = useActionState(
    async (
      _prev: Awaited<ReturnType<typeof actionTerimaInvoiceVendor>> | null,
      fd: FormData,
    ) => {
      const res = await actionTerimaInvoiceVendor(fd);
      if (res.ok) {
        setNomor("");
        setMirip([]);
        onSelesai();
      }
      return res;
    },
    null,
  );

  // V-INV-2: debounce 400ms — peringatan tampil SEBELUM user menekan Simpan.
  // Gagal cek TIDAK ditelan diam-diam: retry otomatis 1x, lalu status gagal
  // yang terlihat + tombol coba ulang — supaya "tanpa peringatan" tidak
  // pernah disalahartikan sebagai "nomor aman" (perbaikan A2-1).
  useEffect(() => {
    const n = nomor.trim();
    if (n === "") {
      setMirip([]);
      setCekGagal(false);
      return;
    }
    let dibatalkan = false;
    const jalankan = async (percobaanGagal: number): Promise<void> => {
      try {
        const hasil = await actionCekNomorMirip(vendorId, n);
        if (dibatalkan) return;
        setMirip(hasil);
        setCekGagal(false);
      } catch {
        if (dibatalkan) return;
        if (harusRetryOtomatis(percobaanGagal)) {
          await jalankan(percobaanGagal + 1);
          return;
        }
        setMirip([]);
        setCekGagal(true);
      }
    };
    const t = setTimeout(() => void jalankan(0), 400);
    return () => {
      dibatalkan = true;
      clearTimeout(t);
    };
  }, [nomor, vendorId]);

  async function cobaUlangCek() {
    setCekGagal(false);
    try {
      setMirip(await actionCekNomorMirip(vendorId, nomor.trim()));
    } catch {
      setMirip([]);
      setCekGagal(true);
    }
  }

  return (
    <section className="max-w-2xl rounded border border-hairline bg-pearl p-4">
      <h2 className="mb-3 text-label font-medium">Terima invoice vendor</h2>
      <form action={formAction} className="space-y-3">
        <input type="hidden" name="vendorId" value={vendorId} />
        <label className="block">
          <span className="mb-1 block text-micro uppercase text-ink-48">
            Nomor invoice (persis seperti di kertas)
          </span>
          <input
            name="vendorInvoiceNo"
            required
            value={nomor}
            onChange={(e) => setNomor(e.target.value)}
            className={kelasInput}
            placeholder="mis. 01A"
          />
        </label>
        {mirip.length > 0 ? (
          <output
            data-testid="peringatan-nomor-mirip"
            className="block rounded border border-hairline px-3 py-2 text-label"
            style={{ color: "#c93400" }}
          >
            Perhatian: nomor mirip sudah terdaftar untuk vendor ini — periksa kertas
            sebelum menyimpan (jangan dobel bayar): {mirip.join(", ")}
          </output>
        ) : null}
        {cekGagal ? (
          <output
            data-testid="cek-nomor-gagal"
            className="block rounded border border-hairline px-3 py-2 text-label"
            style={{ color: "#c93400" }}
          >
            Gagal memeriksa nomor mirip — keamanan dobel-bayar belum terverifikasi.{" "}
            <button type="button" onClick={cobaUlangCek} className="underline">
              Coba ulang pemeriksaan
            </button>
          </output>
        ) : null}
        <div className="flex gap-3">
          <label className="block">
            <span className="mb-1 block text-micro uppercase text-ink-48">
              Tanggal invoice
            </span>
            <input name="tanggalInvoice" type="date" required className={kelasInput} />
          </label>
          <label className="block">
            <span className="mb-1 block text-micro uppercase text-ink-48">
              Jumlah (Rp)
            </span>
            <input
              name="jumlahIdr"
              type="number"
              min={1}
              step={1}
              required
              className={`${kelasInput} text-right tabular-nums`}
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-micro uppercase text-ink-48">
              PPh 23 (Rp, opsional)
            </span>
            <input
              name="pph23Idr"
              type="number"
              min={0}
              step={1}
              className={`${kelasInput} text-right tabular-nums`}
            />
          </label>
        </div>
        <TombolPill>{pending ? "Menyimpan…" : "Simpan"}</TombolPill>
        <PesanHasil hasil={hasil} />
      </form>
    </section>
  );
}

/** Baris invoice + aksi — V-INV-3: tombol Bayar hanya setelah "Lihat status". */
function TabelInvoice({
  user,
  invoices,
  onSelesai,
}: {
  user: { id: string; role: Role };
  invoices: InvoiceUi[];
  onSelesai: () => void;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-parchment">
            <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
              Nomor
            </th>
            <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
              Tanggal
            </th>
            <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
              Jumlah
            </th>
            <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
              PPh 23
            </th>
            <th className="px-3 py-2 text-left text-micro uppercase text-ink-48">
              Status
            </th>
            <th className="px-3 py-2 text-right text-micro uppercase text-ink-48">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody>
          {invoices.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-3 py-6 text-body text-ink-48">
                Belum ada invoice untuk vendor ini.
              </td>
            </tr>
          ) : (
            invoices.map((inv) => (
              <BarisInvoice key={inv.id} user={user} inv={inv} onSelesai={onSelesai} />
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

function BarisInvoice({
  user,
  inv,
  onSelesai,
}: {
  user: { id: string; role: Role };
  inv: InvoiceUi;
  onSelesai: () => void;
}) {
  const [statusDimuat, setStatusDimuat] = useState(false);
  const [snapshot, setSnapshot] = useState<{
    status: string;
    jumlahIdr: string;
    dibayarAt: string | null;
  } | null>(null);
  const [hasil, formAction, pending] = useActionState(
    async (_prev: HasilVendorInvoiceAction | null, fd: FormData) => {
      const res = await actionBayarInvoiceVendor(fd);
      if (res.ok) {
        setStatusDimuat(false);
        setSnapshot(null);
        onSelesai();
      }
      return res;
    },
    null,
  );

  async function lihatStatus() {
    const s = await actionLihatStatusPembayaran(inv.id);
    if (s) {
      setSnapshot({ status: s.status, jumlahIdr: s.jumlahIdr, dibayarAt: s.dibayarAt });
    }
    setStatusDimuat(true);
  }

  const bolehBayar = bolehTampilTombolBayar(user.role, statusDimuat);

  return (
    <>
      <tr className="border-b border-divider">
        <td className="px-3 py-2 text-body">{inv.vendorInvoiceNo}</td>
        <td className="px-3 py-2 text-body tabular-nums">{inv.tanggalInvoice}</td>
        <td className="px-3 py-2 text-right text-body tabular-nums">
          {formatRp(inv.jumlahIdr)}
        </td>
        <td className="px-3 py-2 text-right text-body tabular-nums">
          {formatRp(inv.pph23Idr)}
        </td>
        <td className="px-3 py-2 text-body">
          {snapshot ? (
            <span data-testid={`snapshot-status-${inv.vendorInvoiceNo}`}>
              {snapshot.status}
              {snapshot.dibayarAt ? ` · dibayar ${snapshot.dibayarAt.slice(0, 10)}` : ""}
            </span>
          ) : (
            inv.status
          )}
        </td>
        <td className="px-3 py-2 text-right">
          <div className="flex flex-wrap justify-end gap-1">
            {inv.status !== "DIBAYAR" && inv.status !== "DIBATALKAN" ? (
              <button
                type="button"
                onClick={lihatStatus}
                data-testid={`lihat-status-${inv.vendorInvoiceNo}`}
                className="min-h-touch rounded-full border border-hairline px-3 text-label text-accent"
              >
                Lihat status
              </button>
            ) : null}
            {bolehBayar && snapshot?.status === "DIVERIFIKASI" ? (
              <form action={formAction}>
                <input type="hidden" name="vendorInvoiceId" value={inv.id} />
                <button
                  type="submit"
                  data-testid={`bayar-${inv.vendorInvoiceNo}`}
                  disabled={pending}
                  className="min-h-touch rounded-full bg-accent px-4 text-label font-medium text-white active:scale-95"
                >
                  {pending ? "Memproses…" : "Bayar"}
                </button>
              </form>
            ) : null}
          </div>
          {hasil && !hasil.ok ? (
            <output className="mt-1 block text-micro" style={{ color: "#d70015" }}>
              {hasil.error}
            </output>
          ) : null}
        </td>
      </tr>
    </>
  );
}
