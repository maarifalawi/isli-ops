# Workflow: Tambah Charge Code Baru

Jalankan dengan `/add-charge-code.md`.

> ⚠️ Charge code menentukan perlakuan pajak. Salah menambah = invoice salah
> = masalah pajak. Ikuti langkah ini persis.

## Langkah

### 1. Verifikasi dulu — jangan langsung tambah

```
Cek fixtures/charge-codes.csv — apakah sudah ada?
Cek docs/CONTEXT.md §5 — apakah cuma beda penulisan?
```

Contoh yang **bukan** kode baru:
- `THC LOLO JKT` → varian dari `THC`, bedakan lewat deskripsi
- `TRUCKING` vs `CHARGE TRUCKING` → ⚠️ perlu konfirmasi, mungkin beda makna
- `METTA LINTAS` vs `META LINTAS` → itu nama vendor, bukan charge code

### 2. Kumpulkan informasi wajib

**Semua field ini wajib. Kalau ada yang tidak diketahui, BERHENTI dan tanya
Bu Niken. Jangan pakai default.**

| Field | Pertanyaan |
|---|---|
| `code` | Kode singkat, huruf kapital |
| `name_id` | Nama lengkap bahasa Indonesia |
| `category` | FREIGHT / TERMINAL / DARAT / DOKUMEN / INTERNAL |
| `default_leg` | 1, 2, 3, atau kosong |
| `is_taxable` | Kena PPN 1,1% atau tidak? |
| `is_at_cost_default` | Diteruskan tanpa margin? |
| `pph23_applicable` | Kena potong PPh 23? |
| `segment_scope` | DOM / EXIM / BOTH |

### 3. Pertanyaan pajak — jangan ditebak

> "Bu, untuk charge `XXX` ini:
> 1. Kena PPN 1,1% atau masuk reimbursement?
> 2. Kalau kita bayar ke vendor, kena potong PPh 23 2% atau tidak?
> 3. Ini dipakai untuk domestik, EXIM, atau dua-duanya?"

### 4. Tambahkan

1. Baris baru di `fixtures/charge-codes.csv`
2. Entri di `docs/CONTEXT.md` §5 dengan penjelasan artinya
3. Migrasi seed (kalau sistem sudah jalan)
4. Test: charge code baru menghasilkan perhitungan pajak yang benar

### 5. Verifikasi
```bash
pnpm test:golden
```
Pastikan tidak ada job existing yang berubah hasilnya.

## Yang dilarang

- Menambah charge code dengan menebak atribut pajaknya
- Memakai `is_taxable: true` sebagai default "aman" — tidak ada default aman
- Menambah kode hanya karena muncul sekali di satu dokumen tanpa konfirmasi
