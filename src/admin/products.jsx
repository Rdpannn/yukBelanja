import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import supabase from '../lib/supabase'

// label + warna chip per status produk
const statusInfo = {
  aktif: { label: 'Aktif', warna: 'text-ijo' },
  ditangguhkan: { label: 'Ditangguhkan', warna: 'text-kuning' },
  dihapus: { label: 'Dihapus', warna: 'text-merah' },
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

// semua produk di yukBelanja, admin ngawasin dari sini
export default function Products() {
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [cari, setCari] = useState('')
  const [status, setStatus] = useState('semua')
  const [sortir, setSortir] = useState('baru')

  useEffect(() => {
    // ambil semua produk + daftar kategori buat section atas
    Promise.all([
      supabase
        .from('products')
        .select('*, variants(price), profiles(store), categories(name)')
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
    ]).then(([prod, kat]) => {
      setProducts(prod.data || [])
      setCategories(kat.data || [])
      setLoading(false)
    })
  }, [])

  // jumlah produk aktif per kategori buat angka di card
  function jumlahAktif(id) {
    return products.filter((p) => p.category_id === id && p.status === 'aktif').length
  }

  // saring sesuai status + kata cari, terus diurutin
  const kata = cari.toLowerCase()
  const tampil = products
    .filter((p) => status === 'semua' || p.status === status)
    .filter(
      (p) =>
        p.name.toLowerCase().includes(kata) ||
        (p.profiles?.store || '').toLowerCase().includes(kata)
    )
    .sort((a, b) => (sortir === 'lama' ? a.id - b.id : b.id - a.id))

  return (
    <div>
      <p className="text-xs text-kabut">
        Kelola Sistem / <span className="text-putih">Produk</span>
      </p>
      <h1 className="font-bold text-2xl mt-2">Produk</h1>

      {loading ? (
        <p className="text-kabut text-center py-16">Sebentar ya...</p>
      ) : (
        <>
          {/* card kategori, pola sama kayak kartu status di overview yukJualan */}
          <h2 className="font-semibold text-lg mt-6">Kategori</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-4">
            {categories.map((k) => (
              <div key={k.id} className="bg-panel rounded-(--radius-kartu) p-6">
                <p className="text-kabut text-sm truncate">{k.name}</p>
                {/* angka + keterangannya satu grup, jaraknya dirapetin */}
                <p className="font-bold text-2xl mt-2">{jumlahAktif(k.id)}</p>
                <p className="text-kabut text-xs mt-0.5">produk aktif</p>
                {/* link kecil ke halaman produk kategori ini, ditaro pojok kanan bawah */}
                <div className="flex justify-end mt-2">
                  <Link to={'/admin/products/kategori/' + k.id} className="text-neon text-xs hover:underline">
                    Lihat
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* daftar semua produk */}
          <h2 className="font-semibold text-lg mt-8">Semua Produk</h2>

          {/* cari + filter status + urutan */}
          <div className="flex flex-col sm:flex-row gap-3 mt-4">
            <div className="relative flex-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={16} height={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-kabut">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Cari nama produk atau toko"
                className="w-full bg-naik rounded-(--radius-input) pl-11 pr-4 py-2.5 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon"
              />
            </div>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="bg-naik text-putih rounded-(--radius-input) px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neon cursor-pointer"
            >
              <option value="semua">Semua Status</option>
              <option value="aktif">Aktif</option>
              <option value="ditangguhkan">Ditangguhkan</option>
              <option value="dihapus">Dihapus</option>
            </select>
            <select
              value={sortir}
              onChange={(e) => setSortir(e.target.value)}
              className="bg-naik text-putih rounded-(--radius-input) px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neon cursor-pointer"
            >
              <option value="baru">Terbaru</option>
              <option value="lama">Terlama</option>
            </select>
          </div>

          {products.length === 0 ? (
            <p className="text-kabut text-center py-16">Belum ada produk.</p>
          ) : tampil.length === 0 ? (
            <p className="text-kabut text-center py-16">Gak ada produk yang cocok sama pencarianmu.</p>
          ) : (
            <div className="mt-4 space-y-3">
              {tampil.map((p) => (
                <div
                  key={p.id}
                  onClick={() => navigate('/admin/products/' + p.id)}
                  className="bg-panel hover:bg-naik rounded-(--radius-kartu) p-4 flex items-center gap-4 transition duration-200 cursor-pointer"
                >
                  {p.images?.[0] ? (
                    <img src={p.images[0]} alt={p.name} className="w-16 h-16 object-cover rounded-(--radius-input) shrink-0" />
                  ) : (
                    <div className="w-16 h-16 bg-naik rounded-(--radius-input) shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{p.name}</p>
                    <p className="text-neon text-sm font-medium">{hargaTeks(p)}</p>
                    <p className="text-kabut text-xs mt-0.5 truncate">
                      {p.profiles?.store} · {p.sold || 0} terjual
                    </p>
                  </div>
                  <span className={'bg-naik text-xs rounded-full px-3 py-1 shrink-0 ' + statusInfo[p.status].warna}>
                    {statusInfo[p.status].label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
