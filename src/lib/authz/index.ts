/*
 * Kontrol akses.
 *
 * ATURAN: selalu lewat assertCan(). JANGAN PERNAH menulis `role === "OWNER"`
 * di dalam kode fitur. Ditegakkan mekanis oleh .dependency-cruiser.cjs.
 *
 * Alasannya bukan gaya penulisan. Kalau perbandingan peran tersebar di puluhan
 * berkas, tidak ada seorang pun yang bisa menjawab pertanyaan "siapa saja yang
 * bisa membuka kunci invoice yang sudah dibayar?" tanpa membaca seluruh kode.
 * Dengan satu tabel, jawabannya ada di satu layar.
 *
 * Tiga peran, bukan tujuh. Klien menyatakan hanya ada 4 akun: Pak Indra,
 * seorang manajer, dan 2 staf. Peran yang tidak dipakai adalah beban yang harus
 * diuji tanpa memberi manfaat.
 */

export const ROLES = ["OWNER", "MANAGER", "STAFF"] as const;
export type Role = (typeof ROLES)[number];

export const ACTIONS = [
  "job:create",
  "job:edit",
  "job:submit",
  "job:approve_first",
  "job:approve_final",
  "job:unlock",
  "job:view_margin",
  "invoice:create",
  "invoice:issue",
  "invoice:void",
  "vendor_invoice:create",
  "vendor_invoice:mark_paid",
  "vendor_invoice:unlock_paid",
  "master:manage",
  "report:view",
  "user:manage",
] as const;
export type Action = (typeof ACTIONS)[number];

/**
 * Matriks izin.
 *
 * R-A6 DICABUT 13 Agu 2026.
 *
 * Semula STAFF tidak boleh melihat margin. Klien menegaskan staf BOLEH melihat
 * GP, jadi job:view_margin sekarang dimiliki ketiga peran.
 *
 * Aksi job:view_margin sengaja TIDAK dihapus. Kalau suatu hari keputusan ini
 * dibalik lagi, cukup keluarkan satu baris dari daftar STAFF di bawah --
 * bukan menyebar pengecekan baru ke seluruh aplikasi.
 *
 * Yang TETAP dibatasi untuk STAFF: menyetujui, membuka kunci, menerbitkan
 * invoice, menandai lunas, dan mengelola data master.
 */
const PERMISSIONS: Readonly<Record<Role, ReadonlySet<Action>>> = {
  OWNER: new Set<Action>(ACTIONS),
  MANAGER: new Set<Action>([
    "job:create",
    "job:edit",
    "job:submit",
    "job:approve_first",
    "job:view_margin",
    "invoice:create",
    "invoice:issue",
    "vendor_invoice:create",
    "vendor_invoice:mark_paid",
    "master:manage",
    "report:view",
  ]),
  STAFF: new Set<Action>([
    "job:create",
    "job:edit",
    "job:submit",
    "job:view_margin",
    "invoice:create",
    "vendor_invoice:create",
    "report:view",
  ]),
};

export class AuthorizationError extends Error {
  readonly role: Role;
  readonly action: Action;

  constructor(role: Role, action: Action) {
    super(`Peran ${role} tidak berwenang melakukan "${action}".`);
    this.name = "AuthorizationError";
    this.role = role;
    this.action = action;
  }
}

export function can(role: Role, action: Action): boolean {
  return PERMISSIONS[role].has(action);
}

/** Melempar kalau tidak berwenang. Ini yang dipakai di server action. */
export function assertCan(role: Role, action: Action): void {
  if (!can(role, action)) throw new AuthorizationError(role, action);
}

/**
 * R-A1: pembuat tidak boleh menyetujui pekerjaannya sendiri.
 *
 * Berlaku bahkan untuk OWNER. Pak Indra bisa menyetujui apa pun, kecuali job
 * yang beliau buat sendiri — kalau tidak, seluruh jejak persetujuan kehilangan
 * artinya untuk job tersebut.
 */
export function assertNotSelfApproval(approverId: string, makerId: string): void {
  if (approverId === makerId) {
    throw new Error(
      "Pembuat tidak boleh menyetujui pekerjaannya sendiri (R-A1). " +
        "Minta orang lain yang menyetujui.",
    );
  }
}

/** Hanya OWNER yang boleh persetujuan final (R-A2). */
export function assertFinalApprover(role: Role): void {
  if (role !== "OWNER") {
    throw new AuthorizationError(role, "job:approve_final");
  }
}
