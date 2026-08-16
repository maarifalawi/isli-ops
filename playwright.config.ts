import { readFileSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// .env.local tidak dibaca otomatis oleh proses Playwright (Next.js yang
// membacanya untuk server). Kredensial e2e perlu juga di sisi klien/test,
// jadi muat di sini tanpa dependensi tambahan — nilai yang sudah ada di
// environment tidak ditimpa.
//
// Di CI file ini tidak ada (kredensial datang dari environment/Secrets), jadi
// pembacaan dilewati kalau file tidak ada — mencegah crash ENOENT. Di lokal
// file tetap dimuat seperti biasa.
let envLocal = "";
try {
  envLocal = readFileSync(".env.local", "utf8");
} catch {
  // .env.local tidak ada di CI — skip, pakai env CI langsung
}

for (const baris of envLocal.split(/\r?\n/)) {
  const cocok = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(baris);
  if (!cocok || baris.trimStart().startsWith("#")) continue;
  const nama = cocok[1] ?? "";
  let nilai = cocok[2] ?? "";
  // Nilai ber-kutip ("…" / '…') dilepas kutipnya, seperti perilaku dotenv.
  if (
    nilai.length >= 2 &&
    nilai[0] === nilai[nilai.length - 1] &&
    (nilai[0] === '"' || nilai[0] === "'")
  ) {
    nilai = nilai.slice(1, -1);
  }
  if (nama !== "" && process.env[nama] === undefined) {
    process.env[nama] = nilai;
  }
}

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  ...(process.env.CI ? { workers: 1 } : {}),
  reporter: process.env.CI ? [["html"], ["list"]] : "list",

  use: {
    baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    locale: "id-ID",
    timezoneId: "Asia/Jakarta",
  },

  projects: [
    // Laptop — tempat Bu Niken, Fairol, dan Lana bekerja.
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    // HP — Pak Indra menyetujui dari sini. Wajib diuji, bukan opsional.
    // Lihat jawaban klien: "laptop, dan hp. jadi harus responsive!!"
    {
      name: "mobile",
      use: { ...devices["iPhone 13"] },
    },
  ],

  webServer: {
    command: "npm run build && npm run start",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
