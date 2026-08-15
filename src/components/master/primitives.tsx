/*
 * Primitif bersama halaman master data — Irisan 3 (RENCANA-IRISAN-3-CRUD §8).
 *
 * Semua kelas hanya memakai token DESIGN-SYSTEM (tailwind.config mengganti
 * palet bawaan — warna Tailwind bawaan gagal build). Tanpa box-shadow,
 * tanpa gradien, tanpa emoji.
 */

export function HalamanJudul({
  judul,
  keterangan,
}: {
  judul: string;
  keterangan?: string;
}) {
  return (
    <div className="mb-6">
      <h1 className="text-title">{judul}</h1>
      {keterangan ? <p className="mt-1 text-label text-ink-48">{keterangan}</p> : null}
    </div>
  );
}

/** Kartu peringatan kemiripan nama (RENCANA §7: teks #c93400, garis --hairline). */
export function PeringatanMirip({ items }: { items: { nama: string; skor: number }[] }) {
  if (items.length === 0) return null;
  return (
    <output
      className="mt-2 block rounded border border-hairline px-3 py-2 text-label"
      style={{ color: "#c93400" }}
    >
      Mungkin duplikat dengan:{" "}
      {items.map((m) => `${m.nama} (${Math.round(m.skor * 100)}%)`).join("; ")}
    </output>
  );
}

/** Pesan hasil server action (error = merah, sukses = hijau). */
export function PesanHasil({ hasil }: { hasil: { ok: boolean; error?: string } | null }) {
  if (!hasil) return null;
  return (
    <output
      className={`mt-2 block rounded border border-hairline px-3 py-2 text-label ${
        hasil.ok ? "text-green" : "text-red"
      }`}
    >
      {hasil.ok ? "Tersimpan." : hasil.error}
    </output>
  );
}

/**
 * Tombol submit pill. Varian "merusak" = transparan, teks/garis #d70015
 * (RENCANA §8 — warna semantik hanya pada teks/garis, bukan latar blok).
 * `min-h-touch` menjamin sasaran sentuh >= 44px.
 */
export function TombolPill({
  children,
  varian = "utama",
}: {
  children: React.ReactNode;
  varian?: "utama" | "merusak" | "netral";
}) {
  const kelas =
    varian === "utama"
      ? "rounded-full bg-accent px-4 text-white hover:bg-accent-dark active:scale-95"
      : varian === "merusak"
        ? "rounded-full border px-4 active:scale-95"
        : "rounded-full border border-hairline px-4 active:scale-95";
  return (
    <button
      type="submit"
      className={`inline-flex min-h-touch items-center justify-center text-label font-medium transition ${kelas}`}
      style={
        varian === "merusak" ? { color: "#d70015", borderColor: "#d70015" } : undefined
      }
    >
      {children}
    </button>
  );
}

/** Kelas bersama input/select 36px, 1px --hairline, radius 8px, fokus cincin accent. */
export const kelasInput =
  "h-9 w-full rounded border border-hairline bg-canvas px-3 text-body text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent-focus";

/** Kelas bersama tombol sekunder kecil (batal edit). */
export const kelasTombolSekunder =
  "inline-flex min-h-touch items-center rounded-full border border-hairline px-4 text-label font-medium active:scale-95";

/** Baris field: label mikro kapital + control. */
export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    // biome-ignore lint/a11y/noLabelWithoutControl: control (input/select) diteruskan lewat children
    <label className="block">
      <span
        className="mb-1 block text-micro uppercase text-ink-48"
        style={{ letterSpacing: "0.04em" }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
