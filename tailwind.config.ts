import type { Config } from "tailwindcss";

/*
 * PENTING — BACA SEBELUM MENGUBAH
 *
 * `theme.colors` di bawah ini MENGGANTI palet bawaan Tailwind, bukan menambah.
 * Itu disengaja dan merupakan inti dari penegakan design system.
 *
 * Akibatnya: `bg-blue-500`, `text-slate-600`, `border-gray-200`, `emerald`,
 * `amber`, `rose` — semuanya GAGAL SAAT BUILD, bukan cuma terlihat jelek.
 *
 * Kenapa perlu sekeras ini: Cursor Tab tidak bisa dipagari aturan sama sekali
 * (lihat docs/SETUP-EDITOR.md). Tab akan melengkapi `bg-blue-500` dengan senang
 * hati. Satu-satunya cara menghentikannya adalah membuat kelas itu tidak ada.
 *
 * Kalau kamu "memperbaiki" berkas ini dengan mengembalikan palet bawaan, kamu
 * mematikan penjaga desain, dan antarmuka akan menyimpang dalam hitungan minggu.
 *
 * Sumber token: docs/DESIGN-SYSTEM.md (turunan dari apple-DESIGN.md).
 */
const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    // MENGGANTI, bukan extend. Disengaja.
    colors: {
      transparent: "transparent",
      current: "currentColor",
      inherit: "inherit",

      // Permukaan
      canvas: "var(--canvas)",
      parchment: "var(--parchment)",
      pearl: "var(--pearl)",

      // Teks
      ink: {
        DEFAULT: "var(--ink)",
        80: "var(--ink-80)",
        48: "var(--ink-48)",
      },

      // Garis
      hairline: "var(--hairline)",
      divider: "var(--divider)",

      // Aksen — satu-satunya warna merek
      accent: {
        DEFAULT: "var(--accent)",
        focus: "var(--accent-focus)",
        dark: "var(--accent-dark)",
      },

      // Semantik — HANYA untuk teks, angka, garis tepi, dan titik 6px.
      // TIDAK PERNAH sebagai latar blok. Lihat docs/DESIGN-SYSTEM.md.
      red: "var(--red)",
      orange: "var(--orange)",
      green: "var(--green)",
      gray: "var(--gray)",
    },

    borderRadius: {
      none: "0",
      sm: "5px",
      DEFAULT: "8px",
      md: "11px",
      lg: "18px",
      full: "9999px",
    },

    // Tidak ada bayangan pada elemen UI. Pakai hairline.
    // Satu-satunya bayangan yang diizinkan Apple adalah untuk foto produk,
    // dan sistem operasional tidak punya foto produk.
    boxShadow: {
      none: "none",
    },

    fontFamily: {
      sans: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      mono: ["ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
    },

    fontSize: {
      micro: ["11px", { lineHeight: "1.3", fontWeight: "500" }],
      label: ["12px", { lineHeight: "1.35" }],
      body: ["13px", { lineHeight: "1.45" }],
      section: ["15px", { lineHeight: "1.3", fontWeight: "600" }],
      title: ["20px", { lineHeight: "1.2", fontWeight: "600" }],
      figure: ["22px", { lineHeight: "1.15", fontWeight: "600" }],
    },

    spacing: {
      0: "0",
      1: "4px",
      2: "8px",
      3: "12px",
      4: "16px",
      6: "24px",
      8: "32px",
      12: "48px",
    },

    screens: {
      sm: "640px",
      md: "768px",
      lg: "1024px",
      xl: "1280px",
    },

    extend: {
      minHeight: {
        // Target sentuh minimum — Pak Indra menyetujui dari HP.
        touch: "44px",
      },
    },
  },
  plugins: [],
};

export default config;
