# Issue tracker

Hasil menjalankan `setup-matt-pocock-skills` Bagian A secara manual (skill itu
menargetkan Claude Code; keputusannya dicatat di sini supaya `to-tickets`, `triage`,
dan `to-spec` tahu harus nulis ke mana).

## Keputusan: **Local markdown**

Issue hidup sebagai berkas di `.scratch/<fitur>/` di repo ini.

Alasan: proyek solo, satu developer (Alawi), belum ada remote GitHub yang disepakati.
GitHub Issues menambah bolak-balik tanpa pembeli — Pak Indra tidak akan membukanya.

## Format

```
.scratch/
└─ <slug-fitur>/
   ├─ 001-<slug-tiket>.md
   └─ 002-<slug-tiket>.md
```

Setiap tiket:

```markdown
# <judul>

- Status: todo | in-progress | blocked | done
- Irisan: <nomor dari docs/BUILD-PLAN.md>
- Blocked by: 001, 003   (kosongkan kalau tidak ada)
- Pertanyaan terkait: Q41, Q49  (dari docs/OPEN-QUESTIONS.md)

## Yang harus terjadi

## Cara tahu selesai

## Di luar cakupan
```

## PRs sebagai permukaan permintaan

**Mati.** Tidak ada kontributor eksternal.

## Kapan pindah ke GitHub Issues

Kalau developer kedua masuk, atau kalau Bu Niken mulai melaporkan bug langsung.
Sampai itu terjadi, jangan pindah.
