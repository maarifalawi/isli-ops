/*
 * Pemilih rentang bulan — Irisan 8a (R14.1). Client component.
 *
 * Rentang tersimpan di URL supaya bisa dibagikan (bookmark/WhatsApp).
 * Nilai default Apr–Jul 2026 = periode data contoh fixture.
 * Tidak ada logika uang di sini — murni navigasi.
 */

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function PemilihRentang({
  dariAwal = "2026-04",
  sampaiAwal = "2026-07",
}: {
  dariAwal?: string;
  sampaiAwal?: string;
}) {
  const router = useRouter();
  const [dari, setDari] = useState(dariAwal);
  const [sampai, setSampai] = useState(sampaiAwal);
  const [galat, setGalat] = useState<string | null>(null);

  const terapkan = () => {
    // Validasi ringan di client hanya untuk UX; server tetap memvalidasi
    // ulang via parseRentangDariUrl (jangan percaya input klien).
    const pola = /^\d{4}-(0[1-9]|1[0-2])$/;
    if (!pola.test(dari) || !pola.test(sampai)) {
      setGalat("Format bulan harus YYYY-MM, contoh: 2026-04.");
      return;
    }
    if (dari > sampai) {
      setGalat("Bulan awal tidak boleh lewat bulan akhir.");
      return;
    }
    setGalat(null);
    router.push(`/laporan?dari=${dari}&sampai=${sampai}`);
  };

  return (
    <section className="mb-6">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-micro uppercase text-ink-48">Dari bulan</span>
          <input
            type="month"
            value={dari}
            onChange={(e) => setDari(e.target.value)}
            className="min-h-[44px] rounded border border-hairline bg-pearl px-3 text-body"
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-micro uppercase text-ink-48">Sampai bulan</span>
          <input
            type="month"
            value={sampai}
            onChange={(e) => setSampai(e.target.value)}
            className="min-h-[44px] rounded border border-hairline bg-pearl px-3 text-body"
          />
        </label>
        <button
          type="button"
          onClick={terapkan}
          className="min-h-[44px] rounded border border-hairline bg-pearl px-4 text-label active:scale-[.96]"
        >
          Terapkan
        </button>
      </div>
      {galat ? <p className="mt-2 text-label text-red">{galat}</p> : null}
    </section>
  );
}
