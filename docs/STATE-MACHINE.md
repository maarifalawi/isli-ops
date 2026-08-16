# STATE-MACHINE.md

> Semua transisi status di sistem. Agent: dilarang membuat status baru atau
> transisi yang tidak ada di sini. Setiap transisi **wajib** menulis audit log.
>
> **Mapping nama (Irisan 5, keputusan user Q-IRIS5-2, 17 Agu 2026):** skema
> database adalah sumber kebenaran. Nama di dokumen ini dipetakan ke nilai
> enum `job_status`:
>
> | Dokumen (konseptual) | Skema (`job_status`) |
> |---|---|
> | SUBMITTED | DIAJUKAN |
> | APPROVED_L1 | DISETUJUI_1 |
> | CANCELLED | DIBATALKAN |
> | DRAFT, FINAL, UNLOCK_REQUESTED | sama di keduanya |
>
> `UNLOCK_REQUESTED` adalah state nyata di enum (Q-IRIS5-1) — pekerjaan
> menunggu keputusan Owner; detail pengajuannya di `cost_reopen_requests`.

---

## 1. Job

```
                    ┌──────────────────────────────────┐
                    │            reject               │
                    v                                 │
  [DRAFT] ──submit──> [SUBMITTED] ──approve_l1──> [APPROVED_L1]
     ^                                                    │
     │                                                approve_final
     │                                                    v
     │                                                 [FINAL] ────┐
     │                                                    ^        │
     │                                              approve_unlock │
     │                                                    │    request_unlock
     └─────────── unlock_granted ───────── [UNLOCK_REQUESTED] <──┘

  [DRAFT] ──cancel──> [CANCELLED]   (terminal)
```

### Aturan transisi

| Dari | Aksi | Ke | Siapa | Syarat |
|---|---|---|---|---|
| DRAFT | `submit` | SUBMITTED | Maker | selling & buying tidak kosong; semua invariant costing lolos |
| DRAFT | `cancel` | CANCELLED | Maker, Manager | belum punya invoice |
| SUBMITTED | `approve_l1` | APPROVED_L1 | Manager | approver ≠ maker |
| SUBMITTED | `reject` | DRAFT | Manager | wajib alasan |
| APPROVED_L1 | `approve_final` | FINAL | Owner | approver ≠ maker |
| APPROVED_L1 | `reject` | DRAFT | Owner | wajib alasan; **semua approval direset** |
| FINAL | `request_unlock` | UNLOCK_REQUESTED | Manager, Finance | wajib alasan |
| UNLOCK_REQUESTED | `unlock_granted` | DRAFT | Owner | **SEMUA approval direset ke nol** (R6.2) |
| UNLOCK_REQUESTED | `unlock_denied` | FINAL | Owner | wajib alasan |

### Invariant

| ID | Aturan |
|---|---|
| J-INV-1 | Job berstatus `FINAL` **menolak semua** perubahan charge line, header, dan kurs. |
| J-INV-2 | Unlock **selalu** mengembalikan ke `DRAFT`, tidak pernah ke `APPROVED_L1`. |
| J-INV-3 | Job yang sudah punya invoice `ISSUED` **tidak boleh** di-unlock. Harus lewat pembatalan invoice dulu. |
| J-INV-4 | Job yang invoice-nya sudah `PAID` **tidak boleh** di-unlock sama sekali (R6.3). |
| J-INV-5 | Approver tidak boleh sama dengan maker pada tahap mana pun. |
| J-INV-6 | Setiap transisi menulis satu baris `audit_log` berisi aktor, status lama, status baru, alasan, timestamp. Aksi audit: SUBMIT, CANCEL, APPROVE_L1, REJECT, APPROVE_FINAL, REQUEST_UNLOCK, UNLOCK_GRANTED, UNLOCK_DENIED (Q-IRIS5-7). |
| J-INV-7 | **Irisan 5 (Q-IRIS5-8):** `DIBATALKAN` juga terminal — charge line, header, kurs, dan realokasi terkunci sama seperti FINAL. `isEditable` = hanya DRAFT; `isLocked` = FINAL \| DIBATALKAN. |
| J-INV-8 | **Irisan 5 (Q-IRIS5-3):** reject (level apa pun) dan unlock_granted menaikkan `jobs.approval_cycle` — semua approval cycle lama gugur; submit ulang memulai cycle baru (tidak menabrak `uq_approval_sekali`). |

---

## 2. Customer Invoice

```
[DRAFT] ──issue──> [ISSUED] ──send──> [SENT] ────pay_full────> [PAID]
                       │                 │                        
                       │                 └──pay_partial──> [PARTIALLY_PAID] ──pay_full──> [PAID]
                       │
                       └──cancel──> [CANCELLED]

[SENT] / [PARTIALLY_PAID] ──(jatuh tempo lewat)──> flag OVERDUE (bukan status)
```

| Dari | Aksi | Ke | Siapa | Syarat |
|---|---|---|---|---|
| — | `create` | DRAFT | Finance | Job `FINAL` **dan** Proof of Delivery diterima (R9.4) |
| DRAFT | `issue` | ISSUED | Finance | nomor invoice dialokasikan; angka pajak dibekukan |
| ISSUED | `send` | SENT | Finance | tanggal kirim dicatat; jatuh tempo dihitung |
| ISSUED | `cancel` | CANCELLED | Finance Manager | wajib alasan; nomor **tidak** dipakai ulang |
| SENT | `pay_partial` | PARTIALLY_PAID | Finance | jumlah > 0 dan < sisa |
| SENT / PARTIALLY_PAID | `pay_full` | PAID | Finance | sisa == 0 |

### Invariant

| ID | Aturan |
|---|---|
| I-INV-1 | Invoice `ISSUED` ke atas **membekukan** angka pajaknya. Perubahan aturan pajak di kemudian hari tidak boleh mengubah invoice lama. |
| I-INV-2 | Nomor invoice yang dibatalkan **tidak pernah** dipakai ulang. |
| I-INV-3 | `PAID` adalah **terminal**. Tidak ada jalan kembali. Koreksi harus lewat credit note (Phase 2). |
| I-INV-4 | Baris at-cost menghasilkan Invoice Reimburse terpisah tanpa PPN. |
| I-INV-5 | `OVERDUE` adalah **turunan** dari tanggal, bukan kolom status. Jangan simpan sebagai state. |

---

## 3. Vendor Invoice (AP)

```
[RECEIVED] ──verify──> [VERIFIED] ──approve──> [APPROVED_TO_PAY] ──pay──> [PAID]
     │                      │
     │                      └──dispute──> [DISPUTED] ──resolve──> [VERIFIED]
     │                                          │
     └──reject──> [REJECTED]                   └──request_revision──> [AWAITING_VENDOR]
```

| Dari | Aksi | Ke | Siapa | Syarat |
|---|---|---|---|---|
| — | `receive` | RECEIVED | AP Staff | `UNIQUE(vendor_id, vendor_invoice_no)` (R7.1) |
| RECEIVED | `verify` | VERIFIED | AP Staff | dicocokkan ke charge line job |
| RECEIVED | `reject` | REJECTED | AP Staff | wajib alasan |
| VERIFIED | `dispute` | DISPUTED | Finance Manager | wajib alasan |
| DISPUTED | `request_revision` | AWAITING_VENDOR | Finance Manager | alur Bu Niken: minta revisi ke vendor |
| AWAITING_VENDOR | `receive_revision` | RECEIVED | AP Staff | nomor invoice baru dari vendor |
| VERIFIED | `approve` | APPROVED_TO_PAY | Finance Manager | — |
| APPROVED_TO_PAY | `pay` | PAID | AP Staff | **wajib** cek status; sistem menolak kalau sudah PAID |

### Invariant

| ID | Aturan |
|---|---|
| V-INV-1 | `UNIQUE(vendor_id, vendor_invoice_no)` ditegakkan di **database**, bukan hanya aplikasi. |
| V-INV-2 | Sistem memunculkan peringatan bila ada nomor sangat mirip pada vendor yang sama (kasus `01A`/`01B`). Peringatan, bukan blokir. |
| V-INV-3 | Aksi `pay` wajib menampilkan status pembayaran terkini sebelum konfirmasi (R7.2). |
| V-INV-4 | Invoice vendor `PAID` mengunci charge line terkait — `actual` tidak bisa diubah lagi. |
| V-INV-5 | Verifikasi mengisi `actual` pada charge line; selisih terhadap `pencadangan` dihitung otomatis. |

---

## 4. Charge Line — pencadangan vs actual

```
[PENCADANGAN] ──vendor invoice diverifikasi──> [ACTUAL] ──invoice vendor PAID──> [LOCKED]
```

| Status | Arti |
|---|---|
| `PENCADANGAN` | Baru perkiraan. Boleh diubah selama job belum FINAL. |
| `ACTUAL` | Sudah ada invoice vendor. `selisih` terhitung. |
| `LOCKED` | Invoice vendor sudah dibayar. Nilai beku. |

✅ **Irisan 4e / ADR-0006 (Accepted 13 Agu 2026):** realokasi biaya antar
job terimplementasi sebagai proposal overlay di tabel `cost_reallocations`
(approval manajer, ≠ pembuat). Baris fisik charge_lines tidak pernah diubah.
Job asal ATAU tujuan yang `isLocked` (FINAL/DIBATALKAN) menolak realokasi.

---

## 5. Accounting Period

```
[OPEN] ──close──> [CLOSED] ──reopen (Owner saja)──> [OPEN]
```

| Invariant | Aturan |
|---|---|
| P-INV-1 | Periode `CLOSED` menolak job baru dan perubahan job dengan tanggal di dalamnya. |
| P-INV-2 | Hanya Owner yang boleh `reopen`, wajib alasan, tercatat di audit log. |
| P-INV-3 | Aturan periode ISLI: **tanggal invoice** menentukan periode. Catatan *"di gsoft bulan April"* berasal dari sistem perusahaan lama Pak Indra dan **tidak berlaku di sini** (R13, tertutup 13 Agu 2026). |
