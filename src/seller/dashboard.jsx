import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'

// warna khusus grafik, versi lebih gelap dari warna web biar kebaca di atas panel
// urutannya: pink, biru, kuning, ijo, abu buat slice Lainnya
const warnaPie = ['#e75e8d', '#3c8ecf', '#b3872c', '#278556', '#6f7377']

const statusInfo = {
  menunggu: { label: 'Menunggu Konfirmasi', warna: 'text-kabut' },
  dikirim: { label: 'Dikirim', warna: 'text-kuning' },
  sampai: { label: 'Sampai', warna: 'text-biru' },
  selesai: { label: 'Selesai', warna: 'text-ijo' },
  batal: { label: 'Dibatalkan', warna: 'text-merah' },
}

// angka sumbu y dibikin singkat, 1500000 jadi 1,5jt
function singkat(n) {
  if (n >= 1000000) return (n / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + 'jt'
  if (n >= 1000) return (n / 1000).toLocaleString('id-ID', { maximumFractionDigits: 0 }) + 'rb'
  return n
}

// kotak tooltip pas bar di-hover
function KotakBar({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-naik rounded-(--radius-input) px-3 py-2 text-sm">
      <p className="text-kabut text-xs">{label}</p>
      <p className="font-semibold">Rp{payload[0].value.toLocaleString('id-ID')}</p>
    </div>
  )
}

// kotak tooltip pas slice pie di-hover
function KotakPie({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-naik rounded-(--radius-input) px-3 py-2 text-sm">
      <p className="text-kabut text-xs">{payload[0].name}</p>
      <p className="font-semibold">{payload[0].value} dibeli</p>
    </div>
  )
}

export default function Dashboard() {
  const { session, profile } = useAuth()
  const [orders, setOrders] = useState([])
  const [rentang, setRentang] = useState('minggu')

  useEffect(() => {
    if (!session) return
    // ambil semua order toko ini yang udah dibayar, terbaru duluan
    supabase
      .from('orders')
      .select('id, kode, total, status, created_at, payments!inner(status), order_items(qty, price, products(name))')
      .eq('seller_id', session.user.id)
      .eq('payments.status', 'paid')
      .order('id', { ascending: false })
      .then(({ data }) => setOrders(data || []))
  }, [session])

  // grafik & statistik cuma ngitung order selesai (uangnya udah cair)
  const selesai = orders.filter((o) => o.status === 'selesai')

  // 4 kartu status + tombol lihat ke tab terkait
  const kartu = [
    { label: 'Menunggu', nilai: orders.filter((o) => o.status === 'menunggu').length, ke: '/seller/orders' },
    { label: 'Dikirim', nilai: orders.filter((o) => o.status === 'dikirim').length, ke: '/seller/orders?tab=dikirim' },
    { label: 'Sampai', nilai: orders.filter((o) => o.status === 'sampai').length, ke: '/seller/orders?tab=sampai' },
    { label: 'Selesai', nilai: selesai.length, ke: '/seller/riwayat' },
  ]

  // data bar chart sesuai rentang yang dipilih
  function dataGrafik() {
    if (rentang === 'minggu') {
      // 7 hari terakhir, per hari
      const hari = []
      for (let i = 6; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        hari.push(d)
      }
      return hari.map((d) => ({
        label: d.toLocaleDateString('id-ID', { weekday: 'short' }),
        total: selesai
          .filter((o) => new Date(o.created_at).toDateString() === d.toDateString())
          .reduce((t, o) => t + o.total, 0),
      }))
    }
    if (rentang === 'bulan') {
      // 12 bulan tahun ini
      const tahunIni = new Date().getFullYear()
      return [...Array(12)].map((_, b) => ({
        label: new Date(tahunIni, b, 1).toLocaleDateString('id-ID', { month: 'short' }),
        total: selesai
          .filter((o) => {
            const t = new Date(o.created_at)
            return t.getFullYear() === tahunIni && t.getMonth() === b
          })
          .reduce((t, o) => t + o.total, 0),
      }))
    }
    // 5 tahun ke belakang
    const skrg = new Date().getFullYear()
    return [...Array(5)].map((_, i) => ({
      label: String(skrg - 4 + i),
      total: selesai
        .filter((o) => new Date(o.created_at).getFullYear() === skrg - 4 + i)
        .reduce((t, o) => t + o.total, 0),
    }))
  }

  const grafik = dataGrafik()
  const totalGrafik = grafik.reduce((t, g) => t + g.total, 0)

  // hitung jumlah kebeli per produk buat pie, top 4 sisanya digabung Lainnya
  const perProduk = {}
  selesai.forEach((o) =>
    o.order_items.forEach((i) => {
      const nama = i.products?.name || 'Produk dihapus'
      perProduk[nama] = (perProduk[nama] || 0) + i.qty
    })
  )
  const urut = Object.entries(perProduk).sort((a, b) => b[1] - a[1])
  const pie = urut.slice(0, 4).map(([name, qty]) => ({ name, qty }))
  const sisa = urut.slice(4).reduce((t, p) => t + p[1], 0)
  if (sisa > 0) pie.push({ name: 'Lainnya', qty: sisa })

  // produk penyumbang duit paling gede
  const duitProduk = {}
  selesai.forEach((o) =>
    o.order_items.forEach((i) => {
      const nama = i.products?.name || 'Produk dihapus'
      duitProduk[nama] = (duitProduk[nama] || 0) + i.price * i.qty
    })
  )
  const juara = Object.entries(duitProduk).sort((a, b) => b[1] - a[1])[0]
  const pesananJuara = juara
    ? selesai.filter((o) => o.order_items.some((i) => (i.products?.name || 'Produk dihapus') === juara[0])).length
    : 0

  const kosong = (
    <p className="text-kabut text-sm text-center py-16">Belum ada data buat ditampilin. Mulai jualan dulu yuk.</p>
  )

  return (
    <div>
      <h1 className="font-bold text-2xl">Halo, {profile?.store}!</h1>

      {/* 4 kartu status pesanan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
        {kartu.map((k) => (
          <div key={k.label} className="bg-panel rounded-(--radius-kartu) p-6">
            <p className="text-kabut text-sm">{k.label}</p>
            <p className="font-bold text-2xl mt-2">{k.nilai}</p>
            {/* link kecil ke tab pesanan terkait, ditaro pojok kanan bawah */}
            <div className="flex justify-end mt-2">
              <Link to={k.ke} className="text-neon text-xs hover:underline">
                Lihat
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* grafik penjualan */}
      <div className="bg-panel rounded-(--radius-kartu) p-6 mt-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-lg">Penjualan</h2>
            <p className="text-kabut text-sm mt-0.5">
              Total: <span className="text-putih font-semibold">Rp{totalGrafik.toLocaleString('id-ID')}</span>
            </p>
          </div>
          <select
            value={rentang}
            onChange={(e) => setRentang(e.target.value)}
            className="bg-naik text-putih rounded-(--radius-input) px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neon cursor-pointer"
          >
            <option value="minggu">Minggu Ini</option>
            <option value="bulan">Per Bulan</option>
            <option value="tahun">Per Tahun</option>
          </select>
        </div>

        {selesai.length === 0 ? (
          kosong
        ) : (
          <div className="mt-6">
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={grafik}>
                <CartesianGrid vertical={false} stroke="#353637" />
                <XAxis dataKey="label" tick={{ fill: '#9a9ea2', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: '#9a9ea2', fontSize: 12 }} tickFormatter={singkat} axisLine={false} tickLine={false} width={45} />
                <Tooltip content={<KotakBar />} cursor={{ fill: '#353637', opacity: 0.5 }} />
                <Bar dataKey="total" fill="#e75e8d" radius={[4, 4, 0, 0]} maxBarSize={28} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        {/* pie produk paling banyak dibeli */}
        <div className="bg-panel rounded-(--radius-kartu) p-6">
          <h2 className="font-semibold text-lg">Produk Paling Laris</h2>
          {pie.length === 0 ? (
            kosong
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
              <PieChart width={190} height={190}>
                <Pie data={pie} dataKey="qty" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="#27292a" strokeWidth={2}>
                  {pie.map((p, i) => (
                    <Cell key={p.name} fill={p.name === 'Lainnya' ? warnaPie[4] : warnaPie[i]} />
                  ))}
                </Pie>
                <Tooltip content={<KotakPie />} />
              </PieChart>
              {/* daftar nama di samping pie biar gak nebak dari warna doang */}
              <div className="flex-1 w-full space-y-2.5 text-sm">
                {pie.map((p, i) => (
                  <div key={p.name} className="flex items-center gap-2.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: p.name === 'Lainnya' ? warnaPie[4] : warnaPie[i] }}
                    />
                    <span className="truncate">{p.name}</span>
                    <span className="text-kabut ml-auto shrink-0">{p.qty} dibeli</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* produk penyumbang penjualan terbesar */}
        <div className="bg-panel rounded-(--radius-kartu) p-6">
          <h2 className="font-semibold text-lg">Penyumbang Terbesar</h2>
          {!juara ? (
            kosong
          ) : (
            <div className="mt-4">
              <p className="font-semibold text-lg">{juara[0]}</p>
              <p className="text-neon font-bold text-3xl mt-2">Rp{juara[1].toLocaleString('id-ID')}</p>
              <p className="text-kabut text-sm mt-1">dari {pesananJuara} pesanan</p>
            </div>
          )}
        </div>
      </div>

      {/* 5 transaksi terakhir */}
      <div className="bg-panel rounded-(--radius-kartu) p-6 mt-5">
        <div className="flex items-center justify-between gap-4">
          <h2 className="font-semibold text-lg">Transaksi Terakhir</h2>
          <Link to="/seller/riwayat" className="text-neon text-sm hover:underline shrink-0">
            Lihat Selengkapnya
          </Link>
        </div>
        {orders.length === 0 ? (
          kosong
        ) : (
          <div className="mt-2">
            {orders.slice(0, 5).map((o) => (
              <div key={o.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-naik last:border-0 py-3">
                <div className="min-w-0">
                  <p className="text-sm">{o.kode}</p>
                  <p className="text-kabut text-xs mt-0.5">
                    {new Date(o.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <span className={'bg-naik text-xs rounded-full px-3 py-1 ' + statusInfo[o.status].warna}>
                  {statusInfo[o.status].label}
                </span>
                <p className="font-semibold text-sm ml-auto">Rp{o.total.toLocaleString('id-ID')}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
