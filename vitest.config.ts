import fs from "node:fs";
import path from "node:path";
import { defineConfig } from "vitest/config";

/**
 * Vitest tidak otomatis memuat .env.local ke process.env. Test integrasi
 * (alokasi nomor urut) butuh DATABASE_URL, jadi dimuat manual di sini —
 * nilai yang sudah ada di environment TIDAK ditimpa.
 */
function loadDotEnvFile(file: string): void {
  const filePath = path.resolve(__dirname, file);
  if (!fs.existsSync(filePath)) return;
  const text = fs.readFileSync(filePath, "utf8");
  for (const line of text.split(/\r?\n/)) {
    if (!line || line.trimStart().startsWith("#")) continue;
    const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/.exec(line);
    if (!m) continue;
    const key = m[1];
    let value = m[2] ?? "";
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key !== undefined && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

loadDotEnvFile(".env.local");
loadDotEnvFile(".env");

export default defineConfig({
  // JSX runtime "automatic" — konsisten dengan Next 15 (tsconfig jsx:
  // preserve). Tanpa ini, file .tsx di src/lib (mis. invoice-pdf) gagal di
  // vitest dengan "React is not defined" padahal Next build normal.
  esbuild: {
    jsx: "automatic",
  },
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.{ts,tsx}", "tests/**/*.{test,spec}.{ts,tsx}"],
    exclude: ["tests/e2e/**"],

    // Zona waktu dikunci. Semua jatuh tempo, ETD, dan cut-off periode
    // memakai WIB. Kalau test lolos di mesin Alawi tapi gagal di CI
    // (UTC), penyebabnya hampir selalu ini.
    env: {
      TZ: "Asia/Jakarta",
    },

    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
      // Hanya logika uang & pajak yang diberi ambang. Sisanya tidak
      // dipaksa — cakupan tinggi di komponen UI adalah teater.
      include: ["src/lib/money/**", "src/lib/tax/**", "src/lib/costing/**"],
      thresholds: {
        lines: 95,
        functions: 95,
        branches: 90,
        statements: 95,
      },
    },
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
