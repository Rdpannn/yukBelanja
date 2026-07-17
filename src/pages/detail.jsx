import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'
import { ambilDiskon, potongHarga } from '../lib/diskon'
import Bayar from '../components/bayar'
import Mundur from '../components/mundur'
import TokoBox from '../components/tokoBox'

// icon keranjang yang ada tanda plusnya
function IconTambahKeranjang() {
  return (
    <span className="relative inline-block">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" width={22} height={22}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 0 0-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 0 0-16.536-1.84M7.5 14.25 5.106 5.272M6 20.25a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Zm12.75 0a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
      </svg>
      <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-neon text-putih text-[11px] font-bold rounded-full flex items-center justify-center leading-none">
        +
      </span>
    </span>
  )
}

export default function Detail() {
  const { id } = useParams()
  const { session } = useAuth()
  const navigate = useNavigate()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [dipilih, setDipilih] = useState(0) // index foto yang lagi ditampilin gede
  const [qty, setQty] = useState(1)
  const [proses, setProses] = useState(false)
  const [masuk, setMasuk] = useState(false) // udah berhasil masuk keranjang
  const [varianDipilih, setVarianDipilih] = useState(null) // varian yang lagi dipilih user
  const [warnVarian, setWarnVarian] = useState(false) // mau beli tapi belum milih varian
  const [buka, setBuka] = useState(false) // modal pesanan buat beli langsung
  const [promo, setPromo] = useState(null) // diskon event yang lagi jalan buat produk ini

  useEffect(() => {
    // ambil produknya sekalian nama kategori + nama toko + variannya + diskon event
    // produk yang dihapus / ditangguhkan admin dianggep gak ada
    Promise.all([
      supabase
        .from('products')
        .select('*, categories(name), profiles(store, phone, avatar), variants(*)')
        .eq('id', id)
        .eq('status', 'aktif')
        .single(),
      ambilDiskon(),
    ]).then(([{ data }, dis]) => {
      setProduct(data)
      setPromo(dis.map[id] || null)
      setLoading(false)
    })
  }, [id])

  // slot flash sale abis: cek ulang, harga balik normal kalau diskonnya udah gak jalan
  function segarkanDiskon() {
    ambilDiskon().then((dis) => setPromo(dis.map[id] || null))
  }

  // simpan produk ke cart_items, dipake tombol keranjang sama tombol beli
  async function simpanCart() {
    // cek udah ada di keranjang belum (produk + varian yang sama), kalau ada tinggal nambah qty nya
    let cek = supabase
      .from('cart_items')
      .select('id, qty')
      .eq('user_id', session.user.id)
      .eq('product_id', product.id)
    cek = varianDipilih ? cek.eq('variant_id', varianDipilih.id) : cek.is('variant_id', null)
    const { data: lama } = await cek.maybeSingle()

    if (lama) {
      await supabase.from('cart_items').update({ qty: lama.qty + qty }).eq('id', lama.id)
    } else {
      await supabase.from('cart_items').insert({
        user_id: session.user.id,
        product_id: product.id,
        variant_id: varianDipilih ? varianDipilih.id : null,
        qty,
      })
    }
    // kasih tau navbar biar badge keranjangnya ikut update
    window.dispatchEvent(new Event('cart'))
  }

  // produk yang punya varian wajib dipilih dulu variannya
  function belumMilih() {
    if (product.variants?.length > 0 && !varianDipilih) {
      setWarnVarian(true)
      return true
    }
    return false
  }

  // masukin ke keranjang doang, tetep di halaman ini
  async function tambahKeranjang() {
    if (!session) {
      navigate('/login')
      return
    }
    if (belumMilih()) return
    setProses(true)
    await simpanCart()
    setProses(false)
    setMasuk(true)
  }

  // beli langsung: muncul modal pesanan di sini, gak lewat keranjang
  function beli() {
    if (!session) {
      navigate('/login')
      return
    }
    if (belumMilih()) return
    setBuka(true)
  }

  if (loading) return <p className="text-kabut text-center py-24">Sebentar ya...</p>

  if (!product)
    return (
      <div className="text-center py-24">
        <p className="text-kabut">Produknya gak ketemu nih.</p>
        <Link to="/" className="text-neon font-medium mt-2 inline-block">
          Balik ke beranda
        </Link>
      </div>
    )

  const fotos = product.images || []
  const varians = [...(product.variants || [])].sort((a, b) => a.id - b.id)
  const adaVarian = varians.length > 0
  // harga & stok ngikutin varian yang dipilih, sebelum milih pake angka produknya
  const stokAktif = varianDipilih ? varianDipilih.stock : product.stock
  const habis = stokAktif < 1

  const diskon = promo ? promo.diskon : 0
  const rp = (n) => 'Rp' + n.toLocaleString('id-ID')

  // teks harga: udah milih varian tampil harga variannya, belum milih tampil rentang
  // lagi diskon = harganya dipotong dulu, harga aslinya buat coret (rentang gak dicoret biar gak kepanjangan)
  let hargaTeks
  let hargaNormal = null
  if (varianDipilih) {
    hargaTeks = rp(potongHarga(varianDipilih.price, diskon))
    if (diskon > 0) hargaNormal = rp(varianDipilih.price)
  } else if (adaVarian) {
    const min = Math.min(...varians.map((v) => v.price))
    const max = Math.max(...varians.map((v) => v.price))
    if (min === max) {
      hargaTeks = rp(potongHarga(min, diskon))
      if (diskon > 0) hargaNormal = rp(min)
    } else {
      hargaTeks = rp(potongHarga(min, diskon)) + ' - ' + rp(potongHarga(max, diskon))
    }
  } else {
    hargaTeks = rp(potongHarga(product.price, diskon))
    if (diskon > 0) hargaNormal = rp(product.price)
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* tombol kembali */}
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-sm text-kabut hover:text-neon cursor-pointer"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={16} height={16}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
        </svg>
        Kembali
      </button>

      {/* breadcrumb */}
      <p className="text-sm text-kabut mt-4">
        <Link to="/" className="hover:text-neon">
          Beranda
        </Link>
        {product.categories && (
          <>
            {' / '}
            <Link to={'/?kategori=' + product.category_id} className="hover:text-neon">
              {product.categories.name}
            </Link>
          </>
        )}
        {' / '}
        <span className="text-putih">{product.name}</span>
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
        {/* galeri foto */}
        <div>
          {fotos[dipilih] ? (
            <img
              src={fotos[dipilih]}
              alt={product.name}
              className="w-full aspect-square object-cover rounded-(--radius-kartu)"
            />
          ) : (
            <div className="w-full aspect-square bg-panel rounded-(--radius-kartu)" />
          )}

          {/* thumbnail nya, yang kepilih dikasih ring pink */}
          {fotos.length > 1 && (
            <div className="flex gap-3 mt-4 overflow-x-auto pb-1">
              {fotos.map((url, i) => (
                <button
                  key={url}
                  onClick={() => setDipilih(i)}
                  className={
                    'shrink-0 rounded-(--radius-input) overflow-hidden cursor-pointer ' +
                    (i === dipilih ? 'ring-2 ring-neon' : 'opacity-60 hover:opacity-100')
                  }
                >
                  <img src={url} alt="" className="w-16 h-16 object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* info produk */}
        <div>
          <h1 className="font-semibold text-[22px] leading-snug">{product.name}</h1>
          <div className="flex items-baseline flex-wrap gap-x-3 gap-y-1 mt-3">
            <p className="text-neon font-bold text-3xl">{hargaTeks}</p>
            {/* badge nempel di kanan harga diskonnya, baru harga coret */}
            {diskon > 0 && (
              <span className="bg-naik text-neon text-xs font-semibold rounded-full px-2.5 py-1">
                -{diskon}%
              </span>
            )}
            {hargaNormal && <p className="text-kabut text-lg line-through">{hargaNormal}</p>}
          </div>

          {/* info event yang bikin produk ini diskon */}
          {promo && (
            <p className="text-sm mt-2">
              <span className="text-neon font-medium">{promo.event.nama}</span>
              <span className="text-kabut">
                {promo.event.tipe === 'flash_sale' ? (
                  <>
                    {' · Berakhir dalam '}
                    <Mundur detik={promo.event.sisa} habis={segarkanDiskon} />
                  </>
                ) : (
                  <>
                    {' · Sampai '}
                    {new Date(promo.event.selesai).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </>
                )}
              </span>
            </p>
          )}

          <div className="flex items-center gap-3 mt-4 text-sm">
            {product.categories && (
              <Link
                to={'/?kategori=' + product.category_id}
                className="bg-naik text-kabut hover:text-neon rounded-full px-3 py-1"
              >
                {product.categories.name}
              </Link>
            )}
            {habis ? (
              <span className="bg-naik text-neon rounded-full px-3 py-1">Habis</span>
            ) : (
              <span className="text-kabut">Stok: {stokAktif}</span>
            )}
          </div>

          {/* box toko nya, bisa ditelpon atau diklik buat mampir ke tokonya */}
          {product.profiles?.store && (
            <div className="mt-4">
              <TokoBox
                id={product.seller_id}
                nama={product.profiles.store}
                avatar={product.profiles.avatar}
                hp={product.profiles.phone}
                gelap
              />
            </div>
          )}

          {/* pilihan varian, wajib dipilih sebelum masuk keranjang */}
          {adaVarian && (
            <div className="mt-6">
              <p className="text-sm font-medium">Pilih varian</p>
              <div className="flex flex-wrap gap-2 mt-2">
                {varians.map((v) => (
                  <button
                    key={v.id}
                    onClick={() => {
                      setVarianDipilih(v)
                      setQty(1)
                      setWarnVarian(false)
                    }}
                    disabled={v.stock < 1}
                    className={
                      'rounded-full px-4 py-1.5 text-sm border transition duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed ' +
                      (varianDipilih?.id === v.id
                        ? 'border-neon text-neon'
                        : 'border-naik text-kabut hover:border-neon hover:text-putih')
                    }
                  >
                    {v.name}
                  </button>
                ))}
              </div>
              {warnVarian && <p className="text-neon text-sm mt-2">Pilih variannya dulu ya.</p>}
            </div>
          )}

          {/* qty + tombol keranjang */}
          <div className="flex items-center gap-4 mt-8">
            <div className="flex items-center bg-naik rounded-full">
              <button
                onClick={() => setQty(Math.max(1, qty - 1))}
                disabled={habis}
                className="px-4 py-2 hover:text-neon cursor-pointer disabled:opacity-40"
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-medium">{qty}</span>
              <button
                onClick={() => setQty(Math.min(stokAktif, qty + 1))}
                disabled={habis}
                className="px-4 py-2 hover:text-neon cursor-pointer disabled:opacity-40"
              >
                +
              </button>
            </div>

            <button
              onClick={tambahKeranjang}
              disabled={habis || proses}
              className="bg-naik text-putih hover:text-neon rounded-(--radius-input) p-3 transition duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <IconTambahKeranjang />
            </button>

            <button
              onClick={beli}
              disabled={habis || proses}
              className="bg-neon hover:bg-neon-terang text-putih font-semibold rounded-full px-8 py-3 transition duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Beli
            </button>
          </div>

          {masuk && (
            <p className="text-sm text-kabut mt-4">
              Udah masuk keranjang.{' '}
              <Link to="/cart" className="text-neon font-medium">
                Lihat keranjang →
              </Link>
            </p>
          )}

          {/* modal pesanan buat beli langsung */}
          {buka && (
            <Bayar
              pesanan={{
                produk: {
                  product_id: product.id,
                  variant_id: varianDipilih ? varianDipilih.id : null,
                  qty,
                },
              }}
              total={potongHarga(varianDipilih ? varianDipilih.price : product.price, diskon) * qty}
              jumlah={qty}
              tutup={() => setBuka(false)}
            />
          )}

          <h2 className="font-semibold text-lg mt-10">Deskripsi</h2>
          <p className="text-kabut text-[15px] leading-relaxed mt-2 whitespace-pre-line max-w-[70ch]">
            {product.description}
          </p>
        </div>
      </div>
    </div>
  )
}
