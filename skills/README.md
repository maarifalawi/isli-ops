# Skills

Dua kelompok. Jangan campur.

```
skills/
├─ isli-*/                    <- punya kita, spesifik domain ISLI
└─ vendor/mattpocock/         <- disalin apa adanya dari mattpocock/skills (MIT)
```

## Kenapa disalin, bukan di-install

Installer resminya ada dua: plugin Claude Code (`claude plugins install
mattpocock-skills`) dan `npx skills@latest add mattpocock/skills`. **Keduanya tidak
menyebut Cline sama sekali.** README-nya menargetkan Claude Code dan Codex; tiap skill
membawa `agents/openai.yaml` (format Codex) dan frontmatter `disable-model-invocation`
(konvensi Claude Code). Cline tidak membaca satu pun dari itu.

Jadi skill ini di-*vendor* sebagai berkas biasa yang kita miliki, lalu dijembatani ke
Cline lewat `.clinerules/workflows/`. Isi `SKILL.md`-nya tetap utuh — itu prompt yang
bagus, cuma cara pemanggilannya yang beda.

**Jangan jalankan `npx skills update`.** Salinan ini sudah kita adaptasi; pembaruan
otomatis akan menimpanya. Kalau mau tarik versi baru, tarik manual dan diff.

## Yang AKTIF untuk ISLI

| Skill | Dipakai kapan |
|---|---|
| `productivity/to-questionnaire` | 63 pertanyaan terbuka -> kuesioner siap kirim ke Pak Indra |
| `engineering/grill-with-docs` | Rapat Fase 0. Menghasilkan ADR + glosarium sambil jalan |
| `productivity/handoff` | Tiap sesi Cline mau habis konteks. **Ini pengganti graphify.** |
| `engineering/tdd` | Golden test Rp 1 Diametral cuma jalan dengan disiplin merah-hijau |
| `engineering/diagnosing-bugs` | Mengejar selisih Rp 1 tanpa `toBeCloseTo` |
| `engineering/code-review` | Dua sumbu: standar repo + kesetiaan pada spek |
| `engineering/to-tickets` | Memecah `docs/BUILD-PLAN.md` jadi tiket tracer-bullet |
| `engineering/domain-modeling` | Menajamkan glosarium. **Baca peringatan di bawah.** |
| `engineering/implement` | Eksekusi tiket |
| `engineering/wizard` | Provisioning Supabase, secret CI, domain — langkah yang cuma manusia bisa |
| `misc/setup-pre-commit` | Husky + lint-staged + typecheck + test. Jalankan di Irisan 0 |
| `productivity/writing-for-agents` | Tiap kali nulis/ubah `.clinerules` atau `AGENTS.md` |
| `productivity/wait-what` | Kalau penjelasan lu ke Pak Indra tidak nyantol |

## Yang DITUNDA

| Skill | Kenapa belum |
|---|---|
| `engineering/triage` | Belum ada issue tracker berisi. Aktif setelah Irisan 2 |
| `engineering/wayfinder` | Untuk pekerjaan yang lebih besar dari peta kita. `BUILD-PLAN.md` sudah jadi peta |
| `engineering/improve-codebase-architecture` | Butuh kode. Belum ada kode |
| `engineering/codebase-design` | Sama. Aktif bersamaan dengan dependency-cruiser |
| `in-progress/setup-ts-deep-modules` | Pasang di Irisan 1, sesudah `src/` berdiri |
| `misc/git-guardrails-claude-code` | **Hook Claude Code, tidak jalan di Cline.** Ganti dengan branch protection di GitHub |
| `engineering/prototype` | Prototipe sudah jadi (`prototype/index.html`) |
| `engineering/research` | Mendelegasikan ke background agent; Cline tidak punya itu |
| `misc/migrate-to-shoehorn`, `misc/scaffold-exercises` | Tidak relevan |
| `in-progress/writing-*`, `loop-me`, `claude-handoff` | Eksperimental / khusus Claude |

## ⚠ Dua tabrakan yang harus diingat

1. **`engineering/tdd` vs `.clinerules/04-testing.md`.** Disiplin merah-hijau Matt lebih
   matang; aturan kita lebih spesifik ISLI (golden fixtures, larangan `toBeCloseTo`).
   Kalau bentrok, **`.clinerules/` menang.**
2. **`engineering/domain-modeling` bisa menimpa `docs/CONTEXT.md`.** Berkas itu hasil
   membedah 7 dokumen sumber. Kalau skill ini minta menulis ulang `CONTEXT.md`,
   **tolak** — suruh dia menambah, bukan mengganti.

Aturan pemutusnya sudah ditulis di `AGENTS.md`.

## Lisensi

`skills/vendor/mattpocock/` — MIT, lihat `LICENSE` di dalamnya. Hak cipta Matt Pocock.
