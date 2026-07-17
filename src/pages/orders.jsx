import { useEffect, useState } from 'react'
import { Link, useLocation, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'
import Salin from '../components/salin'
import Retur from '../components/retur'
import Telpon from '../components/telpon'
import TokoBox from '../components/tokoBox'

// label + warna chip per status order
const statusInfo = {
  menunggu: { label: 'Menunggu Konfirmasi', warna: 'text-kabut' },
  dikirim: { label: 'Dikirim', warna: 'text-kuning' },
  sampai: { label: 'Sampai', warna: 'text-biru' },
  selesai: { label: 'Selesai', warna: 'text-ijo' },
  batal: { label: 'Dibatalkan', warna: 'text-merah' },
}

// daftar tab: status apa aja yang masuk situ + teks kalau lagi kosong
const tabs = [
  { id: 'menunggu', label: 'Menunggu Konfirmasi', status: ['menunggu'], kosong: 'Gak ada pesanan yang nunggu konfirmasi.' },
  { id: 'dikirim', label: 'Dikirim', status: ['dikirim'], kosong: 'Gak ada pesanan yang lagi dikirim.' },
  { id: 'sampai', label: 'Sampai', status: ['sampai'], kosong: 'Gak ada pesanan yang baru sampai.' },
  { id: 'riwayat', label: 'Riwayat', status: ['selesai', 'batal'], kosong: 'Belum ada riwayat pesanan.' },
]

export default function Orders() {
  const { session } = useAuth()
  const lokasi = useLocation()
  const [params] = useSearchParams()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('menunggu')
  const [cari, setCari] = useState('') // filter riwayat: nomor pesanan / nama produk
  const [tanya, setTanya] = useState(null) // isi confirm popup { teks, ya, gak, merah, aksi }
  const [ajukan, setAjukan] = useState(null) // order yang mau diajuin pengembalian, buat buka modal
  const [proses, setProses] = useState(false)
  const [error, setError] = useState('')
  // banner sukses muncul kalau baru dateng dari pembayaran,
  // bisa dari state (callback popup) atau query param (redirect finish url midtrans)
  const [sukses, setSukses] = useState(
    lokasi.state?.sukses ||
      ['settlement', 'capture'].includes(params.get('transaction_status'))
  )

  // pasang script snap midtrans buat tombol lanjut bayar
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js'
    script.setAttribute('data-client-key', import.meta.env.VITE_MIDTRANS_CLIENT_KEY)
    document.body.appendChild(script)
    return () => document.body.removeChild(script)
  }, [])

  useEffect(() => {
    if (!session) return
    ambil()
  }, [session])

  // ambil semua pesanan user + barang barangnya + status pembayarannya + toko penjualnya
  async function ambil() {
    const { data } = await supabase
      .from('orders')
      .select('id, kode, payment_id, total, status, minta_batal, kurir_nama, kurir_phone, estimasi_at, dikirim_at, sampai_at, created_at, seller_id, toko:profiles!seller_id(store, phone, avatar), payments(status, snap_token), returns(status), order_items(id, qty, price, variant_name, products(id, name, images))')
      .eq('user_id', session.user.id)
      .order('id', { ascending: false })
    // returns bisa balik bentuk array atau objek tergantung deteksi relasinya, disamain di sini
    const hasil = (data || []).map((o) => ({
      ...o,
      retur: (Array.isArray(o.returns) ? o.returns[0] : o.returns) || null,
    }))
    setOrders(hasil)
    setLoading(false)

    // pembayaran yang masih pending dicek ulang ke midtrans, siapa tau udah dibayar
    // 1 payment bisa punya beberapa order, jadi cek nya sekali per payment
    const pendingIds = [...new Set(
      hasil.filter((o) => o.payments?.status === 'pending').map((o) => o.payment_id)
    )]
    for (const pid of pendingIds) {
      const { data: cek } = await supabase.functions.invoke('pay', {
        body: { aksi: 'cek', payment_id: pid },
      })
      if (cek?.status && cek.status !== 'pending') terapin(pid, cek.status)
    }
  }

  // update tampilan semua order di 1 payment sesuai hasil cek
  function terapin(pid, statusBayar) {
    setOrders((lama) =>
      lama.map((o) => {
        if (o.payment_id !== pid) return o
        return {
          ...o,
          // pembayaran hangus = ordernya batal
          status: statusBayar === 'expire' ? 'batal' : o.status,
          payments: { ...o.payments, status: statusBayar },
        }
      })
    )
  }

  // lanjutin pembayaran pending pake token yang udah kesimpen di payment nya
  function bayar(pid, token) {
    setError('')
    window.snap.pay(token, {
      onSuccess: () => selesaiBayar(pid, true),
      onPending: () => selesaiBayar(pid, false),
      onClose: () => selesaiBayar(pid, false),
      onError: () => setError('Waduh, ada masalah pas mau bayar. Coba lagi ya.'),
    })
  }

  // abis popup ketutup, cek status ke midtrans terus update tampilannya
  async function selesaiBayar(pid, berhasil) {
    const { data } = await supabase.functions.invoke('pay', {
      body: { aksi: 'cek', payment_id: pid },
    })
    if (data?.status) terapin(pid, data.status)
    if (berhasil) setSukses(true)
  }

  // update 1 order di db terus samain tampilannya, dipake tombol batalin & diterima
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
    return true
  }

  // confirm minta batal ke seller
  function konfirmBatal(order) {
    setError('')
    setTanya({
      teks: 'Yakin mau batalin pesanan ini? Pembatalannya perlu disetujuin toko dulu ya.',
      ya: 'Ya, Batalkan',
      gak: 'Gak Jadi',
      merah: true,
      aksi: () => ubah(order.id, { minta_batal: true }),
    })
  }

  // confirm pesanan udah diterima
  function konfirmTerima(order) {
    setError('')
    setTanya({
      teks: 'Pesanannya udah kamu terima? Setelah ini pesanan dianggap selesai ya.',
      ya: 'Ya, Diterima',
      gak: 'Belum',
      merah: false,
      aksi: () => ubah(order.id, { status: 'selesai' }),
    })
  }

  async function jawabYa() {
    const ok = await tanya.aksi()
    if (ok) setTanya(null)
  }

  // tanggal dibikin format indonesia, contoh: 15 Juli 2026
  function tanggal(waktu) {
    return new Date(waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
  }

  const btnFill =
    'bg-neon hover:bg-neon-terang text-putih text-sm font-semibold rounded-full px-5 py-2 transition duration-200 cursor-pointer'
  const btnMerah =
    'border border-merah text-merah hover:bg-merah hover:text-putih text-sm font-medium rounded-full px-5 py-2 transition duration-200 cursor-pointer'

  if (loading) return <p className="text-kabut text-center py-24">Sebentar ya...</p>

  if (orders.length === 0)
    return (
      <div className="text-center py-24 px-4">
        <p className="font-semibold text-lg">Belum ada pesanan nih.</p>
        <p className="text-kabut mt-1">Yuk mulai belanja.</p>
        <Link
          to="/"
          className="inline-block bg-neon hover:bg-neon-terang text-putih font-semibold rounded-full px-7 py-3 mt-6 transition duration-200"
        >
          Mulai Belanja
        </Link>
      </div>
    )

  // order yang belum dibayar gak masuk tab, digabung per payment buat strip di atas
  const belumBayar = []
  for (const o of orders) {
    if (o.payments?.status !== 'pending') continue
    const ada = belumBayar.find((p) => p.id === o.payment_id)
    if (ada) ada.jumlah += 1
    else belumBayar.push({ id: o.payment_id, jumlah: 1, token: o.payments.snap_token })
  }

  // isi tab yang lagi aktif (yang belum dibayar disaring keluar)
  const aktif = tabs.find((t) => t.id === tab)
  const diTab = orders.filter(
    (o) => o.payments?.status !== 'pending' && aktif.status.includes(o.status)
  )
  // khusus riwayat bisa dicari pake nomor pesanan / nama produk
  const kata = cari.toLowerCase()
  const tampil =
    tab === 'riwayat'
      ? diTab.filter(
          (o) =>
            o.kode.toLowerCase().includes(kata) ||
            o.order_items.some((i) => i.products?.name.toLowerCase().includes(kata))
        )
      : diTab

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* breadcrumb */}
      <p className="text-sm text-kabut">
        <Link to="/" className="hover:text-neon">
          Beranda
        </Link>{' '}
        / <span className="text-putih">Pesanan Saya</span>
      </p>
      <h1 className="font-bold text-2xl mt-4">Pesanan Saya</h1>

      {sukses && (
        <div className="bg-ijo text-putih text-sm font-medium rounded-(--radius-kartu) px-4 py-3 mt-4 flex items-center justify-between gap-3">
          Pembayaranmu berhasil!
          <button
            onClick={() => setSukses(false)}
            className="text-putih/80 hover:text-putih text-xl leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>
      )}
      {error && (
        <div className="bg-naik text-merah text-sm font-medium rounded-(--radius-kartu) px-4 py-3 mt-4">
          {error}
        </div>
      )}

      {/* strip pembayaran yang belum diselesain, 1 strip per payment */}
      {belumBayar.map((p) => (
        <div
          key={p.id}
          className="bg-naik rounded-(--radius-kartu) px-4 py-3 mt-4 flex items-center justify-between gap-4"
        >
          <p className="text-sm">
            Ada {p.jumlah} pesanan yang belum kamu bayar nih.
          </p>
          {p.token && (
            <button onClick={() => bayar(p.id, p.token)} className={btnFill + ' shrink-0'}>
              Bayar
            </button>
          )}
        </div>
      ))}

      {/* baris tab per status, scrollbar nya disembunyiin biar gak ganggu */}
      <div className="flex gap-1 mt-6 border-b border-naik text-sm overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {tabs.map((t) => {
          // jumlah pesanan di tab ini buat badge kecil, riwayat gak perlu angka
          const jumlah =
            t.id === 'riwayat'
              ? 0
              : orders.filter(
                  (o) => o.payments?.status !== 'pending' && t.status.includes(o.status)
                ).length
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

      {/* cari di riwayat, tab lain isinya dikit jadi gak perlu */}
      {tab === 'riwayat' && (
        <div className="relative mt-4">
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
      )}

      {diTab.length === 0 ? (
        <p className="text-kabut text-center py-16">{aktif.kosong}</p>
      ) : tampil.length === 0 ? (
        <p className="text-kabut text-center py-16">Gak ada pesanan yang cocok sama pencarianmu.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {tampil.map((order) => {
            const status = statusInfo[order.status]
            const riwayat = tab === 'riwayat'
            return (
              <div
                key={order.id}
                className={
                  // card riwayat dibikin lebih kalem: gak pake panel, cuma garis pinggir
                  riwayat
                    ? 'border border-naik rounded-(--radius-kartu) p-5'
                    : 'bg-panel rounded-(--radius-kartu) p-5'
                }
              >
                {/* baris atas: nomor + tanggal di kiri, chip status di kanan */}
                <div className="flex items-center justify-between gap-4">
                  <div>
                    {/* nomor pesanan bisa disalin sekali klik */}
                    <Salin id={order.kode} />
                    <p className="text-kabut text-xs mt-0.5">{tanggal(order.created_at)}</p>
                  </div>
                  <span className={'bg-naik text-xs rounded-full px-3 py-1 shrink-0 ' + status.warna}>
                    {status.label}
                  </span>
                </div>

                {/* box toko nya, bisa dihubungin atau diklik buat mampir ke tokonya */}
                {order.toko?.store && (
                  <div className="mt-4">
                    <TokoBox
                      id={order.seller_id}
                      nama={order.toko.store}
                      avatar={order.toko.avatar}
                      hp={['menunggu', 'dikirim', 'sampai'].includes(order.status) ? order.toko.phone : null}
                    />
                  </div>
                )}

                {/* info pengirim buat pesanan yang lagi dikirim */}
                {order.status === 'dikirim' && order.kurir_nama && (
                  <div className="bg-naik rounded-(--radius-input) p-4 mt-4 text-sm flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-kabut text-xs">Pengirim</p>
                      <p className="font-semibold mt-1">
                        {order.kurir_nama}
                        {order.kurir_phone && (
                          <span className="text-kabut font-normal"> — {order.kurir_phone}</span>
                        )}
                      </p>
                      {order.dikirim_at && (
                        <p className="text-kabut text-xs mt-1">
                          Dikirim {tanggal(order.dikirim_at)}
                          {order.estimasi_at && <span> · Estimasi tiba {tanggal(order.estimasi_at)}</span>}
                        </p>
                      )}
                    </div>
                    {order.kurir_phone && <Telpon hp={order.kurir_phone} judul="Hubungi Pengirim" />}
                  </div>
                )}

                {/* kapan paket nyampe, buat yang udah sampai / selesai */}
                {['sampai', 'selesai'].includes(order.status) && order.sampai_at && (
                  <p className="text-kabut text-xs mt-4">Tiba {tanggal(order.sampai_at)}</p>
                )}

                {/* daftar barang di order ini */}
                <div className="mt-4 space-y-3">
                  {order.order_items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3">
                      {item.products?.images?.[0] ? (
                        <img
                          src={item.products.images[0]}
                          alt={item.products.name}
                          className="w-12 h-12 object-cover rounded-(--radius-input)"
                        />
                      ) : (
                        <div className="w-12 h-12 bg-naik rounded-(--radius-input)" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {item.products?.name}
                          {item.variant_name && (
                            <span className="text-kabut font-normal"> ({item.variant_name})</span>
                          )}
                        </p>
                        <p className="text-kabut text-xs">
                          {item.qty} x Rp{item.price.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <p className="text-sm font-medium shrink-0">
                        Rp{(item.price * item.qty).toLocaleString('id-ID')}
                      </p>
                      {/* beli lagi cuma ada di riwayat, per barang */}
                      {riwayat && item.products && (
                        <Link
                          to={'/detail/' + item.products.id}
                          className="border border-neon text-neon hover:bg-neon hover:text-putih text-xs font-medium rounded-full px-4 py-1.5 transition duration-200 shrink-0"
                        >
                          Beli Lagi
                        </Link>
                      )}
                    </div>
                  ))}
                </div>

                {/* keterangan tambahan sesuai status */}
                {order.status === 'sampai' && order.retur?.status !== 'diajukan' && (
                  <p className="text-kabut text-xs mt-4">
                    Pesanan bakal otomatis selesai 2x24 jam setelah sampai.
                  </p>
                )}
                {order.status === 'sampai' && order.retur?.status === 'ditolak' && (
                  <p className="text-kabut text-xs mt-1">
                    Pengajuan pengembalianmu ditolak toko, pesanan lanjut jalan.
                  </p>
                )}
                {order.status === 'batal' && (
                  <p className="text-kabut text-xs mt-4">
                    {order.retur?.status === 'disetujui'
                      ? 'Pengembalianmu disetujui, pesanan dibatalin dan dananya dikembaliin.'
                      : 'Pesanan ini udah dibatalin.'}
                  </p>
                )}

                {/* baris bawah: total + tombol aksi sesuai status */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-naik mt-4 pt-4">
                  <p className="text-sm">
                    <span className="text-kabut">Total: </span>
                    <span className="text-neon font-bold text-lg">
                      Rp{order.total.toLocaleString('id-ID')}
                    </span>
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {order.status === 'menunggu' && !order.minta_batal && (
                      <button onClick={() => konfirmBatal(order)} className={btnMerah}>
                        Batalkan Pesanan
                      </button>
                    )}
                    {order.status === 'menunggu' && order.minta_batal && (
                      <span className="text-kabut text-sm">
                        Nunggu persetujuan toko buat pembatalan.
                      </span>
                    )}
                    {/* lagi ada pengajuan retur: tombolnya disimpen dulu sampe toko jawab */}
                    {order.status === 'sampai' && order.retur?.status === 'diajukan' && (
                      <span className="text-kabut text-sm">
                        Pengajuan pengembalianmu lagi ditinjau toko.
                      </span>
                    )}
                    {order.status === 'sampai' && order.retur?.status !== 'diajukan' && (
                      <>
                        {/* pengembalian cuma bisa diajuin sekali */}
                        {!order.retur && (
                          <button onClick={() => setAjukan(order)} className={btnMerah}>
                            Ajukan Pengembalian
                          </button>
                        )}
                        <button onClick={() => konfirmTerima(order)} className={btnFill}>
                          Pesanan Diterima
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* modal ajukan pengembalian */}
      {ajukan && (
        <Retur
          order={ajukan}
          tutup={() => setAjukan(null)}
          sukses={() => {
            // langsung ditandain lagi ditinjau biar gak perlu fetch ulang
            setOrders((lama) =>
              lama.map((o) => (o.id === ajukan.id ? { ...o, retur: { status: 'diajukan' } } : o))
            )
            setAjukan(null)
          }}
        />
      )}

      {/* confirm popup buat batalin & pesanan diterima */}
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
