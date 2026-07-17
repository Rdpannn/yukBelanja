import { useEffect, useState } from 'react'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'

const labelCls = 'block text-sm text-kabut mb-2'
const inputCls =
  'w-full bg-naik rounded-(--radius-input) px-4 py-3 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon'

// format angka jadi rupiah
function rupiah(n) {
  return 'Rp' + n.toLocaleString('id-ID')
}

// format tanggal periode event
function tgl(d) {
  return new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

// "12:00:00" dari db jadi "12.00"
function jam(t) {
  return t.slice(0, 5).replace(':', '.')
}

// label + warna chip status pengajuan
const statusInfo = {
  diajukan: { label: 'Ditinjau', warna: 'text-kabut' },
  disetujui: { label: 'Disetujui', warna: 'text-ijo' },
  ditolak: { label: 'Ditolak', warna: 'text-merah' },
}

export default function Event() {
  const { session } = useAuth()
  const [events, setEvents] = useState([]) // event yang lagi buka
  const [slots, setSlots] = useState([]) // slot jam flash sale yang aktif
  const [ajuan, setAjuan] = useState([]) // produk toko ini yang udah didaftarin
  const [produks, setProduks] = useState([]) // etalase aktif buat dropdown
  const [loading, setLoading] = useState(true)
  const [bukaForm, setBukaForm] = useState(null) // id event yang form daftarnya kebuka
  const [pilih, setPilih] = useState('') // product_id yang udah dipilih dari modal
  const [bukaModal, setBukaModal] = useState(false) // modal pilih produk
  const [calon, setCalon] = useState(null) // produk yang lagi disorot di modal, belum dikonfirmasi
  const [diskon, setDiskon] = useState('')
  const [error, setError] = useState('')
  const [proses, setProses] = useState(false)

  useEffect(() => {
    if (!session) return
    ambil()
  }, [session])

  async function ambil() {
    const hariIni = new Date().toISOString().slice(0, 10)
    const [ev, sl, aj, pr] = await Promise.all([
      supabase.from('events').select('*').eq('aktif', true).order('created_at'),
      supabase.from('event_slots').select('*').eq('aktif', true).order('jam_mulai'),
      supabase
        .from('event_products')
        .select('id, event_id, diskon, status, product:products!inner(id, name, price, images, seller_id)')
        .eq('product.seller_id', session.user.id)
        .order('id', { ascending: false }),
      supabase
        .from('products')
        .select('id, name, price, images')
        .eq('seller_id', session.user.id)
        .eq('status', 'aktif')
        .order('name'),
    ])
    // flash sale paling atas, event biasa yang periodenya udah lewat gak ditampilin
    const buka = (ev.data || []).filter((e) => e.tipe === 'flash_sale' || (e.selesai && e.selesai >= hariIni))
    buka.sort((a, b) => (a.tipe === 'flash_sale' ? -1 : b.tipe === 'flash_sale' ? 1 : 0))
    setEvents(buka)
    setSlots(sl.data || [])
    setAjuan(aj.data || [])
    setProduks(pr.data || [])
    setLoading(false)
  }

  // produk etalase yang belum didaftarin ke event ini
  function sisaProduk(eventId) {
    return produks.filter((p) => !ajuan.some((a) => a.event_id === eventId && a.product.id === p.id))
  }

  // buka form daftar di salah satu event
  function bukaDaftar(id) {
    setBukaForm(id)
    setPilih('')
    setDiskon('')
    setError('')
  }

  // buka modal pilih produk, produk yang udah kepilih jadi sorotan awal
  function bukaPilih() {
    setCalon(pilih ? Number(pilih) : null)
    setBukaModal(true)
  }

  // daftarin produk ke event
  async function daftar(e, ev) {
    e.preventDefault()
    setError('')
    if (Number(diskon) < ev.min_diskon) {
      setError('Diskonnya minimal ' + ev.min_diskon + '% ya.')
      return
    }
    setProses(true)
    const { data, error } = await supabase
      .from('event_products')
      .insert({ event_id: ev.id, product_id: Number(pilih), diskon: Number(diskon) })
      .select('id, event_id, diskon, status, product:products(id, name, price, images, seller_id)')
      .single()
    setProses(false)
    if (error) {
      setError(error.message)
      return
    }
    setAjuan([data, ...ajuan])
    setBukaForm(null)
  }

  // cabut produk dari event (termasuk yang ditolak, biar bisa daftarin ulang)
  async function cabut(a) {
    if (!confirm('Yakin mau cabut produk ini dari event?')) return
    const { error } = await supabase.from('event_products').delete().eq('id', a.id)
    if (!error) setAjuan(ajuan.filter((x) => x.id !== a.id))
  }

  // teks info di bawah nama event
  function infoEvent(ev) {
    if (ev.tipe === 'flash_sale') {
      const jamSlot = slots.map((s) => jam(s.jam_mulai) + ' – ' + jam(s.jam_selesai)).join(', ')
      return 'Tiap hari' + (jamSlot ? ' · ' + jamSlot : '') + ' · Min. diskon ' + ev.min_diskon + '%'
    }
    return tgl(ev.mulai) + ' – ' + tgl(ev.selesai) + ' · Min. diskon ' + ev.min_diskon + '%'
  }

  return (
    <div>
      <p className="text-xs text-kabut">
        Kelola Produk / <span className="text-putih">Event Produk</span>
      </p>
      <h1 className="font-bold text-2xl mt-1">Event Produk</h1>

      {loading ? (
        <p className="text-kabut text-center py-16">Sebentar ya...</p>
      ) : events.length === 0 ? (
        <p className="text-kabut text-center py-16">Belum ada event yang buka. Cek lagi nanti ya.</p>
      ) : (
        <div className="mt-6 space-y-4">
          {events.map((ev) => {
            const punya = ajuan.filter((a) => a.event_id === ev.id)
            const sisa = sisaProduk(ev.id)
            const produkPilihan = produks.find((p) => p.id === Number(pilih))
            return (
              <div key={ev.id} className="bg-panel rounded-(--radius-kartu) p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-semibold text-lg">{ev.nama}</p>
                    <p className="text-kabut text-xs mt-0.5">{infoEvent(ev)}</p>
                  </div>
                  {bukaForm !== ev.id && (
                    <button
                      onClick={() => bukaDaftar(ev.id)}
                      className="text-neon hover:text-neon-terang text-sm font-medium cursor-pointer shrink-0"
                    >
                      + Daftarin Produk
                    </button>
                  )}
                </div>

                {/* form daftarin produk ke event ini */}
                {bukaForm === ev.id &&
                  (sisa.length === 0 ? (
                    <div className="flex items-center gap-3 mt-4">
                      <p className="text-kabut text-sm">Gak ada produk yang bisa didaftarin.</p>
                      <button
                        onClick={() => setBukaForm(null)}
                        className="text-kabut hover:text-neon text-sm font-medium cursor-pointer"
                      >
                        Batal
                      </button>
                    </div>
                  ) : (
                    <form onSubmit={(e) => daftar(e, ev)} className="mt-4">
                      <div className="flex flex-wrap items-end gap-3">
                        <div>
                          <label className={labelCls}>Produk</label>
                          {produkPilihan ? (
                            // produk udah dipilih, klik buat ganti lewat modal lagi
                            <button
                              type="button"
                              onClick={bukaPilih}
                              title="Ganti produk"
                              className="flex items-center gap-3 bg-naik rounded-(--radius-input) pl-2 pr-4 py-2 cursor-pointer hover:ring-2 hover:ring-neon transition duration-200"
                            >
                              <img
                                src={produkPilihan.images[0]}
                                alt={produkPilihan.name}
                                className="w-8 h-8 object-cover rounded-(--radius-input)"
                              />
                              <span className="text-sm">{produkPilihan.name}</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={bukaPilih}
                              className="border border-neon text-neon hover:bg-neon hover:text-putih text-sm font-medium rounded-full px-5 py-2.5 transition duration-200 cursor-pointer"
                            >
                              Pilih Produk
                            </button>
                          )}
                        </div>
                        <div className="w-28">
                          <label className={labelCls}>Diskon (%)</label>
                          <input
                            type="number"
                            min="1"
                            max="90"
                            value={diskon}
                            onChange={(e) => setDiskon(e.target.value)}
                            required
                            className={inputCls}
                          />
                        </div>
                        <button
                          type="submit"
                          disabled={proses || !pilih}
                          className="bg-neon hover:bg-neon-terang text-putih text-sm font-semibold rounded-full px-5 py-2.5 transition duration-200 cursor-pointer disabled:opacity-60"
                        >
                          {proses ? 'Sebentar ya...' : 'Daftarin'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setBukaForm(null)}
                          className="text-kabut hover:text-neon text-sm font-medium px-2 py-2.5 cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>

                      {/* preview harga abis dipotong diskon */}
                      {produkPilihan && diskon > 0 && (
                        <p className="text-sm mt-3">
                          <span className="text-kabut line-through">{rupiah(produkPilihan.price)}</span>{' '}
                          <span className="text-neon font-semibold">
                            {rupiah(Math.round((produkPilihan.price * (100 - diskon)) / 100))}
                          </span>
                        </p>
                      )}

                      {error && <p className="text-merah text-sm mt-3">{error}</p>}
                    </form>
                  ))}

                {/* produk toko ini yang udah didaftarin ke event ini */}
                {punya.length === 0 ? (
                  <p className="text-kabut text-sm text-center py-6">Belum ada produkmu yang ikut event ini.</p>
                ) : (
                  <div className="mt-4 space-y-2">
                    {punya.map((a) => {
                      const hargaDiskon = Math.round((a.product.price * (100 - a.diskon)) / 100)
                      const info = statusInfo[a.status]
                      return (
                        <div key={a.id} className="bg-naik rounded-(--radius-input) px-4 py-3 flex items-start gap-3">
                          <img
                            src={a.product.images[0]}
                            alt={a.product.name}
                            className="w-12 h-12 object-cover rounded-(--radius-input) shrink-0"
                          />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{a.product.name}</p>
                            <p className="text-xs mt-0.5">
                              <span className="text-kabut line-through">{rupiah(a.product.price)}</span>{' '}
                              <span className="text-neon font-semibold">{rupiah(hargaDiskon)}</span>
                              <span className="text-kabut"> · Diskon {a.diskon}%</span>
                            </p>
                          </div>
                          {/* chip status di kanan atas, icon cabut di bawahnya */}
                          <div className="flex flex-col items-end gap-2 shrink-0">
                            <span className={'bg-dasar text-[10px] font-medium rounded-full px-2.5 py-0.5 ' + info.warna}>
                              {info.label}
                            </span>
                            <button
                              onClick={() => cabut(a)}
                              title="Cabut dari event"
                              className="w-9 h-9 border border-merah text-merah hover:bg-merah hover:text-putih rounded-(--radius-input) flex items-center justify-center transition duration-200 cursor-pointer"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" width={16} height={16}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* modal pilih produk dari etalase */}
      {bukaModal && (
        <div className="fixed inset-0 bg-dasar/80 flex items-center justify-center px-4 z-20">
          <div className="bg-panel rounded-(--radius-kartu) p-6 w-full max-w-[640px] max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-lg">Pilih Produk</h2>
              <button
                onClick={() => setBukaModal(false)}
                className="text-kabut hover:text-putih text-xl leading-none cursor-pointer"
              >
                ×
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4 overflow-y-auto">
              {sisaProduk(bukaForm).map((p) => (
                <button
                  type="button"
                  key={p.id}
                  onClick={() => setCalon(p.id)}
                  className={
                    'bg-naik rounded-(--radius-input) p-3 text-left cursor-pointer transition duration-200 ' +
                    (calon === p.id ? 'ring-2 ring-neon' : 'hover:ring-2 hover:ring-kabut/40')
                  }
                >
                  <img
                    src={p.images[0]}
                    alt={p.name}
                    className="w-full aspect-square object-cover rounded-(--radius-input)"
                  />
                  <p className="text-sm font-medium truncate mt-2">{p.name}</p>
                  <p className="text-kabut text-xs mt-0.5">{rupiah(p.price)}</p>
                </button>
              ))}
            </div>

            <div className="flex justify-end gap-3 mt-5">
              <button
                onClick={() => setBukaModal(false)}
                className="text-kabut hover:text-neon text-sm font-medium px-2 cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setPilih(String(calon))
                  setBukaModal(false)
                }}
                disabled={!calon}
                className="bg-neon hover:bg-neon-terang text-putih text-sm font-semibold rounded-full px-6 py-2.5 transition duration-200 cursor-pointer disabled:opacity-60"
              >
                Pilih
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
