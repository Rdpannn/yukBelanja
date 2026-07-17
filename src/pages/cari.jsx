import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import supabase from '../lib/supabase'
import { ambilDiskon, potongHarga } from '../lib/diskon'
import Card from '../components/card'
import Pagination from '../components/pagination'

export default function Cari() {
  const [products, setProducts] = useState([])
  const [diskon, setDiskon] = useState({})
  const [loading, setLoading] = useState(true)
  const [sortir, setSortir] = useState('baru')
  const [halaman, setHalaman] = useState(1)
  // kata cari dari navbar lewat url (?q=...)
  const [params] = useSearchParams()
  const q = params.get('q') || ''

  useEffect(() => {
    // ambil semua produk sekali, nyaringnya di sisi client aja
    Promise.all([
      supabase
        .from('products')
        .select('*, variants(price), profiles(store)')
        .eq('status', 'aktif')
        .order('created_at', { ascending: false }),
      ambilDiskon(),
    ]).then(([prod, dis]) => {
      setProducts(prod.data || [])
      setDiskon(dis.map)
      setLoading(false)
    })
  }, [])

  // balik ke halaman 1 tiap kata cari atau sortirnya ganti
  useEffect(() => {
    setHalaman(1)
  }, [q, sortir])

  // harga buat sortir ngikutin diskon yang lagi jalan
  function harga(p) {
    return potongHarga(p.price, diskon[p.id]?.diskon || 0)
  }

  // saring sesuai kata cari terus diurutin
  const hasil = products
    .filter((p) => p.name.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => {
      if (sortir === 'murah') return harga(a) - harga(b)
      if (sortir === 'mahal') return harga(b) - harga(a)
      return 0 // terbaru, urutan dari supabase udah bener
    })

  const totalHalaman = Math.ceil(hasil.length / 12)
  const potongan = hasil.slice((halaman - 1) * 12, halaman * 12)

  if (loading) return <p className="text-kabut text-center py-24">Sebentar ya...</p>

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* breadcrumb */}
      <p className="text-sm text-kabut">
        <Link to="/" className="hover:text-neon">
          Beranda
        </Link>{' '}
        / <span className="text-putih">Hasil Pencarian</span>
      </p>

      <div className="flex flex-wrap items-end justify-between gap-4 mt-4">
        <div>
          <h1 className="font-bold text-2xl">Hasil pencarian "{q}"</h1>
          <p className="text-kabut text-sm mt-1">{hasil.length} produk ketemu</p>
        </div>
        <select
          value={sortir}
          onChange={(e) => setSortir(e.target.value)}
          className="bg-naik text-putih rounded-(--radius-input) px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neon cursor-pointer"
        >
          <option value="baru">Terbaru</option>
          <option value="murah">Harga Terendah</option>
          <option value="mahal">Harga Tertinggi</option>
        </select>
      </div>

      {hasil.length === 0 ? (
        <p className="text-kabut text-center py-16">
          Gak ada produk yang cocok sama pencarianmu. Coba kata lain yuk.
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mt-8">
            {potongan.map((p) => (
              <Card key={p.id} product={p} diskon={diskon[p.id]?.diskon} />
            ))}
          </div>
          <Pagination halaman={halaman} total={totalHalaman} ganti={setHalaman} />
        </>
      )}
    </div>
  )
}
