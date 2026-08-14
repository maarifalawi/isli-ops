/*
 * Skema database ISLI Ops.
 *
 * CATATAN VERSI: sintaks extra-config Drizzle berubah antar versi mayor.
 * Berkas ini memakai bentuk callback yang mengembalikan OBJEK. Kalau `pnpm
 * db:generate` mengeluh, cek versi drizzle-orm terpasang sebelum mengubah
 * apa pun — masalahnya sintaks, bukan desain tabelnya.
 *
 * Semua nilai uang BIGINT rupiah bulat. Tidak ada numeric, tidak ada decimal.
 */

import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

// ---------------------------------------------------------------------------
// Enum
// ---------------------------------------------------------------------------

export const roleEnum = pgEnum("role", ["OWNER", "MANAGER", "STAFF"]);

export const seqScopeEnum = pgEnum("seq_scope", ["DOM", "EXP", "IMP"]);

/**
 * Status job. Urutannya mengikuti alur yang dijelaskan Pak Indra:
 * maker → approval 1 (manajer) → approval final (Pak Indra).
 *
 * DIBUKA_KEMBALI tidak ada sebagai status tersendiri — membuka kunci
 * mengembalikan job ke DRAFT dan menaikkan approval.cycle, sesuai kalimat
 * Pak Indra: "semua orang mesti mulai prosesnya dari awal lagi."
 */
export const jobStatusEnum = pgEnum("job_status", [
  "DRAFT",
  "DIAJUKAN",
  "DISETUJUI_1",
  "FINAL",
  "DIBATALKAN",
]);

export const invoiceStatusEnum = pgEnum("invoice_status", [
  "DRAFT",
  "TERBIT",
  "TERKIRIM",
  "LUNAS",
  "BATAL",
]);

export const invoiceAddendumStatusEnum = pgEnum("invoice_addendum_status", [
  "DRAFT",
  "DISETUJUI",
  "ISSUED",
]);

export const vendorInvoiceStatusEnum = pgEnum("vendor_invoice_status", [
  "DITERIMA",
  "DIVERIFIKASI",
  "DIBAYAR",
  "DIBATALKAN",
]);

export const serviceTypeEnum = pgEnum("service_type", ["FCL", "LCL", "AF"]);

export const chargeCodeKategoriEnum = pgEnum("charge_code_kategori", [
  "FIXED",
  "OPSIONAL",
]);

export const reopenRequestStatusEnum = pgEnum("reopen_request_status", [
  "DIAJUKAN",
  "DISETUJUI",
  "DITOLAK",
]);

// ---------------------------------------------------------------------------
// Pengguna
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull().unique(),
  nama: text("nama").notNull(),
  role: roleEnum("role").notNull().default("STAFF"),
  aktif: boolean("aktif").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Master data
// ---------------------------------------------------------------------------

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  nama: text("nama").notNull(),
  /** NPWP diisi user, bukan diimpor. Boleh kosong sampai dibutuhkan invoice. */
  npwp: text("npwp"),
  alamat: text("alamat"),
  /** Termin default. Domestik 30, EXIM 14 — bisa ditimpa per job. */
  topHari: integer("top_hari").notNull().default(30),
  /**
   * Apakah customer ini memotong PPh 23 atas invoice ISLI.
   * Diisi manual. Aturannya belum diketahui — lihat pertanyaan A1.
   */
  pph23Default: boolean("pph23_default").notNull().default(false),
  aktif: boolean("aktif").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const vendors = pgTable("vendors", {
  id: uuid("id").primaryKey().defaultRandom(),
  nama: text("nama").notNull(),
  npwp: text("npwp"),
  /** Apakah ISLI memotong PPh 23 saat membayar vendor ini. */
  pph23Default: boolean("pph23_default").notNull().default(false),
  aktif: boolean("aktif").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

/**
 * Kode biaya. 43 kode ditemukan di data historis.
 *
 * Bukan enum, karena Bu Niken harus bisa menambah kode baru tanpa menunggu
 * developer. Kalau ini enum, tiap kode baru butuh migrasi database dan rilis.
 */
export const chargeCodes = pgTable("charge_codes", {
  kode: text("kode").primaryKey(),
  keterangan: text("keterangan").notNull(),
  /** Baris reimburse dikecualikan dari DPP saat menghitung pajak. */
  defaultReimburse: boolean("default_reimburse").notNull().default(false),
  /*
   * R15.3 — apakah kode biaya ini WAJIB menyebut vendor.
   *
   * Kewajiban vendor tidak sama untuk semua kode. Contoh dari job
   * ISLI-26.08-005: MATERAI 29.000 dan HANDLING OPS 100.000 tampaknya biaya
   * internal tanpa vendor, sedangkan OF ICON 9.577.000 jelas punya vendor.
   *
   * Default true — lebih aman ketat lalu dilonggarkan daripada sebaliknya.
   *
   * ⚠️ Q64 BELUM DIJAWAB: dari 43 kode biaya, mana saja yang boleh tanpa
   * vendor? Sampai Bu Niken menjawab, semua kode dianggap butuh vendor.
   */
  butuhVendor: boolean("butuh_vendor").notNull().default(true),
  /*
   * Transkrip 2 (13 Agu 2026): OF, BL, THC, LSS, trucking, dooring, segel
   * "sudah fix, pasti muncul di setiap job". Biaya seperti uang makan supir,
   * biaya timbang, additional freight, biaya pindah alamat itu OPSIONAL --
   * boleh diinput bebas per job, tidak wajib ada.
   *
   * Default OPSIONAL (bukan FIXED) -- lebih aman menganggap kode baru sebagai
   * ad-hoc sampai ada yang menandainya FIXED secara sengaja, daripada diam-diam
   * mewajibkan kode yang sebenarnya jarang dipakai.
   */
  kategori: chargeCodeKategoriEnum("kategori").notNull().default("OPSIONAL"),
  aktif: boolean("aktif").notNull().default(true),
});

// ---------------------------------------------------------------------------
// Job
// ---------------------------------------------------------------------------

export const jobs = pgTable(
  "jobs",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // --- penomoran ---
    seqScope: seqScopeEnum("seq_scope").notNull(),
    tahun: integer("tahun").notNull(),
    bulan: integer("bulan").notNull(),
    running: integer("running").notNull(),
    /** Bentuk tampilan, diturunkan. Sengaja TIDAK unik — lihat indeks di bawah. */
    jobNo: text("job_no").notNull(),
    suffix: text("suffix"),

    // --- pihak ---
    customerId: uuid("customer_id")
      .notNull()
      .references(() => customers.id),

    // --- tiga segmen. Inti model bisnis Pak Indra. ---
    legTrucking: boolean("leg_trucking").notNull().default(false),
    legFreight: boolean("leg_freight").notNull().default(false),
    legDelivery: boolean("leg_delivery").notNull().default(false),

    /*
     * R10 — alasan kalau kombinasi leg menyimpang dari default.
     *
     * Job domestik default tercentang 1+2+3. Boleh diubah, TAPI harus
     * beralasan, dan alasannya masuk audit_log.
     *
     * Kenapa tidak diblokir keras: Pak Indra bilang domestik "MOSTLY
     * door-to-door". Kata "mostly" bukan "selalu". Sistem yang memblokir
     * kejadian nyata mengajari orang berbohong kepadanya — staf akan
     * mencentang leg 1 lalu mengisi biaya Rp 0, dan data rusak tanpa jejak.
     */
    legOverrideAlasan: text("leg_override_alasan"),

    // --- rincian pengiriman ---
    serviceType: serviceTypeEnum("service_type"),
    rute: text("rute"),
    vessel: text("vessel"),
    etd: date("etd"),
    sales: text("sales"),

    // --- uang, semua BIGINT rupiah ---
    sellingIdr: bigint("selling_idr", { mode: "bigint" }).notNull().default(sql`0`),
    ppnIdr: bigint("ppn_idr", { mode: "bigint" }).notNull().default(sql`0`),

    // --- valuta asing, hanya untuk EXIM ---
    /** Nilai USD sebelum konversi. Null untuk job rupiah murni. */
    sellingUsd: bigint("selling_usd", { mode: "bigint" }),
    /** Kurs yang dipakai, dikali 100 supaya tetap bilangan bulat. 18.200 → 1820000. */
    kursX100: bigint("kurs_x100", { mode: "bigint" }),

    // --- alur ---
    status: jobStatusEnum("status").notNull().default("DRAFT"),
    makerId: uuid("maker_id")
      .notNull()
      .references(() => users.id),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
    /** Soft delete. Kewajiban simpan 10 tahun — UU KUP Pasal 28 ayat (11). */
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    /*
     * KUNCI UNIK YANG BENAR.
     *
     * BUKAN UNIQUE(job_no). Data historis punya 16 tabrakan job_no karena
     * DOM, EXP, dan IMP memakai counter terpisah. Kalau job_no dijadikan
     * unik, migrasi data lama akan gagal dan 16 job asli tidak bisa masuk.
     */
    uqNomor: uniqueIndex("uq_job_nomor").on(
      table.seqScope,
      table.tahun,
      table.bulan,
      table.running,
    ),
    idxCustomer: index("idx_job_customer").on(table.customerId),
    idxStatus: index("idx_job_status").on(table.status),
    idxPeriode: index("idx_job_periode").on(table.tahun, table.bulan),

    /* R14.2 — indeks untuk halaman peringkat sales & rute per rentang. */
    idxSales: index("idx_job_sales").on(table.sales, table.tahun, table.bulan),
    idxRute: index("idx_job_rute").on(table.rute, table.tahun, table.bulan),

    /*
     * R10 — PAGAR KERAS kombinasi leg. Dua aturan sekaligus:
     *
     *   1. 1+3 tanpa 2 MUSTAHIL. Kutipan Pak Indra: "Satu tiga nggak mungkin."
     *      Barang tidak bisa berpindah antar pelabuhan tanpa ada yang
     *      mengangkut.
     *   2. Minimal satu leg harus tercentang. Job tanpa leg apa pun bukan
     *      pengiriman.
     *
     * Ini di DATABASE, bukan di UI, supaya tidak ada peran atau jalur import
     * yang bisa menembusnya.
     *
     * Yang TIDAK ada di sini: "domestik wajib 3 leg". Itu default aplikasi,
     * bukan pagar keras — lihat legOverrideAlasan di atas.
     *
     * ⚠️ Bentuk pemanggilan check() sensitif terhadap versi Drizzle. Kalau
     * drizzle-kit menolak, JANGAN hapus aturannya — pindahkan ke SQL mentah
     * di berkas migrasi. Bentuk SQL-nya ada di docs/ERD.md.
     */
    ckLegs: check(
      "ck_legs",
      sql`NOT (${table.legTrucking} AND ${table.legDelivery} AND NOT ${table.legFreight})
			    AND (${table.legTrucking} OR ${table.legFreight} OR ${table.legDelivery})`,
    ),
  }),
);

/**
 * Realokasi biaya antar job ("dipecah") — ADR-0006 Opsi B, diterima 13 Agu 2026.
 *
 * Pak Indra pilih opsi ini: BOLEH memindahkan sebagian nilai satu charge line
 * ke job lain, TAPI wajib asal, tujuan, nominal, alasan tertulis, dan approval
 * manajer. Setiap job lalu menampilkan dua angka GP berdampingan: GP asli
 * (sebelum realokasi) dan GP setelah realokasi. Dashboard bulanan juga
 * menampilkan total nilai realokasi sebagai metrik baru (transparansi, bukan
 * larangan) — supaya praktik nyata ini tetap bisa berjalan tapi selalu
 * terlihat, bukan diam-diam seperti di Excel.
 *
 * originChargeLineId TETAP ada di job asal dengan nilai penuh; baris ini
 * hanya mencatat berapa dari nilai itu "dipindahkan" secara logis ke job
 * lain untuk keperluan tampilan GP. Ini BUKAN memindahkan baris fisik.
 */
export const costReallocations = pgTable(
  "cost_reallocations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    originChargeLineId: uuid("origin_charge_line_id")
      .notNull()
      .references(() => chargeLines.id, { onDelete: "restrict" }),
    originJobId: uuid("origin_job_id")
      .notNull()
      .references(() => jobs.id),
    destinationJobId: uuid("destination_job_id")
      .notNull()
      .references(() => jobs.id),
    jumlahIdr: bigint("jumlah_idr", { mode: "bigint" }).notNull(),
    alasan: text("alasan").notNull(),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    /** Approval manajer wajib, ≠ pembuat — pola yang sama seperti R6, R16, R17. */
    approvedBy: uuid("approved_by").references(() => users.id),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    idxOriginJob: index("idx_realloc_origin_job").on(table.originJobId),
    idxDestJob: index("idx_realloc_dest_job").on(table.destinationJobId),
    /* Tidak boleh "memindahkan" ke job asalnya sendiri — itu bukan realokasi. */
    ckNotSelf: check(
      "ck_realloc_not_self",
      sql`${table.originJobId} != ${table.destinationJobId}`,
    ),
    ckPositive: check("ck_realloc_positive", sql`${table.jumlahIdr} > 0`),
  }),
);

/**
 * Baris biaya ke vendor.
 *
 * Model tiga segmen yang dijelaskan Pak Indra adalah penyederhanaan sekitar 20%.
 * Job nyata punya 14–24 baris biaya dengan vendor berbeda tiap baris. Karena
 * itu biaya disimpan sebagai baris, bukan sebagai tiga kolom.
 */
export const chargeLines = pgTable(
  "charge_lines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    chargeCode: text("charge_code")
      .notNull()
      .references(() => chargeCodes.kode),
    vendorId: uuid("vendor_id").references(() => vendors.id),
    keterangan: text("keterangan"),

    /** Perkiraan saat job dibuat. */
    pencadanganIdr: bigint("pencadangan_idr", { mode: "bigint" }).notNull().default(sql`0`),
    /** Nilai sebenarnya setelah invoice vendor masuk. Null = belum ada. */
    actualIdr: bigint("actual_idr", { mode: "bigint" }),

    /*
     * Kolom terhitung. Tidak mungkin menyimpan selisih yang tidak konsisten
     * dengan kedua angka penyusunnya — database yang menjamin, bukan kode.
     */
    selisihIdr: bigint("selisih_idr", { mode: "bigint" }).generatedAlwaysAs(
      sql`pencadangan_idr - actual_idr`,
    ),

    isReimburse: boolean("is_reimburse").notNull().default(false),
    urutan: integer("urutan").notNull().default(0),
  },
  (table) => ({
    idxJob: index("idx_charge_job").on(table.jobId),
    idxVendor: index("idx_charge_vendor").on(table.vendorId),
  }),
);

// ---------------------------------------------------------------------------
// Persetujuan
// ---------------------------------------------------------------------------

/**
 * Jejak persetujuan.
 *
 * `cycle` naik setiap kali job dibuka kembali. Semua persetujuan dari cycle
 * sebelumnya menjadi tidak berlaku — ini terjemahan langsung dari kalimat
 * Pak Indra: "mau ngebongkar ini, semua orang mesti mulai prosesnya dari awal."
 *
 * Baris lama TIDAK dihapus. Kalau dihapus, tidak ada yang bisa menjawab
 * berapa kali sebuah job pernah dibongkar dan oleh siapa.
 */
export const approvals = pgTable(
  "approvals",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id, { onDelete: "cascade" }),
    cycle: integer("cycle").notNull().default(1),
    tingkat: integer("tingkat").notNull(), // 1 = manajer, 2 = final
    approverId: uuid("approver_id")
      .notNull()
      .references(() => users.id),
    catatan: text("catatan"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqSatuKali: uniqueIndex("uq_approval_sekali").on(
      table.jobId,
      table.cycle,
      table.tingkat,
    ),
  }),
);

// ---------------------------------------------------------------------------
// Pengajuan buka gembok biaya (R6.4) -- wajib berita acara
// ---------------------------------------------------------------------------

/**
 * Formalisasi R6.4. Klien (transkrip 2, 13 Agu 2026) menjelaskan alur
 * senyatanya: PIC + Sales bikin "berita acara" BERSAMA dulu -- bukan cuma
 * penjelasan lisan -- baru diajukan ke Pak Indra untuk approval. "Di sini
 * mau 100, mau 50, mau 300, mau sejuta pun tetap harus ada informasi ke
 * Bapak" -- tidak ada batas nilai minimum yang boleh lewat tanpa ini.
 *
 * Baris lama TIDAK diedit setelah DISETUJUI/DITOLAK -- itu jejak audit,
 * sama seperti pola approvals.cycle di atas.
 */
export const costReopenRequests = pgTable("cost_reopen_requests", {
  id: uuid("id").primaryKey().defaultRandom(),
  jobId: uuid("job_id")
    .notNull()
    .references(() => jobs.id, { onDelete: "cascade" }),

  /** PIC yang mengajukan. */
  requestedBy: uuid("requested_by")
    .notNull()
    .references(() => users.id),
  /** Sales yang ikut menandatangani berita acara -- boleh sama dengan requestedBy kalau satu orang menjalankan kedua peran. */
  coSignedBy: uuid("co_signed_by").references(() => users.id),

  /** Wajib. File berita acara (foto/PDF) yang diunggah PIC + Sales sebelum diajukan. */
  beritaAcaraFileUrl: text("berita_acara_file_url").notNull(),
  /** Wajib. Alasan biaya tambahan/koreksi -- masuk audit_log. */
  alasan: text("alasan").notNull(),
  nilaiTambahanIdr: bigint("nilai_tambahan_idr", { mode: "bigint" }),

  status: reopenRequestStatusEnum("status").notNull().default("DIAJUKAN"),
  /** Wajib OWNER (Pak Indra) -- tidak boleh sama dengan requestedBy. */
  decidedBy: uuid("decided_by").references(() => users.id),
  decidedAt: timestamp("decided_at", { withTimezone: true }),
  catatanKeputusan: text("catatan_keputusan"),

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------------------------------------------------------------------------
// Invoice ke customer
// ---------------------------------------------------------------------------

export const customerInvoices = pgTable(
  "customer_invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    jobId: uuid("job_id")
      .notNull()
      .references(() => jobs.id),

    invType: text("inv_type").notNull(), // INVDOM | INVEXP | INVIMP
    issueYear: integer("issue_year").notNull(),
    running: integer("running").notNull(),
    invoiceNo: text("invoice_no").notNull(),

    issueDate: date("issue_date").notNull(),
    dueDate: date("due_date").notNull(),

    subTotalIdr: bigint("sub_total_idr", { mode: "bigint" }).notNull(),
    reimburseIdr: bigint("reimburse_idr", { mode: "bigint" }).notNull().default(sql`0`),
    dppIdr: bigint("dpp_idr", { mode: "bigint" }).notNull(),
    ppnIdr: bigint("ppn_idr", { mode: "bigint" }).notNull(),
    pph23Idr: bigint("pph23_idr", { mode: "bigint" }).notNull().default(sql`0`),
    grandTotalIdr: bigint("grand_total_idr", { mode: "bigint" }).notNull(),

    /**
     * Versi aturan pajak saat invoice diterbitkan.
     * Tanpa ini, satu perubahan tarif akan diam-diam menulis ulang seluruh
     * riwayat, dan angka yang sudah dilaporkan ke kantor pajak tidak lagi cocok.
     */
    taxRuleVersion: text("tax_rule_version").notNull(),

    status: invoiceStatusEnum("status").notNull().default("DRAFT"),
    /** POD harus kembali ke Jakarta sebelum invoice ditagih (R9.4). */
    podDiterimaAt: timestamp("pod_diterima_at", { withTimezone: true }),

    /*
     * R9.4b -- pengecualian, transkrip 2 (13 Agu 2026): customer terkadang
     * minta invoice terbit duluan sebelum POD kembali, karena mau bayar cepat
     * dan dokumennya belum ada. Ini jalur KHUSUS, bukan pelonggaran R9.4:
     * kalau true, earlyIssueApprovedBy WAJIB terisi (lihat CHECK di bawah).
     */
    issuedBeforePod: boolean("issued_before_pod").notNull().default(false),
    /** Wajib terisi jika issuedBeforePod true. Bukan createdBy invoice ini. */
    earlyIssueApprovedBy: uuid("early_issue_approved_by").references(() => users.id),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqInv: uniqueIndex("uq_inv").on(table.invType, table.issueYear, table.running),
    idxJob: index("idx_inv_job").on(table.jobId),
    /** R9.4b -- kalau terbit sebelum POD, approvalnya wajib ada. */
    ckEarlyIssue: check(
      "ck_early_issue_needs_approval",
      sql`(issued_before_pod = false) OR (early_issue_approved_by IS NOT NULL)`,
    ),
  }),
);

// ---------------------------------------------------------------------------
// Invoice susulan / koreksi (R16) -- ⚠️ sebagian default, lihat Q69-Q71
// ---------------------------------------------------------------------------

/**
 * Kasus klien 13 Agu 2026: invoice sudah dicetak dan terkunci dengan nominal
 * salah (kurang Rp 1 juta). Kekurangannya ditagih bulan berikutnya memakai
 * nomor invoice yang BENAR-BENAR IDENTIK dengan invoice pertama, dibedakan
 * lewat label.
 *
 * Kenapa tidak jadi baris `customerInvoices` baru: `uqInv` menolak dua baris
 * bernomor identik -- itu akan dibaca sistem sebagai duplikat seperti kasus
 * vendor 01A/01B, padahal di sini duplikasinya disengaja dan sah. Karena itu
 * kunci unik sebenarnya ada di (originalInvoiceId, addendumSeq), BUKAN di teks
 * nomor invoice -- nomor yang tercetak disalin dari invoice asal saat mencetak.
 *
 * Invoice pertama TIDAK diubah (I-INV-1 tetap berlaku). Ini dokumen KEDUA yang
 * merujuk ke yang pertama, bukan revisi di tempat.
 */
export const customerInvoiceAddenda = pgTable(
  "customer_invoice_addenda",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    originalInvoiceId: uuid("original_invoice_id")
      .notNull()
      .references(() => customerInvoices.id),
    addendumSeq: integer("addendum_seq").notNull(),

    /** Wajib. Tanpa ini, dua dokumen bernomor sama tidak bisa dibedakan saat diaudit. */
    labelInternal: text("label_internal").notNull(),
    /** Wajib. Masuk audit_log, sama seperti pola legOverrideAlasan (R10) dan unlock (R6.2). */
    alasan: text("alasan").notNull(),

    /** Selisih. Boleh negatif (koreksi turun). */
    amountIdr: bigint("amount_idr", { mode: "bigint" }).notNull(),

    /*
     * ⚠️ Q69 BELUM DIJAWAB. Default saat ini: selisih dihitung sebagai
     * kejadian pajak BARU dan berdiri sendiri -- DPP-nya adalah nilai selisih
     * itu sendiri. Ini TIDAK menyentuh dpp/ppn/pph23 invoice asal, karena itu
     * sudah dibekukan (I-INV-1). Kalau Bu Niken bilang selisih ini tidak boleh
     * kena pajak lagi, ubah di sini saja -- invoice asal tidak perlu disentuh.
     */
    dppIdr: bigint("dpp_idr", { mode: "bigint" }).notNull(),
    ppnIdr: bigint("ppn_idr", { mode: "bigint" }).notNull(),
    pph23Applied: boolean("pph23_applied").notNull().default(false),
    pph23Idr: bigint("pph23_idr", { mode: "bigint" }).notNull().default(sql`0`),
    grandTotalIdr: bigint("grand_total_idr", { mode: "bigint" }).notNull(),
    /** Versi SAAT ADDENDUM terbit -- bisa beda dari tax_rule_version invoice asal. */
    taxRuleVersion: text("tax_rule_version").notNull(),

    issueMonth: integer("issue_month").notNull(),
    issueYear: integer("issue_year").notNull(),

    status: invoiceAddendumStatusEnum("status").notNull().default("DRAFT"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    /**
     * ⚠️ Q70 BELUM DIJAWAB. Default saat ini: Manager atau Owner, TIDAK
     * boleh sama dengan createdBy (pola R-A1: pembuat ≠ penyetuju). Addendum
     * belum berlaku (bukan ISSUED) sampai kolom ini terisi.
     */
    approvedBy: uuid("approved_by").references(() => users.id),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    /*
     * Kunci unik SEBENARNYA. Nomor invoice yang tercetak boleh identik dengan
     * invoice asal -- itu tidak divalidasi di sini karena tidak disimpan
     * sebagai kolom teks bebas, hanya disalin dari originalInvoiceId saat cetak.
     */
    uqAddendum: uniqueIndex("uq_addendum").on(table.originalInvoiceId, table.addendumSeq),
    idxOriginal: index("idx_addendum_original").on(table.originalInvoiceId),
  }),
);

// ---------------------------------------------------------------------------
// Invoice dari vendor
// ---------------------------------------------------------------------------

/**
 * Invoice yang masuk dari vendor.
 *
 * INI TABEL YANG MENYELESAIKAN MASALAH BU NIKEN.
 *
 * Kasusnya: satu vendor menerbitkan 01A (kena pajak) dan 01B (reimburse, tanpa
 * pajak). Staf salah input nomor yang sama dua kali, dan ISLI berisiko membayar
 * dobel. Indeks unik di bawah membuat itu mustahil, bukan sekadar tidak dianjurkan.
 */
export const vendorInvoices = pgTable(
  "vendor_invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    vendorId: uuid("vendor_id")
      .notNull()
      .references(() => vendors.id),
    /** Nomor persis seperti tertulis di kertas vendor — termasuk akhiran A/B. */
    vendorInvoiceNo: text("vendor_invoice_no").notNull(),

    tanggalInvoice: date("tanggal_invoice").notNull(),
    jumlahIdr: bigint("jumlah_idr", { mode: "bigint" }).notNull(),
    pph23Idr: bigint("pph23_idr", { mode: "bigint" }).notNull().default(sql`0`),

    status: vendorInvoiceStatusEnum("status").notNull().default("DITERIMA"),
    /** Setelah terisi, baris ini TERKUNCI. Hanya OWNER yang bisa membuka. */
    dibayarAt: timestamp("dibayar_at", { withTimezone: true }),
    dibayarOleh: uuid("dibayar_oleh").references(() => users.id),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    /*
     * ANTI DOBEL BAYAR.
     * Satu vendor tidak bisa punya dua baris dengan nomor invoice sama.
     * 01A dan 01B tetap boleh — keduanya nomor yang berbeda.
     */
    uqVendorInv: uniqueIndex("uq_vendor_invoice").on(
      table.vendorId,
      table.vendorInvoiceNo,
    ),
    idxVendor: index("idx_vinv_vendor").on(table.vendorId),
    idxStatus: index("idx_vinv_status").on(table.status),
  }),
);

/** Menghubungkan invoice vendor ke baris biaya yang dibayarnya. */
export const vendorInvoiceLines = pgTable("vendor_invoice_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  vendorInvoiceId: uuid("vendor_invoice_id")
    .notNull()
    .references(() => vendorInvoices.id, { onDelete: "cascade" }),
  chargeLineId: uuid("charge_line_id")
    .notNull()
    .references(() => chargeLines.id),
  jumlahIdr: bigint("jumlah_idr", { mode: "bigint" }).notNull(),
});

// ---------------------------------------------------------------------------
// Invoice vendor susulan / dipecah antar bulan (R17) -- simetris dengan R16
// ---------------------------------------------------------------------------

/**
 * Kasus klien, transkrip 2 (13 Agu 2026): vendor tracking deal Rp 1.500.000,
 * tapi ke-input Rp 1.250.000 (typo/selisih). Sisa Rp 250.000 ditagih vendor
 * BULAN BERIKUTNYA memakai NOMOR INVOICE VENDOR YANG SAMA. Klien sendiri
 * bertanya "gimana caranya itu, padahal sebenarnya ini satu" -- ini bukan
 * kasus 01A/01B (R7.1, dua nomor BEDA yang harus ditolak kalau sama), ini
 * satu nomor yang SENGAJA dipakai dua kali oleh vendor.
 *
 * `uqVendorInv` di vendorInvoices (vendor_id, vendor_invoice_no) TETAP
 * berlaku sebagai pencegah dobel-bayar tak sengaja -- baris ini tidak
 * menyentuhnya. Sama seperti R16, kunci unik sebenarnya ada di
 * (originalVendorInvoiceId, addendumSeq), bukan di teks nomor invoice.
 *
 * Client juga minta "kuota belum dibayar" terlihat saat tim pembayar
 * memanggil nomor invoice ini -- itu dihitung sebagai:
 *   original.jumlahIdr - SUM(addenda yang sudah DIBAYAR)
 * bukan kolom tersimpan, supaya tidak berisiko basi.
 */
export const vendorInvoiceAddenda = pgTable(
  "vendor_invoice_addenda",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    originalVendorInvoiceId: uuid("original_vendor_invoice_id")
      .notNull()
      .references(() => vendorInvoices.id),
    addendumSeq: integer("addendum_seq").notNull(),

    /** Wajib, sama pola dengan customerInvoiceAddenda.labelInternal. */
    labelInternal: text("label_internal").notNull(),
    /** Wajib. Masuk audit_log. */
    alasan: text("alasan").notNull(),

    /** Selisih/sisa yang ditagih di periode ini. Boleh negatif (koreksi turun). */
    jumlahIdr: bigint("jumlah_idr", { mode: "bigint" }).notNull(),
    pph23Applied: boolean("pph23_applied").notNull().default(false),
    pph23Idr: bigint("pph23_idr", { mode: "bigint" }).notNull().default(sql`0`),

    issueMonth: integer("issue_month").notNull(),
    issueYear: integer("issue_year").notNull(),

    status: invoiceAddendumStatusEnum("status").notNull().default("DRAFT"),
    createdBy: uuid("created_by")
      .notNull()
      .references(() => users.id),
    /** Manager/Owner, tidak boleh sama dengan createdBy -- pola R-A1. */
    approvedBy: uuid("approved_by").references(() => users.id),

    /** Kapan ini benar-benar dibayar -- dipakai untuk hitung sisa kuota. */
    dibayarAt: timestamp("dibayar_at", { withTimezone: true }),

    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    uqVendorAddendum: uniqueIndex("uq_vendor_addendum").on(
      table.originalVendorInvoiceId,
      table.addendumSeq,
    ),
    idxOriginalVendor: index("idx_vendor_addendum_original").on(
      table.originalVendorInvoiceId,
    ),
  }),
);

// ---------------------------------------------------------------------------
// Jejak audit
// ---------------------------------------------------------------------------

/**
 * Append-only.
 *
 * Migrasi menyertakan:
 *   REVOKE UPDATE, DELETE ON audit_log FROM app_role;
 *
 * Tanpa itu, jejak audit hanya sopan santun. Dengan itu, jejak audit adalah
 * jaminan — bahkan kode kita sendiri tidak bisa menghapusnya.
 */
export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id),
    aksi: text("aksi").notNull(),
    entitas: text("entitas").notNull(),
    entitasId: uuid("entitas_id"),
    sebelum: text("sebelum"), // JSON
    sesudah: text("sesudah"), // JSON
    alasan: text("alasan"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    idxEntitas: index("idx_audit_entitas").on(table.entitas, table.entitasId),
    idxWaktu: index("idx_audit_waktu").on(table.createdAt),
  }),
);
