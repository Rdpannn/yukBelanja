import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import supabase from '../lib/supabase'
import { ambilDiskon, potongHarga } from '../lib/diskon'
import Card from '../components/card'
import Pagination from '../components/pagination'

// halaman publik sebuah toko: info singkat + etalase produknya
export default function TokoDetail() {
  const { id } = useParams()
  const [toko, setToko] = useState(null)
  const [diskon, setDiskon] = useState({})
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [cari, setCari] = useState('')
  const [sortir, setSortir] = useState('baru')
  const [halaman, setHalaman] = useState(1)

  useEffect(() => {
    setLoading(true)
    // ambil profil tokonya + semua produknya
    Promise.all([
      supabase.from('profiles').select('store, avatar').eq('id', id).single(),
      supabase
        .from('products')
        .select('*, variants(price), profiles(store)')
        .eq('seller_id', id)
        .eq('status', 'aktif')
        .order('created_at', { ascending: false }),
      ambilDiskon(),
    ]).then(([prof, prod, dis]) => {
      setToko(prof.data)
      setProducts(prod.data || [])
      setDiskon(dis.map)
      setLoading(false)
    })
  }, [id])

  // balik ke halaman 1 tiap kata cari atau sortirnya ganti
  useEffect(() => {
    setHalaman(1)
  }, [cari, sortir])

  if (loading) return <p className="text-kabut text-center py-24">Sebentar ya...</p>

  // id nya bukan toko (atau gak ada)
  if (!toko?.store) return <p className="text-kabut text-center py-24">Tokonya gak ketemu nih.</p>

  // total kejual dari semua produk toko ini
  const terjual = products.reduce((t, p) => t + (p.sold || 0), 0)

  // harga buat sortir ngikutin diskon yang lagi jalan
  function harga(p) {
    return potongHarga(p.price, diskon[p.id]?.diskon || 0)
  }

  // saring sesuai kata cari terus diurutin
  const hasil = products
    .filter((p) => p.name.toLowerCase().includes(cari.toLowerCase()))
    .sort((a, b) => {
      if (sortir === 'murah') return harga(a) - harga(b)
      if (sortir === 'mahal') return harga(b) - harga(a)
      return 0 // terbaru, urutan dari supabase udah bener
    })

  const totalHalaman = Math.ceil(hasil.length / 12)
  const potongan = hasil.slice((halaman - 1) * 12, halaman * 12)

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* breadcrumb */}
      <p className="text-sm text-kabut">
        <Link to="/" className="hover:text-neon">
          Beranda
        </Link>{' '}
        / <span className="text-putih">{toko.store}</span>
      </p>

      {/* avatar + nama toko + angka ringkasnya */}
      <div className="flex items-center gap-4 mt-4">
        {toko.avatar ? (
          <img src={toko.avatar} alt={toko.store} referrerPolicy="no-referrer" className="w-16 h-16 rounded-full object-cover shrink-0" />
        ) : (
          <span className="w-16 h-16 rounded-full bg-naik text-neon font-bold text-2xl flex items-center justify-center shrink-0">
            {toko.store[0].toUpperCase()}
          </span>
        )}
        <div>
          <h1 className="font-bold text-2xl">{toko.store}</h1>
          <p className="text-kabut text-sm mt-1">
            {products.length} produk · {terjual} terjual
          </p>
        </div>
      </div>

      {products.length === 0 ? (
        <p className="text-kabut text-center py-16">Toko ini belum majang produk. Balik lagi nanti ya.</p>
      ) : (
        <>
          {/* cari + sortir produk toko ini */}
          <div className="flex flex-col sm:flex-row gap-3 mt-8">
            <div className="relative flex-1">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={16} height={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-kabut">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
              </svg>
              <input
                type="text"
                value={cari}
                onChange={(e) => setCari(e.target.value)}
                placeholder="Cari produk di toko ini"
                className="w-full bg-naik rounded-(--radius-input) pl-11 pr-4 py-2.5 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon"
              />
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
            <p className="text-kabut text-center py-16">Gak ada produk yang cocok sama pencarianmu.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5 mt-6">
                {potongan.map((p) => (
                  <Card key={p.id} product={p} diskon={diskon[p.id]?.diskon} />
                ))}
              </div>
              <Pagination halaman={halaman} total={totalHalaman} ganti={setHalaman} />
            </>
          )}
        </>
      )}
    </div>
  )
}
