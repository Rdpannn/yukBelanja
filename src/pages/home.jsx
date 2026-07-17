import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import supabase from '../lib/supabase'
import { ambilDiskon } from '../lib/diskon'
import Card from '../components/card'
import Banner from '../components/banner'
import Mundur from '../components/mundur'

// icon petir buat judul section flash sale
function IconPetir() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" width={22} height={22} className="text-neon">
      <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 0 1 .359.852L12.982 9.75h7.268a.75.75 0 0 1 .548 1.262l-10.5 11.25a.75.75 0 0 1-1.272-.71l1.992-7.302H3.75a.75.75 0 0 1-.548-1.262l10.5-11.25a.75.75 0 0 1 .913-.143Z" clipRule="evenodd" />
    </svg>
  )
}

// link selengkapnya di pojok kanan judul section
function Selengkapnya({ ke }) {
  return (
    <Link to={ke} className="flex items-center gap-1 text-neon hover:text-neon-terang text-sm font-medium shrink-0">
      Selengkapnya
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" width={14} height={14}>
        <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
      </svg>
    </Link>
  )
}

export default function Home() {
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [diskon, setDiskon] = useState({ jalan: [], map: {} })
  const [loading, setLoading] = useState(true)
  // kategori kepilih dibawa lewat url (?kategori=...) biar bisa dilink dari halaman lain
  const [params, setParams] = useSearchParams()
  const kategori = params.get('kategori') || ''

  useEffect(() => {
    // ambil produk terbaru + daftar kategori buat chips + event yang lagi jalan
    Promise.all([
      supabase.from('products').select('*, variants(price), profiles(store)').eq('status', 'aktif').order('created_at', { ascending: false }),
      supabase.from('categories').select('*').order('name'),
      ambilDiskon(),
    ]).then(([prod, kat, dis]) => {
      setProducts(prod.data || [])
      setCategories(kat.data || [])
      setDiskon(dis)
      setLoading(false)
    })
  }, [])

  // slot flash sale abis: ambil ulang data diskon biar sectionnya ilang & harga balik normal
  function segarkanDiskon() {
    ambilDiskon().then(setDiskon)
  }

  // klik chip kategori, klik lagi yang sama buat balikin semua produk
  function pilihKategori(id) {
    if (kategori === String(id)) setParams({})
    else setParams({ kategori: String(id) })
  }

  // home cuma nampilin 8 produk per section, sisanya di halaman selengkapnya
  const tampil = kategori ? products.filter((p) => String(p.category_id) === kategori) : products

  // nama kategori kepilih buat judul section
  const namaKategori = categories.find((k) => String(k.id) === kategori)?.name

  // produk peserta sebuah event, diambil dari daftar produk yang udah kefetch
  function produkEvent(ev) {
    const ids = ev.produk.map((p) => p.product_id)
    return products.filter((p) => ids.includes(p.id))
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pb-6">
      {/* carousel banner dari admin, kalau kosong balik ke hero lama */}
      <Banner />

      {/* daftar produk terbaru + chips kategori */}
      <section id="produk" className="pb-14 scroll-mt-20">
        {/* chips kategori, digeser samping kalau kepanjangan */}
        {categories.length > 0 && (
          <div className="flex gap-2 mb-8 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {categories.map((k) => (
              <button
                key={k.id}
                onClick={() => pilihKategori(k.id)}
                className={
                  'shrink-0 rounded-full px-4 py-2 text-sm transition duration-200 cursor-pointer ' +
                  (String(k.id) === kategori ? 'bg-neon text-putih font-medium' : 'bg-naik text-kabut hover:text-putih')
                }
              >
                {k.name}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between gap-4 mb-8">
          <h2 className="font-semibold text-[22px]">{namaKategori || 'Produk Terbaru'}</h2>
          {/* kategori yang lagi kepilih ikut kebawa ke halaman semua produk */}
          <Selengkapnya ke={'/produk' + (kategori ? '?kategori=' + kategori : '')} />
        </div>

        {loading ? (
          <p className="text-kabut text-center py-16">Sebentar ya...</p>
        ) : tampil.length === 0 ? (
          <p className="text-kabut text-center py-16">
            {kategori
              ? 'Belum ada produk di kategori ini. Cek kategori lain yuk.'
              : 'Belum ada produk yang mejeng di sini. Balik lagi nanti ya.'}
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {tampil.slice(0, 8).map((p) => (
              <Card key={p.id} product={p} diskon={diskon.map[p.id]?.diskon} />
            ))}
          </div>
        )}
      </section>

      {/* section event yang lagi jalan, flash sale paling atas */}
      {!loading &&
        diskon.jalan.map((ev) => {
          const isi = produkEvent(ev)
          if (isi.length === 0) return null
          return (
            <section key={ev.id} className="pb-14">
              <div className="flex items-center justify-between gap-4 mb-8">
                <div className="flex items-center flex-wrap gap-x-3 gap-y-1">
                  {ev.tipe === 'flash_sale' && <IconPetir />}
                  <h2 className="font-semibold text-[22px]">{ev.nama}</h2>
                  {ev.tipe === 'flash_sale' ? (
                    <p className="text-kabut text-sm">
                      Berakhir dalam{' '}
                      <span className="text-neon font-semibold">
                        <Mundur detik={ev.sisa} habis={segarkanDiskon} />
                      </span>
                    </p>
                  ) : (
                    <p className="text-kabut text-sm">
                      Sampai{' '}
                      {new Date(ev.selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  )}
                </div>
                <Selengkapnya ke={'/event/' + ev.id} />
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                {isi.slice(0, 8).map((p) => (
                  <Card key={p.id} product={p} diskon={diskon.map[p.id]?.diskon} />
                ))}
              </div>
            </section>
          )
        })}
    </div>
  )
}
