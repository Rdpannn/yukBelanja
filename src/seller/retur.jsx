import { useEffect, useState } from 'react'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'
import Kartu from './kartu'

// daftar tab + teks kalau lagi kosong
const tabs = [
  { id: 'batal', label: 'Pembatalan', kosong: 'Gak ada permintaan pembatalan.' },
  { id: 'retur', label: 'Pengembalian', kosong: 'Gak ada pengajuan pengembalian.' },
]

// halaman permintaan batal + pengajuan pengembalian dari pembeli
export default function Retur() {
  const { session } = useAuth()
  const [batal, setBatal] = useState([]) // order yang diminta batal pembeli
  const [returs, setReturs] = useState([]) // pengajuan pengembalian yang belum dijawab
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('batal')
  const [tanya, setTanya] = useState(null) // isi confirm popup { teks, ya, gak, merah, aksi }
  const [proses, setProses] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!session) return
    ambil()
  }, [session])

  async function ambil() {
    // order menunggu yang pembelinya minta batal
    const q1 = supabase
      .from('orders')
      .select('id, kode, total, status, receiver, phone, address, minta_batal, created_at, buyer:profiles!user_id(avatar), payments!inner(status), order_items(id, qty, price, variant_name, products(name, images))')
      .eq('seller_id', session.user.id)
      .eq('payments.status', 'paid')
      .eq('status', 'menunggu')
      .eq('minta_batal', true)
      .order('id', { ascending: false })
    // pengajuan pengembalian yang masih nunggu jawaban
    const q2 = supabase
      .from('returns')
      .select('id, alasan, media, status, created_at, order:orders!inner(id, kode, total, status, receiver, phone, address, minta_batal, kurir_nama, kurir_phone, created_at, order_items(id, qty, price, variant_name, products(name, images)))')
      .eq('order.seller_id', session.user.id)
      .eq('status', 'diajukan')
      .order('id', { ascending: false })
    const [r1, r2] = await Promise.all([q1, q2])
    setBatal(r1.data || [])
    setReturs(r2.data || [])
    setLoading(false)
  }

  // setujui permintaan batal: order jadi batal, stok balik lewat trigger db
  async function setujuBatal(order) {
    setProses(true)
    setError('')
    const { error: err } = await supabase.from('orders').update({ status: 'batal' }).eq('id', order.id)
    setProses(false)
    if (err) {
      setError('Waduh, ada masalah. Coba lagi ya.')
      return false
    }
    setBatal((lama) => lama.filter((o) => o.id !== order.id))
    // kabarin layout biar badge menunya keupdate
    window.dispatchEvent(new Event('pesanan'))
    return true
  }

  // jawab pengajuan pengembalian
  async function jawabRetur(r, setuju) {
    setProses(true)
    setError('')
    // jawabannya dicatet dulu di pengajuannya
    const { error: e1 } = await supabase
      .from('returns')
      .update({ status: setuju ? 'disetujui' : 'ditolak' })
      .eq('id', r.id)
    if (e1) {
      setProses(false)
      setError('Waduh, ada masalah. Coba lagi ya.')
      return false
    }
    // setuju = order dibatalin (stok balik lewat trigger db)
    // tolak = pesanan lanjut, timer selesai otomatisnya dihitung ulang dari sekarang
    const { error: e2 } = await supabase
      .from('orders')
      .update(setuju ? { status: 'batal' } : { sampai_at: new Date().toISOString() })
      .eq('id', r.order.id)
    setProses(false)
    if (e2) {
      setError('Waduh, ada masalah. Coba lagi ya.')
      return false
    }
    setReturs((lama) => lama.filter((x) => x.id !== r.id))
    window.dispatchEvent(new Event('pesanan'))
    return true
  }

  // confirm setujui pembatalan
  function konfirmBatal(order) {
    setError('')
    setTanya({
      teks: 'Setujui pembatalan dari pembeli? Stok bakal dibalikin dan dana pembeli dianggap dikembalikan.',
      ya: 'Ya, Setujui',
      gak: 'Gak Jadi',
      merah: true,
      aksi: () => setujuBatal(order),
    })
  }

  // confirm setujui pengembalian
  function konfirmSetuju(r) {
    setError('')
    setTanya({
      teks: 'Setujui pengembalian ini? Pesanan bakal dibatalin, stok balik, dan dana pembeli dianggap dikembalikan.',
      ya: 'Ya, Setujui',
      gak: 'Gak Jadi',
      merah: true,
      aksi: () => jawabRetur(r, true),
    })
  }

  // confirm tolak pengembalian
  function konfirmTolak(r) {
    setError('')
    setTanya({
      teks: 'Tolak pengajuan ini? Pesanan bakal lanjut dan dianggap selesai otomatis 2x24 jam dari sekarang.',
      ya: 'Ya, Tolak',
      gak: 'Gak Jadi',
      merah: true,
      aksi: () => jawabRetur(r, false),
    })
  }

  async function jawabYa() {
    const ok = await tanya.aksi()
    if (ok) setTanya(null)
  }

  const btnFill =
    'bg-neon hover:bg-neon-terang text-putih text-sm font-semibold rounded-full px-5 py-2 transition duration-200 cursor-pointer'
  const btnMerah =
    'border border-merah text-merah hover:bg-merah hover:text-putih text-sm font-medium rounded-full px-5 py-2 transition duration-200 cursor-pointer'

  const aktif = tabs.find((t) => t.id === tab)
  const kosong = tab === 'batal' ? batal.length === 0 : returs.length === 0

  return (
    <div>
      <p className="text-xs text-kabut">
        Kelola Pesanan / <span className="text-putih">Pembatalan & Retur</span>
      </p>
      <h1 className="font-bold text-2xl mt-1">Pembatalan & Retur</h1>

      {/* baris tab, polanya samain kayak pesanan masuk */}
      <div className="flex gap-1 mt-6 border-b border-naik text-sm overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => {
          const jumlah = t.id === 'batal' ? batal.length : returs.length
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

      {loading ? (
        <p className="text-kabut text-center py-16">Sebentar ya...</p>
      ) : kosong ? (
        <p className="text-kabut text-center py-16">{aktif.kosong}</p>
      ) : (
        <div className="mt-6 space-y-4">
          {tab === 'batal' &&
            batal.map((order) => (
              <Kartu key={order.id} order={order}>
                <button onClick={() => konfirmBatal(order)} className={btnMerah}>
                  Setujui Pembatalan
                </button>
              </Kartu>
            ))}
          {tab === 'retur' &&
            returs.map((r) => (
              <Kartu key={r.id} order={r.order} retur={r}>
                <button onClick={() => konfirmTolak(r)} className={btnMerah}>
                  Tolak
                </button>
                <button onClick={() => konfirmSetuju(r)} className={btnFill}>
                  Setujui
                </button>
              </Kartu>
            ))}
        </div>
      )}

      {/* confirm popup buat semua aksi di halaman ini */}
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
