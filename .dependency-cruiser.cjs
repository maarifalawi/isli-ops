/**
 * dependency-cruiser — menegakkan batas modul.
 *
 * Ini yang membuat aturan di .clinerules/ punya gigi. Tanpa ini, larangan
 * "jangan hitung uang di komponen" cuma imbauan yang bisa dilanggar Cline
 * tanpa ketahuan sampai review.
 *
 * Jalankan: pnpm dlx depcruise src --config .dependency-cruiser.cjs
 */
module.exports = {
  forbidden: [
    {
      name: "no-money-math-in-ui",
      severity: "error",
      comment:
        "Komponen React DILARANG mengimpor modul kalkulasi uang/pajak. " +
        "Komponen hanya boleh MEMFORMAT angka yang sudah dihitung server. " +
        "Kalau kamu merasa butuh menghitung di sini, ada kalkulasi server " +
        "yang belum dibuat. Lihat .clinerules/05-ui-conventions.md",
      from: { path: "^src/(components|app)/.+\\.tsx$" },
      to: { path: "^src/lib/(money|tax|costing)/" },
    },
    {
      name: "money-only-via-entrypoint",
      severity: "error",
      comment:
        "Modul uang adalah modul dalam. Impor hanya lewat index.ts-nya, " +
        "bukan langsung ke berkas di dalamnya. Lihat ADR-0002.",
      from: { pathNot: "^src/lib/money/" },
      to: {
        path: "^src/lib/money/.+",
        pathNot: "^src/lib/money/index\\.ts$",
      },
    },
    {
      name: "no-db-in-components",
      severity: "error",
      comment:
        "Komponen tidak boleh menyentuh Drizzle/DB langsung. " +
        "Lewat server action atau query layer.",
      from: { path: "^src/components/" },
      to: { path: "^src/(db|lib/db)/" },
    },
    {
      name: "authz-not-bypassed",
      severity: "error",
      comment:
        "Cek izin harus lewat src/lib/authz. Jangan impor tabel role langsung. " +
        "Lihat ADR-0004 — jangan pernah bandingkan `role === ...`.",
      from: { pathNot: "^src/lib/authz/" },
      to: { path: "^src/db/schema/roles" },
    },
    {
      name: "no-circular",
      severity: "error",
      comment: "Ketergantungan melingkar. Pecah seam-nya.",
      from: {},
      to: { circular: true },
    },
    {
      name: "no-orphans",
      severity: "warn",
      comment: "Berkas tidak dipakai siapa pun. Hapus atau sambungkan.",
      from: {
        orphan: true,
        pathNot: [
          "\\.(d\\.ts|config\\.(js|cjs|mjs|ts))$",
          "^src/app/.+/(page|layout|loading|error|not-found|route)\\.tsx?$",
          "^src/app/(globals\\.css|favicon)",
        ],
      },
      to: {},
    },
    {
      name: "no-dev-deps-in-src",
      severity: "error",
      comment: "devDependency terbawa ke bundel produksi.",
      from: { path: "^src/", pathNot: "\\.(test|spec)\\.tsx?$" },
      to: { dependencyTypes: ["npm-dev"] },
    },
  ],

  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "\\.(test|spec)\\.tsx?$|^src/test/" },
    tsPreCompilationDeps: true,
    tsConfig: { fileName: "tsconfig.json" },
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      mainFields: ["module", "main", "types"],
    },
    reporterOptions: {
      text: { highlightFocused: true },
    },
  },
};
