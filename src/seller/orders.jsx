import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'
import Kartu from './kartu'

// daftar tab: status apa aja yang masuk situ + teks kalau lagi kosong
// riwayat (selesai + batal) punya halaman sendiri di /seller/riwayat
const tabs = [
  { id: 'konfirmasi', label: 'Perlu Dikonfirmasi', status: ['menunggu'], kosong: 'Belum ada pesanan yang perlu kamu proses.' },
  { id: 'dikirim', label: 'Dikirim', status: ['dikirim'], kosong: 'Belum ada pesanan yang lagi dikirim.' },
  { id: 'sampai', label: 'Sampai', status: ['sampai'], kosong: 'Belum ada pesanan yang nyampe ke pembeli.' },
]

export default function Orders() {
  const { session } = useAuth()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  // tab awal bisa dikirim lewat url (?tab=dikirim), dipake tombol Lihat di overview
  const [params] = useSearchParams()
  const [tab, setTab] = useState(tabs.some((t) => t.id === params.get('tab')) ? params.get('tab') : 'konfirmasi')
  const [cari, setCari] = useState('') // filter nomor pesanan / nama produk
  const [sortir, setSortir] = useState('baru')
  const [kirim, setKirim] = useState(null) // order yang mau dikirim, buat buka modal kurir
  const [kurir, setKurir] = useState('')
  const [hpKurir, setHpKurir] = useState('')
  const [estimasi, setEstimasi] = useState('') // perkiraan tanggal sampai
  const [tanya, setTanya] = useState(null) // isi confirm popup { teks, ya, gak, merah, aksi }
  const [proses, setProses] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return
    // ambil order toko ini yang udah dibayar & masih jalan, yang belum dibayar bukan urusan seller
    supabase
      .from('orders')
      .select('id, kode, total, status, receiver, phone, address, kurir_nama, kurir_phone, estimasi_at, dikirim_at, sampai_at, minta_batal, created_at, buyer:profiles!user_id(avatar), payments!inner(status), order_items(id, qty, price, variant_name, products(name, images))')
      .eq('seller_id', session.user.id)
      .eq('payments.status', 'paid')
      .in('status', ['menunggu', 'dikirim', 'sampai'])
      .order('id', { ascending: false })
      .then(({ data }) => {
        setOrders(data || [])
        setLoading(false)
      })
  }, [session])

  // update 1 order di db terus samain tampilannya, dipake semua tombol aksi
  async function ubah(id, isi) {
    setProses(true)
    setError('')
    const { error: err } = await supabase.from('orders').update(isi).eq('id', id)
    setProses(false)
    if (err) {
      setError('Waduh, ada masalah. Coba lagi ya.')
      return false
    }
    setOrders((lama) => lama.map((o) => (o.id === id ? { ...o, ...isi } : o)))
    // kabarin layout biar badge menu pesanannya keupdate
    window.dispatchEvent(new Event('pesanan'))
    return true
  }

  // buka modal kirim, isian kurirnya dikosongin dulu
  function bukaKirim(order) {
    setKurir('')
    setHpKurir('')
    setEstimasi('')
    setError('')
    setKirim(order)
  }

  // submit modal kirim: simpen data kurir + estimasi tiba + pindah status ke dikirim
  async function kirimSekarang(e) {
    e.preventDefault()
    const ok = await ubah(kirim.id, {
      status: 'dikirim',
      kurir_nama: kurir,
      kurir_phone: hpKurir,
      estimasi_at: estimasi,
      dikirim_at: new Date().toISOString(),
    })
    if (ok) setKirim(null)
  }

  // confirm batalin pesanan (stok dibalikin trigger db)
  function konfirmBatal(order) {
    setError('')
    setTanya({
      teks: 'Yakin mau batalin pesanan ini? Stok bakal dibalikin dan dana pembeli dianggap dikembalikan.',
      ya: 'Ya, Batalkan',
      gak: 'Gak Jadi',
      merah: true,
      aksi: () => ubah(order.id, { status: 'batal' }),
    })
  }

  // confirm tandai pesanan udah sampai
  function konfirmSampai(order) {
    setError('')
    setTanya({
      teks: 'Pesanan ini udah nyampe ke pembeli?',
      ya: 'Ya, Udah Sampai',
      gak: 'Belum',
      merah: false,
      aksi: () => ubah(order.id, { status: 'sampai', sampai_at: new Date().toISOString() }),
    })
  }

  async function jawabYa() {
    const ok = await tanya.aksi()
    if (ok) setTanya(null)
  }

  const inputCls =
    'w-full bg-naik rounded-(--radius-input) px-4 py-3 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon mt-1.5'
  const btnFill =
    'bg-neon hover:bg-neon-terang text-putih text-sm font-semibold rounded-full px-5 py-2 transition duration-200 cursor-pointer'
  const btnMerah =
    'border border-merah text-merah hover:bg-merah hover:text-putih text-sm font-medium rounded-full px-5 py-2 transition duration-200 cursor-pointer'

  // isi tab yang lagi aktif, disaring nomor pesanan / nama produk terus diurutin
  const aktif = tabs.find((t) => t.id === tab)
  const diTab = orders.filter((o) => aktif.status.includes(o.status))
  const kata = cari.toLowerCase()
  const tampil = diTab
    .filter(
      (o) =>
        o.kode.toLowerCase().includes(kata) ||
        o.order_items.some((i) => i.products?.name.toLowerCase().includes(kata))
    )
    .sort((a, b) => (sortir === 'lama' ? a.id - b.id : b.id - a.id))

  return (
    <div>
      <p className="text-xs text-kabut">
        Kelola Pesanan / <span className="text-putih">Pesanan Masuk</span>
      </p>
      <h1 className="font-bold text-2xl mt-1">Pesanan Masuk</h1>

      {/* baris tab per status, scrollbar nya disembunyiin biar gak ganggu */}
      <div className="flex gap-1 mt-6 border-b border-naik text-sm overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => {
          // jumlah order di tab ini buat badge kecil di samping labelnya
          const jumlah = orders.filter((o) => t.status.includes(o.status)).length
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={
                'flex items-center gap-1.5 px-4 py-2.5 whitespace-nowrap border-b-2 -mb-px transition duration-200 cursor-pointer ' +
                (tab === t.id ? 'border-neon text-neon font-semibold' : 'border-transparent text-kabut hover:text-putih')
              }
            >
              {t.label}
              {jumlah > 0 && (
                <span
                  className={
                    'text-[10px] font-semibold rounded-full min-w-4 h-4 px-1 flex items-center justify-center ' +
                    (tab === t.id ? 'bg-neon text-putih' : 'bg-naik text-kabut')
                  }
                >
                  {jumlah}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* cari nomor pesanan + urutan */}
      <div className="flex gap-3 mt-4">
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
      ) : diTab.length === 0 ? (
        <p className="text-kabut text-center py-16">{aktif.kosong}</p>
      ) : tampil.length === 0 ? (
        <p className="text-kabut text-center py-16">Gak ada pesanan yang cocok sama pencarianmu.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {tampil.map((order) => (
            <Kartu key={order.id} order={order}>
              {order.status === 'menunggu' && !order.minta_batal && (
                <>
                  <button onClick={() => konfirmBatal(order)} className={btnMerah}>
                    Batalkan Pesanan
                  </button>
                  <button onClick={() => bukaKirim(order)} className={btnFill}>
                    Kirim Pesanan
                  </button>
                </>
              )}
              {/* yang diminta batal pembeli diurusnya di halaman pembatalan & retur */}
              {order.status === 'dikirim' && (
                <button onClick={() => konfirmSampai(order)} className={btnFill}>
                  Tandai Sampai
                </button>
              )}
            </Kartu>
          ))}
        </div>
      )}

      {/* modal isi data kurir sebelum kirim */}
      {kirim && (
        <div className="fixed inset-0 bg-dasar/80 flex items-center justify-center px-4 z-20">
          <form onSubmit={kirimSekarang} className="bg-panel rounded-(--radius-kartu) p-8 md:p-10 w-full max-w-[420px]">
            <div className="flex items-start justify-between">
              <h2 className="font-bold text-2xl">Kirim Pesanan</h2>
              <button
                type="button"
                onClick={() => setKirim(null)}
                className="text-kabut hover:text-putih text-2xl leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>
            <p className="text-kabut text-sm mt-2">Isi data pengirimnya biar pembeli bisa ngelacak.</p>

            <div className="mt-6">
              <label className="text-sm font-medium">Nama Pengirim</label>
              <input
                value={kurir}
                onChange={(e) => setKurir(e.target.value)}
                placeholder="Contoh: JNE / Kurir Toko / Budi"
                className={inputCls}
              />
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium">No. HP Pengirim</label>
              <input
                value={hpKurir}
                onChange={(e) => setHpKurir(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                placeholder="Contoh: 081234567890"
                className={inputCls}
              />
            </div>
            <div className="mt-4">
              <label className="text-sm font-medium">Estimasi Tiba</label>
              <input
                type="date"
                value={estimasi}
                onChange={(e) => setEstimasi(e.target.value)}
                min={new Date().toISOString().slice(0, 10)}
                className={inputCls + ' [color-scheme:dark]'}
              />
              <p className="text-kabut text-xs mt-1.5">Perkiraan tanggal paket nyampe ke pembeli.</p>
            </div>

            {error && <p className="text-merah text-sm mt-3">{error}</p>}

            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => setKirim(null)}
                className="flex-1 border border-naik text-putih hover:border-neon text-sm font-semibold rounded-full px-5 py-2.5 transition duration-200 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={proses || !kurir.trim() || !hpKurir.trim() || !estimasi}
                className="flex-1 bg-neon hover:bg-neon-terang text-putih text-sm font-semibold rounded-full px-5 py-2.5 transition duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {proses ? 'Sebentar ya...' : 'Kirim Sekarang'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* confirm popup buat batal / setujui batal / tandai sampai */}
      {tanya && (
        <div className="fixed inset-0 bg-dasar/80 flex items-center justify-center px-4 z-20">
          <div className="bg-panel rounded-(--radius-kartu) p-8 w-full max-w-[380px] text-center">
            <p className="text-sm">{tanya.teks}</p>
            {error && <p className="text-merah text-sm mt-3">{error}</p>}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setTanya(null)}
                className="flex-1 border border-naik text-putih hover:border-neon text-sm font-semibold rounded-full px-5 py-2.5 transition duration-200 cursor-pointer"
              >
                {tanya.gak}
              </button>
              <button
                onClick={jawabYa}
                disabled={proses}
                className={
                  'flex-1 text-putih text-sm font-semibold rounded-full px-5 py-2.5 transition duration-200 cursor-pointer disabled:opacity-60 ' +
                  (tanya.merah ? 'bg-merah hover:opacity-90' : 'bg-neon hover:bg-neon-terang')
                }
              >
                {proses ? 'Sebentar ya...' : tanya.ya}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
