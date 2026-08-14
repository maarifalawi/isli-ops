import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.{test,spec}.ts", "tests/**/*.{test,spec}.ts"],
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
