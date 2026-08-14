/*
 * Penomoran job dan invoice.
 *
 * Job:     ISLI-{YY}.{MM}-{NNN}  + akhiran opsional (EXP) (IMP) (AF) (SEAFREIGHT)
 * Invoice: {NNN}-{INVDOM|INVEXP|INVIMP}/{JobNo}/{RomawiBulan}/{YYYY}
 *
 * TEMUAN PENTING DARI DATA ASLI: ada 16 tabrakan nomor job di berkas Excel.
 * Penyebabnya bukan kesalahan input — DOM, EXP, dan IMP memakai tiga counter
 * yang berjalan sendiri-sendiri, jadi ISLI-26.06-007 bisa muncul dua kali
 * dengan arti berbeda.
 *
 * Karena itu kunci unik di database adalah (seq_scope, year, month, running),
 * BUKAN job_no. Kalau job_no dijadikan UNIQUE, migrasi data historis akan
 * gagal dan 16 job asli tidak bisa dimasukkan.
 */

export const SEQ_SCOPES = ["DOM", "EXP", "IMP"] as const;
export type SeqScope = (typeof SEQ_SCOPES)[number];

export const JOB_SUFFIXES = ["EXP", "IMP", "AF", "SEAFREIGHT"] as const;
export type JobSuffix = (typeof JOB_SUFFIXES)[number];

export const ROMAWI = [
  "I",
  "II",
  "III",
  "IV",
  "V",
  "VI",
  "VII",
  "VIII",
  "IX",
  "X",
  "XI",
  "XII",
] as const;

export type JobNumberParts = {
  readonly year: number; // 4 digit, contoh 2026
  readonly month: number; // 1-12
  readonly running: number; // 1-999
  readonly suffix?: JobSuffix;
};

const JOB_NO_PATTERN = /^ISLI-(\d{2})\.(\d{2})-(\d{3})(?:\((EXP|IMP|AF|SEAFREIGHT)\))?$/;

export function formatJobNumber(parts: JobNumberParts): string {
  const { year, month, running, suffix } = parts;

  if (month < 1 || month > 12) {
    throw new RangeError(`Bulan harus 1-12, diterima ${month}.`);
  }
  if (running < 1 || running > 999) {
    throw new RangeError(
      `Nomor urut harus 1-999, diterima ${running}. Kalau satu bulan benar-benar melewati 999 job, formatnya perlu ADR baru.`,
    );
  }

  const yy = String(year % 100).padStart(2, "0");
  const mm = String(month).padStart(2, "0");
  const nnn = String(running).padStart(3, "0");
  const tail = suffix ? `(${suffix})` : "";

  return `ISLI-${yy}.${mm}-${nnn}${tail}`;
}

export function parseJobNumber(jobNo: string): JobNumberParts | null {
  const match = JOB_NO_PATTERN.exec(jobNo.trim());
  if (!match) return null;

  const [, yy, mm, nnn, suffix] = match;
  if (yy === undefined || mm === undefined || nnn === undefined) return null;

  const base: JobNumberParts = {
    year: 2000 + Number(yy),
    month: Number(mm),
    running: Number(nnn),
  };

  return suffix === undefined ? base : { ...base, suffix: suffix as JobSuffix };
}

export type InvoiceType = "INVDOM" | "INVEXP" | "INVIMP";

export function invoiceTypeForScope(scope: SeqScope): InvoiceType {
  switch (scope) {
    case "DOM":
      return "INVDOM";
    case "EXP":
      return "INVEXP";
    case "IMP":
      return "INVIMP";
  }
}

export type InvoiceNumberParts = {
  readonly running: number;
  readonly invoiceType: InvoiceType;
  readonly jobNo: string;
  readonly issueMonth: number; // 1-12
  readonly issueYear: number; // 4 digit
};

/**
 * @example
 * formatInvoiceNumber({ running: 17, invoiceType: "INVDOM",
 *   jobNo: "ISLI-26.06-012", issueMonth: 7, issueYear: 2026 })
 * // => "017-INVDOM/ISLI-26.06-012/VII/2026"
 *
 * CATATAN: INVIMP belum punya contoh nyata dari klien. Formatnya diasumsikan
 * sama dengan dua lainnya — lihat pertanyaan B2. Kalau ternyata berbeda,
 * yang berubah hanya fungsi ini.
 */
export function formatInvoiceNumber(parts: InvoiceNumberParts): string {
  const { running, invoiceType, jobNo, issueMonth, issueYear } = parts;

  if (issueMonth < 1 || issueMonth > 12) {
    throw new RangeError(`Bulan terbit harus 1-12, diterima ${issueMonth}.`);
  }

  const nnn = String(running).padStart(3, "0");
  const romawi = ROMAWI[issueMonth - 1];
  if (romawi === undefined) {
    throw new RangeError(`Bulan ${issueMonth} tidak punya angka romawi.`);
  }

  return `${nnn}-${invoiceType}/${jobNo}/${romawi}/${issueYear}`;
}

/** Termin pembayaran menurut jenis job. Sumber: dua invoice asli. */
export function paymentTermDays(scope: SeqScope): number {
  return scope === "DOM" ? 30 : 14;
}

/**
 * Jatuh tempo invoice.
 *
 * PERINGATAN: tanggal dasar masih dipertanyakan. Berkas Excel memakai tiga
 * rumus berbeda (U12=T12+2, U14=T14+1, W14=(U14+V14)+3) dan belum jelas mana
 * yang benar — lihat pertanyaan B1. Sementara ini dihitung dari tanggal terbit
 * invoice, memakai HARI KALENDER, bukan hari kerja (pertanyaan B1 juga).
 *
 * Kalau jawabannya ternyata hari kerja, yang berubah hanya fungsi ini.
 */
export function computeDueDate(issueDate: Date, scope: SeqScope): Date {
  const due = new Date(issueDate);
  due.setDate(due.getDate() + paymentTermDays(scope));
  return due;
}
