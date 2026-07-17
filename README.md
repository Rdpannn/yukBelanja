# YukBelanja

Aplikasi e-commerce sederhana: pembeli bisa belanja dan bayar lewat Midtrans (sandbox), penjual punya dashboard sendiri buat kelola produk & pesanan, dan admin bisa memantau seluruh sistem.

**Demo:** https://yuk-belanja.vercel.app

## Fitur

- Login & register: Google OAuth + email/password (verifikasi magic link)
- Katalog produk: kategori, pencarian, filter harga, halaman toko, banner, flash sale & event diskon
- Produk bervarian (harga & stok per varian), multi-foto
- Keranjang + checkout: alamat tersimpan, pembayaran via Midtrans Snap (sandbox)
- Lifecycle pesanan: menunggu → dikirim → sampai → selesai, dengan pembatalan, retur (bukti foto/video), auto-batal 24 jam & auto-selesai 2x24 jam (pg_cron)
- Notifikasi dalam aplikasi untuk pembeli & penjual
- Dashboard seller (YukJualan): etalase, pesanan masuk, pembatalan & retur, grafik penjualan
- Dashboard admin: kelola pengguna/toko/kategori/banner/event, moderasi produk, grafik transaksi

## Tech Stack

React + Vite · Tailwind CSS · Supabase (Postgres, Auth, Storage, Edge Functions) · Midtrans Snap (sandbox) · Recharts · Vercel

## Cara Jalanin di Lokal

1. `npm install`
2. Bikin project di [Supabase](https://supabase.com), jalankan `supabase/schema.sql` di SQL Editor
3. Nyalakan provider Google di Authentication → Providers, dan extension `pg_cron` di Database → Extensions
4. Copy `.env.example` jadi `.env`, isi URL + anon key Supabase dan client key Midtrans sandbox
5. Deploy edge function: `supabase functions deploy pay`, lalu set secret `MIDTRANS_SERVER_KEY` (server key Midtrans sandbox)
6. `npm run dev`

## Akun & Role

- **Pembeli**: daftar sendiri dari halaman utama
- **Penjual**: daftar dari "Mulai jualan" atau upgrade lewat "Buka Toko", langsung aktif tanpa approval
- **Admin**: dibuat manual dari dashboard Supabase (Authentication → Add user), lalu ubah role-nya jadi `admin` di tabel `profiles`. Login di `/admin/login`

## Testing Pembayaran

Semua pembayaran jalan di mode sandbox Midtrans, jadi gak ada uang beneran yang kepotong.

Contoh tes pakai QRIS:

1. Checkout sampai popup Midtrans muncul, pilih **QRIS**, nanti muncul gambar QR code
2. Klik kanan gambar QR-nya → **Copy image address** (salin alamat gambar)
3. Buka [simulator Midtrans](https://simulator.sandbox.midtrans.com), pilih **QRIS**
4. Paste link gambar tadi ke kolom yang tersedia, lalu klik bayar
5. Balik ke popup Midtrans, klik **Check status** (QRIS sandbox kadang gak update otomatis). Status pesanan langsung berubah jadi dibayar

Metode lain (GoPay, transfer bank virtual account, dll) juga bisa dites lewat simulator yang sama.
