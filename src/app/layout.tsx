import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ISLI Ops",
  description:
    "Sistem operasional PT Integra Sinergi Logitama Indonesia — job, costing, invoice.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Jangan kunci zoom. Pak Indra membaca angka dari HP.
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <header className="border-b border-hairline bg-canvas">
          <div className="mx-auto flex h-12 max-w-[1280px] items-center justify-between px-4">
            {/* M1 (Irisan 10 Item 8): link nav ke-7 meluap di layar 375px —
                gulir terjadi DI DALAM nav (document tetap tanpa horizontal
                scroll, smoke "terbaca di layar HP" tetap hijau). Semua link
                tetap tersedia; sasaran sentuh tetap min 44px (min-h-[44px]). */}
            <nav className="flex items-center gap-4 overflow-x-auto whitespace-nowrap">
              <span className="text-section">ISLI Ops</span>
              <a
                href="/master"
                className="flex min-h-[44px] items-center text-label text-ink-48 hover:text-ink"
              >
                Master Data
              </a>
              <a
                href="/jobs"
                className="flex min-h-[44px] items-center text-label text-ink-48 hover:text-ink"
              >
                Job
              </a>
              <a
                href="/laporan"
                className="flex min-h-[44px] items-center text-label text-ink-48 hover:text-ink"
              >
                Laporan
              </a>
              <a
                href="/invoice-vendor"
                className="flex min-h-[44px] items-center text-label text-ink-48 hover:text-ink"
              >
                Invoice Vendor
              </a>
              <a
                href="/invoice"
                className="flex min-h-[44px] items-center text-label text-ink-48 hover:text-ink"
              >
                Invoice
              </a>
              <a
                href="/realokasi"
                className="flex min-h-[44px] items-center text-label text-ink-48 hover:text-ink"
              >
                Realokasi
              </a>
            </nav>
            <span className="text-label text-ink-48">Irisan 8 · Laporan</span>
          </div>
        </header>
        <main className="mx-auto max-w-[1280px] px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
