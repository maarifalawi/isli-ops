# ADR-0006: Kebijakan Pemindahan Biaya Antar Job ("Dipecah")

- **Status:** ✅ **ACCEPTED** — Opsi B dipilih Pak Indra 13 Agu 2026
- **Tanggal:** 2026-08-13
- **Blokir:** DICABUT — Slice 4 boleh lanjut, tabel `cost_reallocations` sudah dibuat.

## Konteks

Catatan tangan meeting (DESCRIPTION.pdf hal. 5 & 6) memperlihatkan praktik yang
tidak pernah disebut dalam pembicaraan lisan:

```
TRUCKING (ADD COST) 1.300.000
   → DIPECAH KE 07-014    300.000
   → DIPECAH KE 07-016    300.000
   → sisa                 700.000
   alasan tertulis: "KARENA GP 7,27%"

SPIL DOORING 9.300.000
   → DIPECAH KE 07-011    400.000
   → DIPECAH KE 07-012    550.000
   → sisa               8.350.000
   alasan tertulis: "KARENA GP 6%"

STORDEM 581.998        → "masuk ke 07-001"
STORDEM 1.740.000      → "ditanggung agent"
THD                    → "dipindahkan ke no 07-006 & 014"
```

**Pembacaan yang jujur:** biaya dipindahkan dari job yang GP-nya terlihat buruk
ke job lain, dengan alasan yang secara eksplisit menyebut persentase GP.
Ini adalah *earnings management* di tingkat job.

### Kenapa ini keputusan terberat di proyek

Pak Indra ingin **melihat kebenaran** — *"kasih saya mata satu"*.
Tapi praktik yang berjalan justru **mengaburkan** GP per job.

Kalau sistem memindahkan praktik ini apa adanya, sistem baru akan menghasilkan
angka yang sama tidak bisa dipercayanya dengan Excel — hanya lebih cepat.
Seluruh nilai proyek hilang.

Tapi kalau sistem melarangnya tanpa persetujuan, sistem akan ditolak pengguna
dan mereka kembali ke Excel.

**Ini keputusan bisnis, bukan keputusan teknis. Developer tidak boleh memutuskan
sendiri.**

## Opsi

### Opsi A — Larang total
Biaya melekat permanen pada job tempat ia terjadi. GP jelek terlihat jelek.

- ➕ GP per job 100% jujur. Tujuan Pak Indra tercapai sepenuhnya.
- ➕ Paling sederhana untuk dibangun dan diaudit.
- ➖ Mengubah cara kerja yang sudah berjalan.
- ➖ Risiko: pengguna memasukkan angka "kreatif" sejak awal untuk menghindari
  GP jelek. Masalah berpindah ke hulu, tidak hilang.

### Opsi B — Izinkan dengan jejak audit penuh ⭐ **REKOMENDASI**
Ada entitas `cost_reallocation` eksplisit. Setiap pemindahan wajib:
asal, tujuan, nominal, **alasan tertulis**, dan approval level manajer.

Setiap job menampilkan **dua angka berdampingan**:

| | GP Asli | GP Setelah Realokasi |
|---|---|---|
| Job 07-013 | 7,27% | 12,4% |

Dashboard menampilkan **keduanya** dan sebuah metrik baru:
total nilai realokasi per bulan.

- ➕ Praktik nyata tetap bisa dijalankan, adopsi aman.
- ➕ Pak Indra tetap melihat kebenaran — bahkan mendapat visibilitas **baru**
  yang belum pernah ada: berapa banyak biaya yang digeser dan kenapa.
- ➕ Perilaku menjadi terlihat, sehingga otomatis terkoreksi sendiri.
- ➖ Lebih kompleks: satu tabel tambahan, dua set perhitungan GP.

### Opsi C — Izinkan bebas, tanpa jejak
Seperti Excel sekarang.

- ➕ Tidak ada perubahan kebiasaan.
- ➖ **Menghapus seluruh alasan proyek ini ada.** Tidak direkomendasikan.

## Rekomendasi

**Opsi B.**

Alasannya: opsi ini satu-satunya yang memenuhi kedua kebutuhan sekaligus.
Pak Indra mendapat kebenaran, tim tetap bisa bekerja seperti biasa, dan
perusahaan mendapat informasi yang selama ini tidak pernah terlihat sama sekali
— yaitu **seberapa sering dan seberapa besar biaya digeser antar job**.

Ada kemungkinan sebagian realokasi sebenarnya **sah secara operasional**
(misalnya satu invoice trucking memang mencakup tiga job). Opsi B menangkap
kasus sah itu dengan benar sekaligus menyorot kasus yang motifnya kosmetik.
Opsi A akan salah menangani kasus sah tersebut.

## Cara membawakan ke Pak Indra

Jangan menuduh. Bawakan sebagai pertanyaan netral:

> "Pak, di catatan ada biaya trucking yang dipecah ke beberapa job. Ini kadang
> memang karena satu invoice mencakup beberapa job. Bapak mau sistem
> mencatatnya sebagai pemindahan resmi dengan alasan dan approval, supaya Bapak
> bisa lihat GP asli dan GP setelah penyesuaian? Atau Bapak mau biaya melekat
> permanen di job asalnya saja?"

## Keputusan

> ✅ **DIPUTUSKAN 13 Agu 2026 — Opsi B.** Pak Indra memilih izinkan dengan
> jejak audit penuh, sesuai rekomendasi. Diimplementasikan sebagai tabel
> `cost_reallocations` (`src/db/schema/index.ts`): setiap realokasi mencatat
> job asal, job tujuan, nominal, alasan wajib, dan approval manajer
> (`approved_by` ≠ `created_by`, pola yang sama seperti R6/R16/R17). Job tetap
> menyimpan charge line aslinya utuh di job asal — realokasi hanya "menandai"
> sebagian nilainya sebagai dipindahkan secara logis untuk keperluan
> perhitungan GP, bukan memindahkan baris fisik. GP asli dan GP setelah
> realokasi ditampilkan berdampingan di setiap job (lihat R5.3).
