import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import supabase from '../lib/supabase'

// label + warna chip status produk
const statusProduk = {
  aktif: { label: 'Aktif', warna: 'text-ijo' },
  ditangguhkan: { label: 'Ditangguhkan', warna: 'text-kuning' },
  dihapus: { label: 'Dihapus', warna: 'text-merah' },
}

// label + warna chip status order buat tabel riwayat
const statusOrder = {
  menunggu: { label: 'Menunggu Konfirmasi', warna: 'text-kabut' },
  dikirim: { label: 'Dikirim', warna: 'text-kuning' },
  sampai: { label: 'Sampai', warna: 'text-biru' },
  selesai: { label: 'Selesai', warna: 'text-ijo' },
  batal: { label: 'Dibatalkan', warna: 'text-merah' },
}

// tanggal dibikin format indonesia, contoh: 15 Juli 2026
function tanggal(waktu) {
  return new Date(waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// teks harga: kalau ada varian dengan harga beda, tampil rentangnya
function hargaTeks(p) {
  const v = p.variants || []
  if (v.length === 0) return 'Rp' + p.price.toLocaleString('id-ID')
  const min = Math.min(...v.map((x) => x.price))
  const max = Math.max(...v.map((x) => x.price))
  if (min === max) return 'Rp' + min.toLocaleString('id-ID')
  return 'Rp' + min.toLocaleString('id-ID') + ' - Rp' + max.toLocaleString('id-ID')
}

// detail 1 produk buat admin: info + riwayat transaksi + tombol moderasi
export default function Produk() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [riwayat, setRiwayat] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState('') // 'tangguh' / 'hapus' yang lagi kebuka
  const [alasan, setAlasan] = useState('')
  const [sampai, setSampai] = useState('') // tanggal akhir penangguhan
  const [tanya, setTanya] = useState(null) // confirm popup { teks, ya, merah, aksi }
  const [proses, setProses] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    // ambil produknya + riwayat transaksi yang udah dibayar
    Promise.all([
      supabase
        .from('products')
        .select('*, categories(name), profiles(store), variants(*)')
        .eq('id', id)
        .single(),
      supabase
        .from('order_items')
        .select('id, qty, price, variant_name, orders!inner(kode, status, created_at, receiver, payments!inner(status, metode))')
        .eq('product_id', id)
        .eq('orders.payments.status', 'paid')
        .order('id', { ascending: false }),
    ]).then(([prod, item]) => {
      setProduct(prod.data)
      setRiwayat(item.data || [])
      setLoading(false)
    })
  }, [id])

  // update produk di db terus samain tampilannya, dipake semua aksi moderasi
  async function ubah(isi) {
    setProses(true)
    setError('')
    const { error: err } = await supabase.from('products').update(isi).eq('id', id)
    setProses(false)
    if (err) {
      setError('Waduh, ada masalah. Coba lagi ya.')
      return false
    }
    setProduct({ ...product, ...isi })
    return true
  }

  // buka modal tangguhkan / hapus, isiannya dikosongin dulu
  function bukaModal(nama) {
    setAlasan('')
    setSampai('')
    setError('')
    setModal(nama)
  }

  // submit modal tangguhkan
  async function tangguhkan(e) {
    e.preventDefault()
    const ok = await ubah({
      status: 'ditangguhkan',
      alasan,
      tangguh_sejak: new Date().toISOString(),
      tangguh_sampai: sampai,
    })
    if (ok) setModal('')
  }

  // submit modal hapus (soft delete, riwayat pesanan tetep aman)
  async function hapus(e) {
    e.preventDefault()
    const ok = await ubah({ status: 'dihapus', alasan, tangguh_sejak: null, tangguh_sampai: null })
    if (ok) setModal('')
  }

  // confirm keluarin produk dari kategorinya
  function konfirmKategori() {
    setError('')
    setTanya({
      teks: 'Produk ini bakal dikeluarin dari kategorinya, tapi tetep tampil di YukBelanja.',
      ya: 'Ya, Keluarkan',
      merah: false,
      aksi: () => ubah({ category_id: null }),
    })
  }

  // confirm aktifin lagi produk yang ditangguhkan
  function konfirmAktif() {
    setError('')
    setTanya({
      teks: 'Produk ini bakal aktif lagi dan tampil di YukBelanja.',
      ya: 'Ya, Aktifkan',
      merah: false,
      aksi: () => ubah({ status: 'aktif', alasan: null, tangguh_sejak: null, tangguh_sampai: null }),
    })
  }

  async function jawabYa() {
    const ok = await tanya.aksi()
    if (ok) setTanya(null)
  }

  const inputCls =
    'w-full bg-naik rounded-(--radius-input) px-4 py-3 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon mt-1.5'

  if (loading) return <p className="text-kabut text-center py-16">Sebentar ya...</p>

  if (!product)
    return (
      <div className="text-center py-16">
        <p className="text-kabut">Produknya gak ketemu nih.</p>
        <Link to="/admin/products" className="text-neon font-medium mt-2 inline-block">
          Balik ke daftar produk
        </Link>
      </div>
    )

  return (
    <div>
      <p className="text-xs text-kabut">
        Kelola Sistem /{' '}
        <Link to="/admin/products" className="hover:text-neon">
          Produk
        </Link>{' '}
        / <span className="text-putih">{product.name}</span>
      </p>

      {/* info produknya */}
      <div className="bg-panel rounded-(--radius-kartu) p-6 mt-4 flex flex-col sm:flex-row gap-6">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-40 h-40 object-cover rounded-(--radius-input) shrink-0" />
        ) : (
          <div className="w-40 h-40 bg-naik rounded-(--radius-input) shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-bold text-2xl">{product.name}</h1>
            <span className={'bg-naik text-xs rounded-full px-3 py-1 ' + statusProduk[product.status].warna}>
              {statusProduk[product.status].label}
            </span>
          </div>
          <p className="text-neon font-bold text-xl mt-2">{hargaTeks(product)}</p>
          <p className="text-kabut text-sm mt-2">
            {product.profiles?.store}
            {product.categories && <span> · {product.categories.name}</span>}
          </p>
          <p className="text-kabut text-sm mt-1">
            Stok: {product.stock} · {product.sold || 0} terjual
          </p>

          {/* keterangan moderasi kalau produknya lagi kena */}
          {product.status === 'ditangguhkan' && (
            <p className="text-kuning text-sm mt-3">
              Ditangguhkan {product.tangguh_sejak && 'sejak ' + tanggal(product.tangguh_sejak) + ' '}
              sampe {tanggal(product.tangguh_sampai)}. Alasan: {product.alasan}
            </p>
          )}
          {product.status === 'dihapus' && (
            <p className="text-merah text-sm mt-3">Dihapus. Alasan: {product.alasan}</p>
          )}

          {/* tombol moderasi */}
          {product.status !== 'dihapus' && (
            <div className="flex flex-wrap gap-2 mt-5">
              {product.category_id && (
                <button
                  onClick={konfirmKategori}
                  className="border border-naik text-putih hover:border-neon text-xs font-medium rounded-full px-4 py-2 transition duration-200 cursor-pointer"
                >
                  Hapus dari Kategori
                </button>
              )}
              {product.status === 'aktif' ? (
                <button
                  onClick={() => bukaModal('tangguh')}
                  className="border border-kuning text-kuning hover:bg-kuning hover:text-dasar text-xs font-medium rounded-full px-4 py-2 transition duration-200 cursor-pointer"
                >
                  Tangguhkan
                </button>
              ) : (
                <button
                  onClick={konfirmAktif}
                  className="border border-ijo text-ijo hover:bg-ijo hover:text-dasar text-xs font-medium rounded-full px-4 py-2 transition duration-200 cursor-pointer"
                >
                  Aktifkan Lagi
                </button>
              )}
              <button
                onClick={() => bukaModal('hapus')}
                className="border border-merah text-merah hover:bg-merah hover:text-putih text-xs font-medium rounded-full px-4 py-2 transition duration-200 cursor-pointer"
              >
                Hapus Produk
              </button>
            </div>
          )}
        </div>
      </div>

      {/* riwayat transaksi produk ini, cuma yang udah dibayar */}
      <h2 className="font-semibold text-lg mt-8">Riwayat Transaksi</h2>
      {riwayat.length === 0 ? (
        <p className="text-kabut text-center py-16">Belum ada transaksi buat produk ini.</p>
      ) : (
        <div className="bg-panel rounded-(--radius-kartu) mt-4 overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="text-kabut text-xs text-left border-b border-naik">
                <th className="font-medium px-5 py-3">Pembeli</th>
                <th className="font-medium px-5 py-3">Metode Bayar</th>
                <th className="font-medium px-5 py-3">Tanggal</th>
                <th className="font-medium px-5 py-3">Status</th>
                <th className="font-medium px-5 py-3">Jumlah</th>
                <th className="font-medium px-5 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {riwayat.map((item) => (
                <tr key={item.id} className="border-b border-naik last:border-0">
                  <td className="px-5 py-3">{item.orders.receiver}</td>
                  <td className="px-5 py-3 text-kabut">{item.orders.payments.metode || '-'}</td>
                  <td className="px-5 py-3 text-kabut">{tanggal(item.orders.created_at)}</td>
                  <td className="px-5 py-3">
                    <span className={'bg-naik text-xs rounded-full px-3 py-1 ' + statusOrder[item.orders.status].warna}>
                      {statusOrder[item.orders.status].label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-kabut">
                    {item.qty}
                    {item.variant_name && ' (' + item.variant_name + ')'}
                  </td>
                  <td className="px-5 py-3 font-medium">
                    Rp{(item.price * item.qty).toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* modal tangguhkan produk */}
      {modal === 'tangguh' && (
        <div className="fixed inset-0 bg-dasar/80 flex items-center justify-center px-4 z-20">
          <form onSubmit={tangguhkan} className="bg-panel rounded-(--radius-kartu) p-8 md:p-10 w-full max-w-[420px]">
            <div className="flex items-start justify-between">
              <h2 className="font-bold text-2xl">Tangguhkan Produk</h2>
              <button
                type="button"
                onClick={() => setModal('')}
                className="text-kabut hover:text-putih text-2xl leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>
            <p className="text-kabut text-sm mt-2">
              Selama ditangguhkan, produk ini gak bakal tampil di YukBelanja.
            </p>

            <div className="mt-6">
              <label className="text-sm font-medium">Alasan</label>
              <textarea
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                rows={3}
                className={inputCls}
              />
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium">Ditangguhkan Sampai</label>
              <input
                type="date"
                value={sampai}
                onChange={(e) => setSampai(e.target.value)}
                min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)}
                className={inputCls + ' [color-scheme:dark]'}
              />
            </div>

            {error && <p className="text-merah text-sm mt-3">{error}</p>}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setModal('')}
                className="flex-1 border border-naik text-putih hover:border-neon text-sm font-semibold rounded-full px-5 py-2.5 transition duration-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={proses || !alasan.trim() || !sampai}
                className="flex-1 bg-neon hover:bg-neon-terang text-putih text-sm font-semibold rounded-full px-5 py-2.5 transition duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {proses ? 'Sebentar ya...' : 'Tangguhkan'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* modal hapus produk */}
      {modal === 'hapus' && (
        <div className="fixed inset-0 bg-dasar/80 flex items-center justify-center px-4 z-20">
          <form onSubmit={hapus} className="bg-panel rounded-(--radius-kartu) p-8 md:p-10 w-full max-w-[420px]">
            <div className="flex items-start justify-between">
              <h2 className="font-bold text-2xl">Hapus Produk</h2>
              <button
                type="button"
                onClick={() => setModal('')}
                className="text-kabut hover:text-putih text-2xl leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>
            <p className="text-kabut text-sm mt-2">
              Produk ini bakal dihapus dari YukBelanja dan etalase toko. Riwayat pesanan yang udah
              ada tetep aman.
            </p>

            <div className="mt-6">
              <label className="text-sm font-medium">Alasan</label>
              <textarea
                value={alasan}
                onChange={(e) => setAlasan(e.target.value)}
                placeholder="Tulis alasannya biar toko tau kenapa produknya dihapus"
                rows={3}
                className={inputCls}
              />
            </div>

            {error && <p className="text-merah text-sm mt-3">{error}</p>}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setModal('')}
                className="flex-1 border border-naik text-putih hover:border-neon text-sm font-semibold rounded-full px-5 py-2.5 transition duration-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={proses || !alasan.trim()}
                className="flex-1 bg-merah hover:opacity-90 text-putih text-sm font-semibold rounded-full px-5 py-2.5 transition duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {proses ? 'Sebentar ya...' : 'Hapus Produk'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* confirm popup buat hapus kategori / aktifin lagi */}
      {tanya && (
        <div className="fixed inset-0 bg-dasar/80 flex items-center justify-center px-4 z-20">
          <div className="bg-panel rounded-(--radius-kartu) p-8 w-full max-w-[380px] text-center">
            <p className="text-sm">{tanya.teks}</p>
            {error && <p className="text-merah text-sm mt-3">{error}</p>}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setTanya(null)}
                className="flex-1 border border-naik text-putih hover:border-neon text-sm font-semibold rounded-full px-5 py-2.5 transition duration-200 cursor-pointer"
              >
                Gak Jadi
              </button>
              <button
                onClick={jawabYa}
                disabled={proses}
                className={
                  'flex-1 text-putih text-sm font-semibold rounded-full px-5 py-2.5 transition duration-200 cursor-pointer disabled:opacity-60 ' +
                  (tanya.merah ? 'bg-merah hover:opacity-90' : 'bg-neon hover:bg-neon-terang')
                }
              >
                {proses ? 'Sebentar ya...' : tanya.ya}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
