import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'

// label + warna chip status order buat tabel riwayat
const statusOrder = {
  menunggu: { label: 'Menunggu Konfirmasi', warna: 'text-kabut' },
  dikirim: { label: 'Dikirim', warna: 'text-kuning' },
  sampai: { label: 'Sampai', warna: 'text-biru' },
  selesai: { label: 'Selesai', warna: 'text-ijo' },
  batal: { label: 'Dibatalkan', warna: 'text-merah' },
}

// tanggal dibikin format indonesia, contoh: 15 Juli 2026
function tanggal(waktu) {
  return new Date(waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
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

// detail 1 produk buat seller: info + riwayat transaksi produk itu
export default function Produk() {
  const { id } = useParams()
  const { session } = useAuth()
  const [product, setProduct] = useState(null)
  const [riwayat, setRiwayat] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) return
    // ambil produknya (dipastiin punya toko ini) + riwayat transaksi yang udah dibayar
    Promise.all([
      supabase
        .from('products')
        .select('*, categories(name), variants(*)')
        .eq('id', id)
        .eq('seller_id', session.user.id)
        .neq('status', 'dihapus')
        .single(),
      supabase
        .from('order_items')
        .select('id, qty, price, variant_name, orders!inner(kode, status, created_at, receiver, seller_id, payments!inner(status))')
        .eq('product_id', id)
        .eq('orders.seller_id', session.user.id)
        .eq('orders.payments.status', 'paid')
        .order('id', { ascending: false }),
    ]).then(([prod, item]) => {
      setProduct(prod.data)
      setRiwayat(item.data || [])
      setLoading(false)
    })
  }, [id, session])

  if (loading) return <p className="text-kabut text-center py-16">Sebentar ya...</p>

  if (!product)
    return (
      <div className="text-center py-16">
        <p className="text-kabut">Produknya gak ketemu nih.</p>
        <Link to="/seller/products" className="text-neon font-medium mt-2 inline-block">
          Balik ke etalase
        </Link>
      </div>
    )

  return (
    <div>
      <p className="text-xs text-kabut">
        Kelola Produk /{' '}
        <Link to="/seller/products" className="hover:text-neon">
          Etalase
        </Link>{' '}
        / <span className="text-putih">{product.name}</span>
      </p>

      {/* info produknya */}
      <div className="bg-panel rounded-(--radius-kartu) p-6 mt-4 flex flex-col sm:flex-row gap-6">
        {product.images?.[0] ? (
          <img src={product.images[0]} alt={product.name} className="w-40 h-40 object-cover rounded-(--radius-input) shrink-0" />
        ) : (
          <div className="w-40 h-40 bg-naik rounded-(--radius-input) shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-bold text-2xl">{product.name}</h1>
            {product.status === 'ditangguhkan' && (
              <span className="bg-naik text-kuning text-xs rounded-full px-3 py-1">Ditangguhkan</span>
            )}
          </div>
          <p className="text-neon font-bold text-xl mt-2">{hargaTeks(product)}</p>
          {product.categories && <p className="text-kabut text-sm mt-2">{product.categories.name}</p>}
          <p className="text-kabut text-sm mt-1">
            Stok: {product.stock} · {product.sold || 0} terjual
          </p>
          {product.status === 'ditangguhkan' && (
            <p className="text-kuning text-sm mt-3">
              Ditangguhkan {product.tangguh_sejak && 'sejak ' + tanggal(product.tangguh_sejak) + ' '}
              sampe {tanggal(product.tangguh_sampai)}. Alasan: {product.alasan}
            </p>
          )}
        </div>
      </div>

      {/* riwayat transaksi produk ini, cuma yang udah dibayar */}
      <h2 className="font-semibold text-lg mt-8">Riwayat Transaksi</h2>
      {riwayat.length === 0 ? (
        <p className="text-kabut text-center py-16">Belum ada transaksi buat produk ini.</p>
      ) : (
        <div className="bg-panel rounded-(--radius-kartu) mt-4 overflow-x-auto">
          <table className="w-full text-sm whitespace-nowrap">
            <thead>
              <tr className="text-kabut text-xs text-left border-b border-naik">
                <th className="font-medium px-5 py-3">Pembeli</th>
                <th className="font-medium px-5 py-3">Tanggal</th>
                <th className="font-medium px-5 py-3">Status</th>
                <th className="font-medium px-5 py-3">Jumlah</th>
                <th className="font-medium px-5 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {riwayat.map((item) => (
                <tr key={item.id} className="border-b border-naik last:border-0">
                  <td className="px-5 py-3">{item.orders.receiver}</td>
                  <td className="px-5 py-3 text-kabut">{tanggal(item.orders.created_at)}</td>
                  <td className="px-5 py-3">
                    <span className={'bg-naik text-xs rounded-full px-3 py-1 ' + statusOrder[item.orders.status].warna}>
                      {statusOrder[item.orders.status].label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-kabut">
                    {item.qty}
                    {item.variant_name && ' (' + item.variant_name + ')'}
                  </td>
                  <td className="px-5 py-3 font-medium">
                    Rp{(item.price * item.qty).toLocaleString('id-ID')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
