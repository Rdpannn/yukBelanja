import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import supabase from '../lib/supabase'
import { ambilDiskon, potongHarga } from '../lib/diskon'
import Card from '../components/card'
import Filter from '../components/filter'
import Pagination from '../components/pagination'

// halaman semua produk, lanjutan dari section Produk Terbaru di home
export default function Produk() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [diskon, setDiskon] = useState({})
  const [loading, setLoading] = useState(true)
  const [halaman, setHalaman] = useState(1)
  // kategori dari home ikut kebawa lewat url (?kategori=...)
  const [params] = useSearchParams()
  const [filter, setFilter] = useState({
    kategori: params.get('kategori') || '',
    sortir: 'baru',
    min: '',
    maks: '',
  })

  useEffect(() => {
    // ambil semua produk + kategori buat pilihan filter + diskon event
    Promise.all([
      supabase
        .from('products')
        .select('*, variants(price), profiles(store)')
        .eq('status', 'aktif')
        .order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
      ambilDiskon(),
    ]).then(([prod, kat, dis]) => {
      setProducts(prod.data || [])
      setCategories(kat.data || [])
      setDiskon(dis.map)
      setLoading(false)
    })
  }, [])

  // harga buat filter & sortir ngikutin diskon yang lagi jalan
  function harga(p) {
    return potongHarga(p.price, diskon[p.id]?.diskon || 0)
  }

  // saring sesuai filter terus diurutin
  const hasil = products
    .filter((p) => !filter.kategori || String(p.category_id) === filter.kategori)
    .filter((p) => {
      const h = harga(p)
      if (filter.min && h < Number(filter.min)) return false
      if (filter.maks && h > Number(filter.maks)) return false
      return true
    })
    .sort((a, b) => {
      if (filter.sortir === 'murah') return harga(a) - harga(b)
      if (filter.sortir === 'mahal') return harga(b) - harga(a)
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
        / <span className="text-putih">Produk</span>
      </p>

      <div className="flex items-end justify-between gap-4 mt-4">
        <div>
          <h1 className="font-bold text-2xl">Semua Produk</h1>
          <p className="text-kabut text-sm mt-1">{hasil.length} produk</p>
        </div>
        <Filter
          categories={categories}
          terpakai={filter}
          terapkan={(f) => {
            setFilter(f)
            setHalaman(1)
          }}
        />
      </div>

      {products.length === 0 ? (
        <p className="text-kabut text-center py-16">
          Belum ada produk yang mejeng di sini. Balik lagi nanti ya.
        </p>
      ) : hasil.length === 0 ? (
        <p className="text-kabut text-center py-16">
          Gak ada produk yang cocok sama filtermu. Coba ubah filternya yuk.
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
