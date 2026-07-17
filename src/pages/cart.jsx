import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'
import { ambilDiskon, potongHarga } from '../lib/diskon'
import Bayar from '../components/bayar'

export default function Cart() {
  const { session } = useAuth()
  const [items, setItems] = useState([])
  const [diskon, setDiskon] = useState({}) // diskon event per produk
  const [pilih, setPilih] = useState([]) // id item yang dicentang buat ikut checkout
  const [loading, setLoading] = useState(true)
  const [kirim, setKirim] = useState(false) // modal data pengiriman, muncul pas klik checkout

  useEffect(() => {
    if (!session) return
    // ambil isi keranjang sekalian data produk + nama toko + varian produknya + diskon event
    Promise.all([
      supabase
        .from('cart_items')
        .select('id, qty, variant_id, products(id, name, price, stock, images, status, profiles(store), variants(id, name, price, stock))')
        .eq('user_id', session.user.id)
        .order('id', { ascending: false }),
      ambilDiskon(),
    ]).then(([{ data }, dis]) => {
      setItems(data || [])
      setDiskon(dis.map)
      // awalnya semua item yang bisa dibeli langsung kecentang
      setPilih((data || []).filter((i) => bisa(i)).map((i) => i.id))
      setLoading(false)
    })
  }, [session])

  // data turunan per item: varian yang dipilih, harga & stok yang dipake
  // harga udah dipotong diskon event kalau produknya lagi ikut event
  // belumPilih = produknya udah pake varian tapi item ini belum milih (dimasukin sebelum ada varian)
  function info(item) {
    const varians = item.products.variants || []
    const varian = varians.find((v) => v.id === item.variant_id)
    const belumPilih = varians.length > 0 && !varian
    const normal = varian ? varian.price : item.products.price
    const persen = diskon[item.products.id]?.diskon || 0
    return {
      varian,
      belumPilih,
      harga: potongHarga(normal, persen),
      normal,
      persen,
      stok: belumPilih ? 0 : varian ? varian.stock : item.products.stock,
    }
  }

  // item ini bisa dibeli gak (produknya masih aktif, gak habis & gak nunggu pilih varian)
  function bisa(item) {
    const x = info(item)
    return item.products.status === 'aktif' && !x.belumPilih && x.stok > 0
  }

  // centang / batal centang satu item
  function centang(id) {
    setPilih(pilih.includes(id) ? pilih.filter((x) => x !== id) : [...pilih, id])
  }

  // ubah jumlah barang, dibatesin 1 sampe stok
  async function ubahQty(item, beda) {
    const baru = Math.min(Math.max(1, item.qty + beda), info(item).stok)
    if (baru === item.qty) return
    await supabase.from('cart_items').update({ qty: baru }).eq('id', item.id)
    setItems(items.map((i) => (i.id === item.id ? { ...i, qty: baru } : i)))
    // badge navbar ikut update
    window.dispatchEvent(new Event('cart'))
  }

  // item yang belum punya varian akhirnya milih: kalau varian itu udah ada barisnya di keranjang, digabung
  async function pilihVarian(item, vid) {
    const kembar = items.find(
      (i) => i.id !== item.id && i.products.id === item.products.id && i.variant_id === vid
    )
    if (kembar) {
      await supabase.from('cart_items').update({ qty: kembar.qty + item.qty }).eq('id', kembar.id)
      await supabase.from('cart_items').delete().eq('id', item.id)
      setItems(
        items
          .filter((i) => i.id !== item.id)
          .map((i) => (i.id === kembar.id ? { ...i, qty: i.qty + item.qty } : i))
      )
      // centangan item lama pindah ke baris gabungannya
      setPilih([...pilih.filter((x) => x !== item.id && x !== kembar.id), kembar.id])
    } else {
      await supabase.from('cart_items').update({ variant_id: vid }).eq('id', item.id)
      setItems(items.map((i) => (i.id === item.id ? { ...i, variant_id: vid } : i)))
      // udah milih varian berarti bisa dibeli, langsung dicentang
      setPilih([...pilih.filter((x) => x !== item.id), item.id])
    }
    window.dispatchEvent(new Event('cart'))
  }

  // buang barang dari keranjang
  async function hapus(item) {
    await supabase.from('cart_items').delete().eq('id', item.id)
    setItems(items.filter((i) => i.id !== item.id))
    setPilih(pilih.filter((x) => x !== item.id))
    window.dispatchEvent(new Event('cart'))
  }

  // yang dihitung & ikut checkout cuma item yang bisa dibeli DAN dicentang
  const bisaDibeli = items.filter((i) => bisa(i))
  const kepilih = bisaDibeli.filter((i) => pilih.includes(i.id))
  const semuaKepilih = bisaDibeli.length > 0 && kepilih.length === bisaDibeli.length
  const total = kepilih.reduce((t, i) => t + info(i).harga * i.qty, 0)
  const jumlah = kepilih.reduce((t, i) => t + i.qty, 0)

  // centang semua / kosongin semua
  function centangSemua() {
    setPilih(semuaKepilih ? [] : bisaDibeli.map((i) => i.id))
  }


  if (loading) return <p className="text-kabut text-center py-24">Sebentar ya...</p>

  if (items.length === 0)
    return (
      <div className="text-center py-24 px-4">
        <p className="font-semibold text-lg">Keranjangmu masih kosong nih.</p>
        <p className="text-kabut mt-1">Yuk cari barang yang kamu suka.</p>
        <Link
          to="/"
          className="inline-block bg-neon hover:bg-neon-terang text-putih font-semibold rounded-full px-7 py-3 mt-6 transition duration-200"
        >
          Mulai Belanja
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
        / <span className="text-putih">Keranjang</span>
      </p>
      <h1 className="font-bold text-2xl mt-4">Keranjang Kamu</h1>

      <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6 mt-6 items-start">
        {/* daftar barang */}
        <div className="space-y-3">
          {/* centang semua item yang bisa dibeli sekaligus */}
          <label className="bg-panel rounded-(--radius-kartu) px-4 py-3 flex items-center gap-3 text-sm font-medium cursor-pointer">
            <input
              type="checkbox"
              checked={semuaKepilih}
              onChange={centangSemua}
              className="w-4 h-4 accent-neon cursor-pointer"
            />
            Pilih semua
          </label>

          {items.map((item) => {
            const { varian, belumPilih, harga, normal, persen, stok } = info(item)
            const mati = item.products.status !== 'aktif' // produknya dihapus / ditangguhkan admin
            const habis = !mati && !belumPilih && stok < 1
            return (
              <div key={item.id} className="bg-panel rounded-(--radius-kartu) p-4 flex gap-4">
                {/* centangan buat milih item yang mau di-checkout */}
                <input
                  type="checkbox"
                  checked={pilih.includes(item.id)}
                  onChange={() => centang(item.id)}
                  disabled={habis || belumPilih || mati}
                  className="w-4 h-4 accent-neon cursor-pointer self-center shrink-0 disabled:opacity-30 disabled:cursor-not-allowed"
                />
                {item.products.images?.[0] ? (
                  <img
                    src={item.products.images[0]}
                    alt={item.products.name}
                    className={'w-20 h-20 object-cover rounded-(--radius-input) ' + (habis || mati ? 'opacity-40' : '')}
                  />
                ) : (
                  <div className="w-20 h-20 bg-naik rounded-(--radius-input)" />
                )}

                <div className="flex-1 min-w-0">
                  {/* baris info: nama dkk di kiri, total harga di kanan */}
                  <div className="flex justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Link
                          to={'/detail/' + item.products.id}
                          className="font-semibold truncate hover:text-neon"
                        >
                          {item.products.name}
                        </Link>
                        {habis && (
                          <span className="bg-naik text-neon text-xs rounded-full px-3 py-1 shrink-0">
                            Habis
                          </span>
                        )}
                        {mati && (
                          <span className="bg-naik text-kabut text-xs rounded-full px-3 py-1 shrink-0">
                            Gak tersedia
                          </span>
                        )}
                      </div>
                      <p className="text-kabut text-xs mt-0.5">dari {item.products.profiles?.store}</p>
                      {varian && <p className="text-kabut text-xs mt-0.5">Varian: {varian.name}</p>}
                      {belumPilih && !mati ? (
                        // item lama yang produknya sekarang pake varian, suruh milih dulu
                        <select
                          value=""
                          onChange={(e) => pilihVarian(item, Number(e.target.value))}
                          className="bg-naik text-sm rounded-(--radius-input) px-3 py-2 mt-2 outline-none focus:ring-2 focus:ring-neon cursor-pointer"
                        >
                          <option value="" disabled>
                            Pilih varian dulu
                          </option>
                          {(item.products.variants || []).map((v) => (
                            <option key={v.id} value={v.id} disabled={v.stock < 1}>
                              {v.name}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <>
                          <p className="text-sm font-medium mt-1">Rp{harga.toLocaleString('id-ID')}</p>
                          {persen > 0 && (
                            <p className="text-kabut text-xs line-through mt-0.5">
                              Rp{normal.toLocaleString('id-ID')}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                    {!habis && !belumPilih && !mati && (
                      <p className="text-neon font-semibold text-lg shrink-0">
                        Rp{(harga * item.qty).toLocaleString('id-ID')}
                      </p>
                    )}
                  </div>

                  {/* baris aksi: stepper mentok kiri, hapus mentok kanan */}
                  <div className="flex items-center mt-3">
                    {!habis && !belumPilih && !mati && (
                      <div className="inline-flex items-center bg-naik rounded-full text-sm">
                        <button
                          onClick={() => ubahQty(item, -1)}
                          className="px-3 py-1.5 hover:text-neon cursor-pointer"
                        >
                          −
                        </button>
                        <span className="w-7 text-center font-medium">{item.qty}</span>
                        <button
                          onClick={() => ubahQty(item, 1)}
                          className="px-3 py-1.5 hover:text-neon cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    )}
                    <button
                      onClick={() => hapus(item)}
                      className="ml-auto border border-merah text-merah hover:bg-merah hover:text-putih text-xs font-medium rounded-full px-4 py-1.5 transition duration-200 cursor-pointer"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* ringkasan belanja */}
        <div className="bg-panel rounded-(--radius-kartu) p-6 md:sticky md:top-20">
          <h2 className="font-semibold text-lg">Ringkasan Belanja</h2>
          <div className="flex items-center justify-between mt-4 text-sm">
            <span className="text-kabut">Total ({jumlah} barang)</span>
            <span className="text-neon font-bold text-xl">Rp{total.toLocaleString('id-ID')}</span>
          </div>
          <button
            onClick={() => setKirim(true)}
            disabled={kepilih.length === 0}
            className="w-full bg-neon hover:bg-neon-terang text-putih font-semibold rounded-full px-7 py-3 mt-6 transition duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Checkout
          </button>
        </div>
      </div>

      {/* modal isi data pengiriman sebelum bayar */}
      {kirim && (
        <Bayar
          pesanan={{ items: kepilih.map((i) => i.id) }}
          total={total}
          jumlah={jumlah}
          tutup={() => setKirim(false)}
        />
      )}
    </div>
  )
}
