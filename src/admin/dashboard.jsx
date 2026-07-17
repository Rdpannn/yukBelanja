import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts'
import supabase from '../lib/supabase'

// warna khusus grafik, sama kayak punya overview seller
// urutannya: pink, biru, kuning, ijo, abu buat slice Lainnya
const warnaPie = ['#e75e8d', '#3c8ecf', '#b3872c', '#278556', '#6f7377']

// status pembayaran buat chip di transaksi terakhir
const statusBayar = {
  pending: { label: 'Belum Dibayar', warna: 'text-kabut' },
  paid: { label: 'Dibayar', warna: 'text-ijo' },
  expire: { label: 'Hangus', warna: 'text-merah' },
}

// nama metode bayar dari midtrans dirapiin biar enak dibaca
const labelMetode = {
  qris: 'QRIS',
  gopay: 'GoPay',
  shopeepay: 'ShopeePay',
  bank_transfer: 'Transfer Bank',
  echannel: 'Transfer Bank',
  credit_card: 'Kartu Kredit',
  cstore: 'Gerai Retail',
}
const namaMetode = (m) => labelMetode[m] || m

// angka sumbu y dibikin singkat, 1500000 jadi 1,5jt
function singkat(n) {
  if (n >= 1000000) return (n / 1000000).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + 'jt'
  if (n >= 1000) return (n / 1000).toLocaleString('id-ID', { maximumFractionDigits: 0 }) + 'rb'
  return n
}

// kotak tooltip bar transaksi (nilai rupiah)
function KotakBar({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-naik rounded-(--radius-input) px-3 py-2 text-sm">
      <p className="text-kabut text-xs">{label}</p>
      <p className="font-semibold">Rp{payload[0].value.toLocaleString('id-ID')}</p>
    </div>
  )
}

// kotak tooltip bar pengguna baru (dua angka: pengguna & toko)
function KotakUser({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-naik rounded-(--radius-input) px-3 py-2 text-sm">
      <p className="text-kabut text-xs">{label}</p>
      <p className="font-semibold">{payload[0].value} pengguna</p>
      <p className="font-semibold">{payload[1]?.value} toko</p>
    </div>
  )
}

// kotak tooltip pie metode pembayaran
function KotakPie({ active, payload }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-naik rounded-(--radius-input) px-3 py-2 text-sm">
      <p className="text-kabut text-xs">{payload[0].name}</p>
      <p className="font-semibold">{payload[0].value} transaksi</p>
    </div>
  )
}

// bikin kerangka periode sesuai rentang, terus diisi pake fungsi hitung
// dipake bar transaksi & bar pengguna baru biar gak nulis dua kali
function dataPeriode(rentang, hitung) {
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
      ...hitung((t) => t.toDateString() === d.toDateString()),
    }))
  }
  if (rentang === 'bulan') {
    // 12 bulan tahun ini
    const tahunIni = new Date().getFullYear()
    return [...Array(12)].map((_, b) => ({
      label: new Date(tahunIni, b, 1).toLocaleDateString('id-ID', { month: 'short' }),
      ...hitung((t) => t.getFullYear() === tahunIni && t.getMonth() === b),
    }))
  }
  // 5 tahun ke belakang
  const skrg = new Date().getFullYear()
  return [...Array(5)].map((_, i) => ({
    label: String(skrg - 4 + i),
    ...hitung((t) => t.getFullYear() === skrg - 4 + i),
  }))
}

export default function Dashboard() {
  const [payments, setPayments] = useState([])
  const [users, setUsers] = useState([])
  const [produk, setProduk] = useState(0)
  const [selesai, setSelesai] = useState([]) // order selesai, buat toko teraktif
  const [rentang, setRentang] = useState('minggu')
  const [rentangUser, setRentangUser] = useState('minggu')

  useEffect(() => {
    // semua pembayaran + nama pembelinya, terbaru duluan
    supabase
      .from('payments')
      .select('id, total, status, metode, paid_at, created_at, profiles(name)')
      .order('id', { ascending: false })
      .then(({ data }) => setPayments(data || []))

    // semua akun, buat kartu + grafik pengguna baru
    supabase
      .from('profiles')
      .select('role, created_at')
      .then(({ data }) => setUsers(data || []))

    supabase
      .from('products')
      .select('id', { count: 'exact', head: true })
      .eq('status', 'aktif')
      .then(({ count }) => setProduk(count || 0))

    // order selesai + nama tokonya, buat toko teraktif
    supabase
      .from('orders')
      .select('total, seller_id, toko:profiles!seller_id(store, avatar)')
      .eq('status', 'selesai')
      .then(({ data }) => setSelesai(data || []))
  }, [])

  const dibayar = payments.filter((p) => p.status === 'paid')

  const kartu = [
    { label: 'Pengguna', nilai: users.length, ke: '/admin/users' },
    { label: 'Toko', nilai: users.filter((u) => u.role === 'seller').length, ke: '/admin/toko' },
    { label: 'Produk', nilai: produk, ke: '/admin/products' },
    { label: 'Transaksi', nilai: dibayar.length },
  ]

  // bar transaksi: nilai pembayaran paid per periode, patokannya waktu dibayar
  const grafik = dataPeriode(rentang, (cocok) => ({
    total: dibayar.filter((p) => cocok(new Date(p.paid_at))).reduce((t, p) => t + p.total, 0),
  }))
  const totalGrafik = grafik.reduce((t, g) => t + g.total, 0)

  // bar pengguna baru: akun yang daftar per periode, dipisah buyer & toko
  const grafikUser = dataPeriode(rentangUser, (cocok) => ({
    pengguna: users.filter((u) => u.role === 'buyer' && cocok(new Date(u.created_at))).length,
    toko: users.filter((u) => u.role === 'seller' && cocok(new Date(u.created_at))).length,
  }))

  // hitung jumlah transaksi per metode bayar, top 4 sisanya digabung Lainnya
  const perMetode = {}
  dibayar.forEach((p) => {
    const nama = namaMetode(p.metode) || 'Lainnya'
    perMetode[nama] = (perMetode[nama] || 0) + 1
  })
  const urutMetode = Object.entries(perMetode).sort((a, b) => b[1] - a[1])
  const pie = urutMetode.slice(0, 4).map(([name, jumlah]) => ({ name, jumlah }))
  const sisaMetode = urutMetode.slice(4).reduce((t, m) => t + m[1], 0)
  if (sisaMetode > 0) pie.push({ name: 'Lainnya', jumlah: sisaMetode })

  // toko teraktif: order selesai dikelompokin per toko, diurutin dari yang terbanyak
  const perToko = {}
  selesai.forEach((o) => {
    if (!perToko[o.seller_id]) perToko[o.seller_id] = { ...o.toko, jumlah: 0, omzet: 0 }
    perToko[o.seller_id].jumlah += 1
    perToko[o.seller_id].omzet += o.total
  })
  const teraktif = Object.values(perToko)
    .sort((a, b) => b.jumlah - a.jumlah)
    .slice(0, 5)

  const kosong = <p className="text-kabut text-sm text-center py-16">Belum ada data buat ditampilin.</p>

  return (
    <div>
      <h1 className="font-bold text-2xl">Overview</h1>

      {/* 4 kartu angka ringkas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mt-6">
        {kartu.map((k) => (
          <div key={k.label} className="bg-panel rounded-(--radius-kartu) p-6">
            <p className="text-kabut text-sm">{k.label}</p>
            <p className="font-bold text-2xl mt-2">{k.nilai}</p>
            {/* kartu transaksi gak punya halaman sendiri, jadi gak ada link lihat */}
            {k.ke && (
              <div className="flex justify-end mt-2">
                <Link to={k.ke} className="text-neon text-xs hover:underline">
                  Lihat
                </Link>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* grafik nilai transaksi */}
      <div className="bg-panel rounded-(--radius-kartu) p-6 mt-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-lg">Transaksi</h2>
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

        {dibayar.length === 0 ? (
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
        {/* pie komposisi metode pembayaran */}
        <div className="bg-panel rounded-(--radius-kartu) p-6">
          <h2 className="font-semibold text-lg">Metode Pembayaran</h2>
          {pie.length === 0 ? (
            kosong
          ) : (
            <div className="flex flex-col sm:flex-row items-center gap-6 mt-4">
              <PieChart width={190} height={190}>
                <Pie data={pie} dataKey="jumlah" nameKey="name" innerRadius={55} outerRadius={85} paddingAngle={3} stroke="#27292a" strokeWidth={2}>
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
                    <span className="text-kabut ml-auto shrink-0">{p.jumlah} transaksi</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* grafik pengguna baru per periode */}
        <div className="bg-panel rounded-(--radius-kartu) p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <h2 className="font-semibold text-lg">Pengguna Baru</h2>
            <select
              value={rentangUser}
              onChange={(e) => setRentangUser(e.target.value)}
              className="bg-naik text-putih rounded-(--radius-input) px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-neon cursor-pointer"
            >
              <option value="minggu">Minggu Ini</option>
              <option value="bulan">Per Bulan</option>
              <option value="tahun">Per Tahun</option>
            </select>
          </div>

          {users.length === 0 ? (
            kosong
          ) : (
            <div className="mt-4">
              {/* keterangan warna bar */}
              <div className="flex items-center gap-4 text-sm text-kabut">
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: warnaPie[0] }} />
                  Pengguna
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: warnaPie[1] }} />
                  Toko
                </span>
              </div>
              <div className="mt-4">
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={grafikUser}>
                    <CartesianGrid vertical={false} stroke="#353637" />
                    <XAxis dataKey="label" tick={{ fill: '#9a9ea2', fontSize: 12 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: '#9a9ea2', fontSize: 12 }} axisLine={false} tickLine={false} width={30} allowDecimals={false} />
                    <Tooltip content={<KotakUser />} cursor={{ fill: '#353637', opacity: 0.5 }} />
                    <Bar dataKey="pengguna" fill={warnaPie[0]} radius={[4, 4, 0, 0]} maxBarSize={20} />
                    <Bar dataKey="toko" fill={warnaPie[1]} radius={[4, 4, 0, 0]} maxBarSize={20} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-5">
        {/* toko dengan pesanan selesai terbanyak */}
        <div className="bg-panel rounded-(--radius-kartu) p-6">
          <h2 className="font-semibold text-lg">Toko Teraktif</h2>
          {teraktif.length === 0 ? (
            kosong
          ) : (
            <div className="mt-2">
              {teraktif.map((t) => (
                <div key={t.store} className="flex items-center gap-3 border-b border-naik last:border-0 py-3">
                  {t.avatar ? (
                    <img src={t.avatar} alt={t.store} referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover shrink-0" />
                  ) : (
                    <span className="w-9 h-9 rounded-full bg-naik text-neon font-bold flex items-center justify-center shrink-0">
                      {t.store?.[0]?.toUpperCase()}
                    </span>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{t.store}</p>
                    <p className="text-kabut text-xs mt-0.5">{t.jumlah} pesanan selesai</p>
                  </div>
                  <p className="font-semibold text-sm ml-auto shrink-0">Rp{t.omzet.toLocaleString('id-ID')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 5 pembayaran terbaru */}
        <div className="bg-panel rounded-(--radius-kartu) p-6">
          <h2 className="font-semibold text-lg">Transaksi Terakhir</h2>
          {payments.length === 0 ? (
            kosong
          ) : (
            <div className="mt-2">
              {payments.slice(0, 5).map((p) => (
                <div key={p.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-naik last:border-0 py-3">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{p.profiles?.name || 'Pembeli'}</p>
                    <p className="text-kabut text-xs mt-0.5">
                      {p.metode ? namaMetode(p.metode) + ' · ' : ''}
                      {new Date(p.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <span className={'bg-naik text-xs rounded-full px-3 py-1 ' + statusBayar[p.status].warna}>
                    {statusBayar[p.status].label}
                  </span>
                  <p className="font-semibold text-sm ml-auto">Rp{p.total.toLocaleString('id-ID')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
