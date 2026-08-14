# Identitas Legal ISLI

Dipakai untuk kop invoice dan dokumen resmi.

> Sumber: ekstraksi `word/header2.xml` dan `word/footer1.xml` dari
> `KOP Surat ISLI VALID.docx`. File itu tidak punya teks di body — seluruh
> isinya gambar. Data di bawah diambil dari header/footer XML-nya.

---

## ✅ Sudah diketahui

| Field | Nilai | Sumber |
|---|---|---|
| Nama legal | **PT. INTEGRA SINERGI LOGITAMA INDONESIA** | header2.xml |
| Tagline | International and Domestic Freight Forwarding | header2.xml |
| Alamat | Ruko Symphoni Blok HX 1 No. 33, Pusaka Rakyat, Tarumajaya, Kab. Bekasi, Jawa Barat, 17214 | footer1.xml |
| Telepon | +62 21 8899 8723 | footer1.xml |
| Bank | DANAMON | invoice asli |
| Cabang | KCP HARAPAN INDAH - BEKASI | invoice asli |
| No. rekening | 003707391938 | invoice asli |
| Atas nama | PT. INTEGRA SINERGI LOGITAMA INDONESIA | invoice asli |

## 🔴 Masih kosong — wajib ditanyakan

| Field | Kenapa penting |
|---|---|
| **NPWP ISLI** | Wajib tercetak di invoice untuk keperluan pajak |
| Email resmi | Kontak di invoice |
| Website | Opsional, tapi ada di kebanyakan kop forwarder |
| Nomor izin usaha (NIB / SIUPAL / JPT) | Sering diminta customer korporat |
| Nama & jabatan penanda tangan invoice | Invoice asli hanya tertulis "FINANCE" |

> Ini masuk pertanyaan **Q20** di `OPEN-QUESTIONS.md`.
> Tanpa NPWP, invoice yang dicetak sistem **tidak sah** untuk keperluan pajak.

---

## Aset gambar

Diekstrak ke `docs/source-of-truth/kop-assets/`:

| File | Ukuran | Dugaan isi |
|---|---|---|
| `image1.png` | 390 KB | elemen kop (perlu dilihat) |
| `image2.png` | 475 KB | elemen kop (perlu dilihat) |
| `image3.jpeg` | 8 KB | kemungkinan logo asosiasi |
| `image4.png` | 1,8 KB | kemungkinan logo kecil / ikon |

### Untuk implementasi PDF

Jangan pakai PNG mentah dari kop lama untuk invoice sistem. Minta ke klien:

1. Logo **vektor** (`.svg` / `.ai` / `.eps`) — supaya tajam di semua ukuran cetak
2. Kalau tidak ada vektor, minta PNG transparan minimal **1200px**
3. Warna resmi perusahaan (kode hex)

PNG hasil ekstraksi hanya dipakai sebagai **acuan visual** saat menyusun layout,
bukan sebagai aset produksi.
