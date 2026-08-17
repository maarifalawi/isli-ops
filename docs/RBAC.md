# Hak Akses

**Revisi 13 Agu 2026** — klien mengonfirmasi hanya **4 user**. Rancangan lama
7 peran diringkas jadi **3 peran**.

---

## Peran

| Peran | Siapa | Jumlah |
|---|---|---|
| `OWNER` | Pak Indra | 1 |
| `MANAGER` | Bu Niken | 1 |
| `STAFF` | 2 karyawan | 2 |

Cocok persis dengan alur yang Pak Indra sebut:

```
maker  ->  approval 1   ->  approval final
STAFF      MANAGER          OWNER
```

> **Peran diringkas, izin tidak.** Pengecekan tetap berbasis izin
> (`job.approve_final`), bukan berbasis peran (`role === "OWNER"`).
> Kalau nanti ISLI tumbuh jadi 10 orang, tinggal tambah peran — tanpa
> menyentuh satu pun logika bisnis.

---

## Matriks izin

| Izin | OWNER | MANAGER | STAFF |
|---|:---:|:---:|:---:|
| `job.create` | ✓ | ✓ | ✓ |
| `job.edit_draft` | ✓ | ✓ | ✓ sendiri |
| `job.submit` | ✓ | ✓ | ✓ |
| `job.cancel` | ✓ | ✓ | ✓ sendiri |
| `job.approve_first` | ✓ | ✓ | ✗ |
| `job.reject` | ✓ | ✓ | ✗ |
| `job.approve_final` | ✓ | ✗ | ✗ |
| `job.request_unlock` | ✓ | ✓ | ✗ |
| `job.unlock` | ✓ | ✗ | ✗ |
| `invoice.draft` | ✓ | ✓ | ✓ |
| `invoice.issue` | ✓ | ✓ | ✗ |
| `invoice.void` | ✓ | ✗ | ✗ |
| `payment.record` | ✓ | ✓ | ✓ |
| `vendor_invoice.create` | ✓ | ✓ | ✓ |
| `vendor_invoice.verify` | ✓ | ✓ | ✗ |
| `vendor_invoice.approve_pay` | ✓ | ✓ | ✗ |
| `vendor_invoice.mark_paid` | ✓ | ✓ | ✗ |
| `vendor_invoice.unlock_paid` | ✓ | ✗ | ✗ |
| `masterdata.edit` | ✓ | ✓ | ✗ |
| `settings.edit` | ✓ | ✗ | ✗ |
| `user.manage` | ✓ | ✗ | ✗ |
| `report.view_all` | ✓ | ✓ | ✗ |
| `report.view_own` | ✓ | ✓ | ✓ |
| `audit.view` | ✓ | ✓ | ✗ |

**Setiap `✗` di tabel ini wajib punya test.** Lihat `.clinerules/04-testing.md`.
> **Irisan 5 (Q-IRIS5-4, 17 Agu 2026):** `job.cancel` (O✓M✓S✓ — STAFF
> hanya job miliknya, dicek `maker_id` di service), `job.reject` (O✓M✓S✗ —
> reject di DIAJUKAN oleh Manager, di DISETUJUI_1 oleh Owner), dan
> `job:request_unlock` kini terpakai nyata. Nama izin mengikuti KODE
> (`job:approve_first`); alias lama `job.approve_1` dipensiunkan.
>
> **Irisan 6 (17 Agu 2026):** izin invoice kini terpakai nyata di
> `src/lib/invoice/`: `invoice.draft` (create/edit/hapus DRAFT) O✓M✓S✓,
> `invoice.issue` (issue/send) O✓M✓S✗, `invoice.void` **OWNER saja**
> (keputusan konflik #1 — void = aksi uang serius, konsisten approve_final),
> dan `payment.record` (pay_partial/pay_full) O✓M✓S✓ kini ada di
> `authz.ACTIONS` + matriks PERMISSIONS. Mapping nama STATE-MACHINE.md §2:
> "Finance" = OWNER+MANAGER.
>
> **Irisan 7 (17 Agu 2026, keputusan D2/D3):** izin invoice vendor terpakai
> nyata di `src/lib/vendor-invoice/`. Nama mengikuti KODE (`vendor:aksi`):
> `vendor_invoice:create` (receive) O✓M✓S✓; `vendor_invoice:verify`
> **BARU** O✓M✓S✗ — verifikasi = aksi finansial (isi `actual_idr`), verifier
> wajib ≠ penerima (R-A1); `vendor_invoice:mark_paid` (pay) O✓M✓S✗;
> `vendor_invoice:unlock_paid` (batal + buka-kunci DIBAYAR) **OWNER saja**
> (R-A5). `vendor_invoice.approve_pay` versi lama = alias konseptual
> `mark_paid` — STATE.md 7-state (approve→APPROVED_TO_PAY) sudah dilipat ke
> 4-state skema (lihat STATE-MACHINE.md §3).


---

## Aturan yang tidak boleh dilanggar

### R-A1 — Pembuat tidak boleh menyetujui pekerjaannya sendiri

```ts
if (job.createdBy === actor.id) throw new ForbiddenError("maker tidak boleh approve")
```

🔴 **Belum diputuskan:** kalau MANAGER yang membuat job, siapa yang jadi
approval 1? Pilihannya: OWNER merangkap, atau approval 1 dilewati. (**Q56**)

### R-A2 — Approval final hanya OWNER

Tidak ada pendelegasian. Tidak ada mode darurat. Kalau Pak Indra cuti, job
menunggu. Ini keputusan bisnis yang dia nyatakan sendiri.

🔴 **Belum diputuskan:** benar-benar tidak ada pengganti saat cuti? (**Q57**)

### R-A3 — Membuka kunci menghanguskan semua approval

Kata Pak Indra sendiri:

> "Pada saat saya udah final, mau ngebongkar ini, semua orang mesti mulai
> prosesnya dari awal lagi."

```
approval_cycle += 1   ->  semua approval siklus lama gugur
```

Bukan efek samping. Ini yang dia minta.

### R-A4 — Alur membuka kunci sesuai permintaan Bu Niken

```
MANAGER minta revisi ke vendor
   -> MANAGER mengajukan pembukaan  (job.request_unlock)
      -> OWNER memutuskan            (job.unlock)
         -> siklus approval naik     (R-A3)
```

Alasan pembukaan **wajib diisi** dan masuk `audit_log`.

### R-A5 — Invoice vendor yang sudah dibayar terkunci

Kata Bu Niken: kalau sudah terbayar, harus terkunci. Hanya OWNER yang bisa
membatalkan, dan wajib menyertakan alasan.

### R-A6 — STAFF tidak boleh melihat GP

GP, margin, dan seluruh laporan laba **tidak tampil** untuk STAFF — tidak di
layar, tidak di API, tidak di ekspor.

Disaring di lapisan query, bukan disembunyikan lewat CSS.

🔴 **Perlu dikonfirmasi:** apakah benar staf tidak boleh lihat margin?
(**Q58**)

---

## Cara penerapan

Semua pengecekan lewat satu pintu (ADR-0004):

```ts
assertCan(actor, "job.approve_final", job)
```

Dilarang:

```ts
if (user.role === "OWNER") { ... }        // ❌ cek peran langsung
{isOwner && <TombolApprove />}            // ❌ UI sebagai satu-satunya penjaga
```

UI boleh menyembunyikan tombol demi kerapian, tapi **server tetap harus
menolak**. Menyembunyikan tombol itu kenyamanan, bukan keamanan.

---

## Yang sengaja belum ada

| Fitur | Alasan |
|---|---|
| Peran khusus SALES | Belum ada tim sales terpisah |
| Peran khusus AP | Digabung ke MANAGER |
| Peran VIEWER / auditor | Belum diminta — tambahkan saat KAP butuh |
| Izin per teamspace | Satu kantor, tidak perlu |
| SSO / Google Workspace | 🔴 belum ditanya (**Q59**) |
