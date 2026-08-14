# Workflow: pakai skill vendor

Cline tidak punya sistem skill seperti Claude Code. Skill di
`skills/vendor/mattpocock/` adalah berkas prompt biasa. Cara memanggilnya: **baca
berkasnya, lalu ikuti prosesnya.**

## Cara pakai

Ketik di Cline:

```
Baca skills/vendor/mattpocock/<kategori>/<nama>/SKILL.md dan ikuti prosesnya untuk: <tugas>
```

Kalau `SKILL.md` menyebut berkas pendamping (`tests.md`, `mocking.md`,
`ADR-FORMAT.md`, `CONTEXT-FORMAT.md`, `DEEPENING.md`, `LOGIC.md`, `UI.md`,
`AGENT-BRIEF.md`, `HTML-REPORT.md`), baca juga berkas itu sebelum mulai.

**Abaikan** di setiap `SKILL.md`:
- frontmatter `disable-model-invocation` — konvensi Claude Code
- folder `agents/openai.yaml` — format Codex
- instruksi "invoke skill X" — di sini artinya: baca `SKILL.md` skill itu

## Pintasan yang sering dipakai

| Mau apa | Perintah |
|---|---|
| Bikin kuesioner buat Pak Indra | `Baca skills/vendor/mattpocock/productivity/to-questionnaire/SKILL.md, lalu ubah pertanyaan terbuka di docs/OPEN-QUESTIONS.md jadi kuesioner.` |
| Serah-terima sebelum konteks habis | `Baca skills/vendor/mattpocock/productivity/handoff/SKILL.md dan padatkan sesi ini.` |
| Mulai fitur test-first | `Baca skills/vendor/mattpocock/engineering/tdd/SKILL.md + tests.md, lalu kerjakan <tiket>.` |
| Kejar bug | `Baca skills/vendor/mattpocock/engineering/diagnosing-bugs/SKILL.md, lalu diagnosa <gejala>.` |
| Review sebelum merge | `Baca skills/vendor/mattpocock/engineering/code-review/SKILL.md, review perubahan sejak <commit>.` |
| Pecah rencana jadi tiket | `Baca skills/vendor/mattpocock/engineering/to-tickets/SKILL.md, pecah docs/BUILD-PLAN.md Irisan <n>.` |
| Digrill sebelum putuskan | `Baca skills/vendor/mattpocock/engineering/grill-with-docs/SKILL.md, grill gua soal <keputusan>.` |

## Urutan yang tidak boleh dilanggar

Skill user-invoked boleh memanggil skill model-invoked, **tidak boleh memanggil skill
user-invoked lain.** Kalau Cline mulai berantai `to-tickets` -> `implement` ->
`code-review` sendiri tanpa lu suruh, hentikan.

## Kalau bentrok

`.clinerules/` menang atas `skills/vendor/`. Selalu. Lihat `AGENTS.md`.
