import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import supabase from '../lib/supabase'
import { ambilDiskon, potongHarga } from '../lib/diskon'
import Card from '../components/card'
import Filter from '../components/filter'
import Mundur from '../components/mundur'
import Pagination from '../components/pagination'

// icon petir buat judul flash sale
function IconPetir() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width={26} height={26} className="text-neon">
      <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clipRule="evenodd" />
    </svg>
  )
}

// halaman produk sebuah event, lanjutan dari section event di home
export default function Event() {
  const { id } = useParams()
  const [ev, setEv] = useState(null)
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [diskon, setDiskon] = useState({})
  const [loading, setLoading] = useState(true)
  const [halaman, setHalaman] = useState(1)
  const [filter, setFilter] = useState({ kategori: '', sortir: 'baru', min: '', maks: '' })

  useEffect(() => {
    muat()
  }, [id])

  // ambil event yang lagi jalan, terus produk-produk pesertanya
  async function muat() {
    const [dis, kat] = await Promise.all([
      ambilDiskon(),
      supabase.from('categories').select('*').order('name'),
    ])
    setCategories(kat.data || [])
    setDiskon(dis.map)

    const event = dis.jalan.find((e) => String(e.id) === id)
    setEv(event || null)
    if (event) {
      const ids = event.produk.map((p) => p.product_id)
      const { data } = await supabase
        .from('products')
        .select('*, variants(price), profiles(store)')
        .in('id', ids)
        .eq('status', 'aktif')
        .order('created_at', { ascending: false })
      setProducts(data || [])
    }
    setLoading(false)
  }

  // harga buat filter & sortir udah harga diskonnya
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
      return 0
    })

  const totalHalaman = Math.ceil(hasil.length / 12)
  const potongan = hasil.slice((halaman - 1) * 12, halaman * 12)

  if (loading) return <p className="text-kabut text-center py-24">Sebentar ya...</p>

  // eventnya gak aktif, udah lewat, atau id nya ngaco
  if (!ev)
    return (
      <div className="text-center py-24">
        <p className="text-kabut">Eventnya udah berakhir atau gak ketemu nih.</p>
        <Link to="/" className="text-neon font-medium mt-2 inline-block">
          Balik ke beranda
        </Link>
      </div>
    )

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* breadcrumb */}
      <p className="text-sm text-kabut">
        <Link to="/" className="hover:text-neon">
          Beranda
        </Link>{' '}
        / <span className="text-putih">{ev.nama}</span>
      </p>

      <div className="flex items-end justify-between gap-4 mt-4">
        <div>
          <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
            {ev.tipe === 'flash_sale' && <IconPetir />}
            <h1 className="font-bold text-2xl">{ev.nama}</h1>
            {ev.tipe === 'flash_sale' ? (
              <p className="text-kabut text-sm">
                Berakhir dalam{' '}
                <span className="text-neon font-semibold">
                  {/* waktunya abis = cek ulang, eventnya bakal ilang dari daftar yang jalan */}
                  <Mundur detik={ev.sisa} habis={muat} />
                </span>
              </p>
            ) : (
              <p className="text-kabut text-sm">
                Sampai{' '}
                {new Date(ev.selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
              </p>
            )}
          </div>
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
          Belum ada produk di event ini. Balik lagi nanti ya.
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
