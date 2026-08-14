/** @type {import("next").NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // Build gagal kalau ada error TypeScript atau lint.
  // JANGAN pernah menyalakan ignoreBuildErrors untuk "sementara" — sistem ini
  // menghitung pajak, dan error tipe yang dilewati jadi invoice salah yang sudah
  // terkirim ke customer sebelum ada yang sadar.
  typescript: { ignoreBuildErrors: false },
  eslint: { ignoreDuringBuilds: false },

  experimental: {
    // Server Action menerima unggahan lampiran (scan POD, BL) — lihat Q21.
    serverActions: { bodySizeLimit: "10mb" },
  },

  // Tidak ada remote image. Logo ISLI di-bundle lokal.
  images: { remotePatterns: [] },

  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;
