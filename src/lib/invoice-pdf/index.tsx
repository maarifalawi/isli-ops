/*
 * Render PDF invoice customer — Irisan 10 Item 9, ADR-0005 (Accepted).
 *
 * PRINSIP MUTLAK (ADR-0005 poin 3): SEMUA angka & terbilang pada PDF dibaca
 * dari kolom BEKU customer_invoices / invoice_lines (I-INV-1) — TIDAK ada
 * perhitungan apa pun di modul ini. Pemanggil (route) memformat BigInt →
 * string (display-only); modul ini hanya menaruh string ke layout.
 * Render on-demand; byte tidak disimpan (cetak ulang identik — ADR-0005).
 *
 * KOP (R12 — BELUM DIKETAHUI): NPWP, alamat, telepon, dan rekening bank ISLI
 * adalah PLACEHOLDER bertanda TODO. DILARANG mengisi tebakan — ganti hanya
 * setelah klien memberi data asli (lihat docs/OPEN-QUESTIONS.md R12).
 * Font: Helvetica bawaan @react-pdf/renderer — font brand menyusul bersama
 * kop asli (jangan menambah aset tebakan ke repo).
 */

import {
  Document,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from "@react-pdf/renderer";

/** Satu baris rincian (snapshot invoice_lines — urutan & angka beku). */
export interface BarisInvoicePdf {
  readonly urutan: number;
  readonly keterangan: string;
  readonly jumlahTeks: string;
}

/**
 * Data PDF — SEMUA string terformat. Tidak ada bigint/number uang di sini
 * supaya mustahil "tanpa sengaja menghitung" di dalam komponen.
 */
export interface DataInvoicePdf {
  readonly invoiceNo: string;
  readonly jobNo: string;
  readonly customerNama: string;
  readonly issueDate: string;
  readonly dueDate: string;
  readonly topDays: number | null;
  readonly subTotalTeks: string;
  readonly reimburseTeks: string;
  readonly dppTeks: string;
  readonly ppnTeks: string;
  readonly pph23Teks: string;
  readonly grandTotalTeks: string;
  /** Dari kolom terbilang yang tersimpan — BUKAN dihitung saat render. */
  readonly terbilang: string;
  readonly baris: readonly BarisInvoicePdf[];
}

const gaya = StyleSheet.create({
  halaman: { padding: 36, fontSize: 10, fontFamily: "Helvetica" },
  kopNama: { fontSize: 14, fontFamily: "Helvetica-Bold" },
  micro: { fontSize: 8, color: "#555555" },
  judul: { fontSize: 12, fontFamily: "Helvetica-Bold", marginTop: 12 },
  baris: { flexDirection: "row", justifyContent: "space-between", marginTop: 3 },
  label: { fontFamily: "Helvetica-Bold" },
  tabel: { marginTop: 10 },
  kepalaTabel: { flexDirection: "row", fontFamily: "Helvetica-Bold", fontSize: 9 },
  selNo: { width: 24 },
  selUraian: { flex: 1 },
  selJumlah: { width: 110, textAlign: "right" },
  barisTabel: { flexDirection: "row", fontSize: 9, marginTop: 2 },
  total: { flexDirection: "row", justifyContent: "space-between", marginTop: 4 },
  grand: { fontFamily: "Helvetica-Bold", fontSize: 11 },
  terbilang: { marginTop: 8, fontSize: 9, fontStyle: "italic" },
  ttd: { flexDirection: "row", justifyContent: "flex-end", marginTop: 28 },
});

function Baris({ label, nilai }: { label: string; nilai: string }) {
  return (
    <View style={gaya.baris}>
      <Text style={gaya.label}>{label}</Text>
      <Text>{nilai}</Text>
    </View>
  );
}

/** Dokumen PDF — murni layout; tidak membaca DB, tidak berhitung. */
export function InvoiceDocument({ data }: { data: DataInvoicePdf }) {
  return (
    <Document title={`Invoice ${data.invoiceNo}`}>
      <Page size="A4" style={gaya.halaman}>
        {/* TODO(R12): NPWP/alamat/telepon/rekening ISLI belum diketahui —
            placeholder, JANGAN diisi tebakan. */}
        <Text style={gaya.kopNama}>PT. INTEGRA SINERGI LOGITAMA INDONESIA</Text>
        <Text style={gaya.micro}>
          TODO(R12): alamat & telepon ISLI — menunggu data klien
        </Text>
        <Text style={gaya.micro}>TODO(R12): NPWP ISLI — menunggu data klien</Text>

        <Text style={gaya.judul}>INVOICE {data.invoiceNo}</Text>
        <Baris label="Kepada" nilai={data.customerNama} />
        <Baris label="Job" nilai={data.jobNo} />
        <Baris label="Tanggal" nilai={data.issueDate} />
        <Baris label="Jatuh tempo" nilai={data.dueDate} />
        <Baris label="TOP" nilai={data.topDays === null ? "—" : `${data.topDays} hari`} />

        <View style={gaya.tabel}>
          <View style={gaya.kepalaTabel}>
            <Text style={gaya.selNo}>No</Text>
            <Text style={gaya.selUraian}>Uraian</Text>
            <Text style={gaya.selJumlah}>Jumlah (Rp)</Text>
          </View>
          {data.baris.map((b) => (
            <View key={b.urutan} style={gaya.barisTabel} wrap={false}>
              <Text style={gaya.selNo}>{b.urutan}</Text>
              <Text style={gaya.selUraian}>{b.keterangan}</Text>
              <Text style={gaya.selJumlah}>{b.jumlahTeks}</Text>
            </View>
          ))}
        </View>

        <Baris label="Sub total" nilai={data.subTotalTeks} />
        <Baris label="Reimburse (at-cost)" nilai={data.reimburseTeks} />
        <Baris label="DPP" nilai={data.dppTeks} />
        <Baris label="PPN" nilai={data.ppnTeks} />
        <Baris label="PPh 23" nilai={data.pph23Teks} />
        <View style={gaya.total}>
          <Text style={gaya.grand}>TOTAL</Text>
          <Text style={gaya.grand}>{data.grandTotalTeks}</Text>
        </View>

        <Text style={gaya.terbilang}>{data.terbilang}</Text>

        {/* TODO(R12): rekening bank & penanggung jawab tanda tangan menyusul. */}
        <View style={gaya.ttd}>
          <Text>Hormat kami,{"\n\n\n\n"}( )</Text>
        </View>
      </Page>
    </Document>
  );
}

/** Render ke buffer — dipanggil route secara on-demand. */
export async function renderInvoicePdf(data: DataInvoicePdf): Promise<Buffer> {
  return renderToBuffer(<InvoiceDocument data={data} />);
}
