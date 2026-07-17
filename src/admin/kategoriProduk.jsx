import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
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

// daftar produk di satu kategori, kebuka dari card kategori di page produk
export default function KategoriProduk() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [kategori, setKategori] = useState(null)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [cari, setCari] = useState('')
  const [status, setStatus] = useState('semua')
  const [sortir, setSortir] = useState('baru')

  useEffect(() => {
    // ambil kategorinya + produk yang masuk kategori itu
    Promise.all([
      supabase.from('categories').select('*').eq('id', id).single(),
      supabase
        .from('products')
        .select('*, variants(price), profiles(store)')
        .eq('category_id', id)
        .order('created_at', { ascending: false }),
    ]).then(([kat, prod]) => {
      setKategori(kat.data)
      setProducts(prod.data || [])
      setLoading(false)
    })
  }, [id])

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

  if (loading) return <p className="text-kabut text-center py-16">Sebentar ya...</p>

  if (!kategori)
    return (
      <div className="text-center py-16">
        <p className="text-kabut">Kategorinya gak ketemu nih.</p>
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
        / <span className="text-putih">{kategori.name}</span>
      </p>
      <h1 className="font-bold text-2xl mt-2">{kategori.name}</h1>

      {/* cari + filter status + urutan */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
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
        <p className="text-kabut text-center py-16">Belum ada produk di kategori ini.</p>
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
    </div>
  )
}
