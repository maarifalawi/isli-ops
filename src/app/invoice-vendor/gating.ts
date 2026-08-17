import { type Role, can } from "@/lib/authz/index";

/*
 * Logika tampil aksi invoice vendor — Irisan 10 Item 5. Murni (tanpa
 * "use client") supaya bisa dikunci UNIT TEST, terutama V-INV-3.
 *
 * UI hanya menyembunyikan; service src/lib/vendor-invoice tetap penjaga
 * otoritatif (assertCan + R-A1 + guard status-lama).
 */

/**
 * V-INV-3 (HARD REQUIREMENT HANDOFF-IRISAN-7): tombol "Bayar" hanya boleh
 * tampil SETELAH snapshot status pembayaran dimuat di layar — user tidak
 * boleh bisa klik bayar tanpa melihat status saat ini dulu. Ditambah izin
 * `vendor_invoice:mark_paid` (O/M; STAFF tidak).
 */
export function bolehTampilTombolBayar(role: Role, statusSudahDimuat: boolean): boolean {
  return statusSudahDimuat && can(role, "vendor_invoice:mark_paid");
}

/** Verifikasi hanya O/M (D3; STAFF tidak). */
export function bolehTampilTombolVerifikasi(role: Role): boolean {
  return can(role, "vendor_invoice:verify");
}

/** Batal & buka kunci dibayar: OWNER saja (R-A5). */
export function bolehTampilTombolBatal(role: Role): boolean {
  return can(role, "vendor_invoice:unlock_paid");
}

/**
 * Perbaikan A2-1 (V-INV-2): "tidak ada peringatan" TIDAK boleh berarti
 * "aman" kalau pengecekan nomor miripnya sendiri gagal. Kebijakan retry:
 * satu kali otomatis; dua kali gagal → tampilkan status gagal yang terlihat
 * + tombol coba ulang manual. Murni supaya bisa dikunci unit test.
 */
export function harusRetryOtomatis(jumlahPercobaanGagal: number): boolean {
  return jumlahPercobaanGagal < 1;
}
