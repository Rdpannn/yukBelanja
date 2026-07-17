import { useEffect, useState } from 'react'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'
import Kartu from './kartu'

// riwayat pesanan toko: yang udah selesai atau dibatalin, gak ada aksi lagi di sini
export default function Riwayat() {
  const { session } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [cari, setCari] = useState('') // filter nomor pesanan / nama produk
  const [sortir, setSortir] = useState('baru')

  useEffect(() => {
    if (!session) return
    // ambil order toko ini yang udah kelar (dibayar dulu, biar order hangus gak ikut)
    supabase
      .from('orders')
      .select('id, kode, total, status, receiver, phone, address, sampai_at, minta_batal, created_at, buyer:profiles!user_id(avatar), payments!inner(status), order_items(id, qty, price, variant_name, products(name, images))')
      .eq('seller_id', session.user.id)
      .eq('payments.status', 'paid')
      .in('status', ['selesai', 'batal'])
      .order('id', { ascending: false })
      .then(({ data }) => {
        setOrders(data || [])
        setLoading(false)
      })
  }, [session])

  // disaring nomor pesanan / nama produk terus diurutin
  const kata = cari.toLowerCase()
  const tampil = orders
    .filter(
      (o) =>
        o.kode.toLowerCase().includes(kata) ||
        o.order_items.some((i) => i.products?.name.toLowerCase().includes(kata))
    )
    .sort((a, b) => (sortir === 'lama' ? a.id - b.id : b.id - a.id))

  return (
    <div>
      <p className="text-xs text-kabut">
        Kelola Pesanan / <span className="text-putih">Riwayat Pesanan</span>
      </p>
      <h1 className="font-bold text-2xl mt-1">Riwayat Pesanan</h1>

      {/* cari nomor pesanan + urutan */}
      <div className="flex gap-3 mt-6">
        <div className="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={16} height={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-kabut">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nomor pesanan atau nama produk"
            className="w-full bg-naik rounded-(--radius-input) pl-11 pr-4 py-2.5 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon"
          />
        </div>
        <select
          value={sortir}
          onChange={(e) => setSortir(e.target.value)}
          className="bg-naik text-putih rounded-(--radius-input) px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neon cursor-pointer"
        >
          <option value="baru">Terbaru</option>
          <option value="lama">Terlama</option>
        </select>
      </div>

      {loading ? (
        <p className="text-kabut text-center py-16">Sebentar ya...</p>
      ) : orders.length === 0 ? (
        <p className="text-kabut text-center py-16">Belum ada riwayat pesanan.</p>
      ) : tampil.length === 0 ? (
        <p className="text-kabut text-center py-16">Gak ada pesanan yang cocok sama pencarianmu.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {tampil.map((order) => (
            <Kartu key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  )
}
