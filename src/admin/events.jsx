import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
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

// tombol geser buat nyalain / matiin
function Saklar({ nyala, ubah }) {
  return (
    <button
      type="button"
      onClick={ubah}
      className={
        'w-9 h-5 rounded-full p-0.5 transition duration-200 cursor-pointer shrink-0 ' +
        (nyala ? 'bg-neon' : 'bg-dasar')
      }
    >
      <span
        className={
          'block w-4 h-4 bg-putih rounded-full transition duration-200 ' + (nyala ? 'translate-x-4' : '')
        }
      ></span>
    </button>
  )
}

export default function Events() {
  const navigate = useNavigate()
  const [flash, setFlash] = useState(null) // event flash sale, cuma 1 baris tetap
  const [slots, setSlots] = useState([])
  const [events, setEvents] = useState([]) // event biasa
  const [ajuan, setAjuan] = useState([]) // pengajuan produk dari seller
  const [tab, setTab] = useState('event')
  const [minFlash, setMinFlash] = useState('')
  const [bukaSlot, setBukaSlot] = useState(false)
  const [slotForm, setSlotForm] = useState({ mulai: '', selesai: '' })
  const [bukaForm, setBukaForm] = useState(false)
  const [editId, setEditId] = useState(null) // id event yang lagi diedit
  const [form, setForm] = useState({ nama: '', mulai: '', selesai: '', min: '', aktif: true })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    ambil()
  }, [])

  // ambil semua data event + slot + pengajuan sekali jalan
  async function ambil() {
    const [ev, sl, aj] = await Promise.all([
      supabase.from('events').select('*').order('created_at', { ascending: false }),
      supabase.from('event_slots').select('*').order('jam_mulai'),
      supabase
        .from('event_products')
        .select('id, diskon, event:events(nama), product:products(id, name, price, images, profiles(store))')
        .eq('status', 'diajukan')
        .order('id', { ascending: false }),
    ])
    const semua = ev.data || []
    const fs = semua.find((e) => e.tipe === 'flash_sale')
    setFlash(fs)
    setMinFlash(fs ? String(fs.min_diskon) : '')
    setEvents(semua.filter((e) => e.tipe === 'biasa'))
    setSlots(sl.data || [])
    setAjuan(aj.data || [])
  }

  // simpan minimal diskon flash sale
  async function simpanMinFlash() {
    const { error } = await supabase
      .from('events')
      .update({ min_diskon: Number(minFlash) || 0 })
      .eq('id', flash.id)
    if (error) setError(error.message)
  }

  // tambah slot jam flash sale
  async function tambahSlot(e) {
    e.preventDefault()
    setError('')
    const { data, error } = await supabase
      .from('event_slots')
      .insert({ event_id: flash.id, jam_mulai: slotForm.mulai, jam_selesai: slotForm.selesai })
      .select()
      .single()
    if (error) {
      setError(error.message)
      return
    }
    setSlots([...slots, data].sort((a, b) => a.jam_mulai.localeCompare(b.jam_mulai)))
    setSlotForm({ mulai: '', selesai: '' })
    setBukaSlot(false)
  }

  // nyalain / matiin slot
  async function toggleSlot(s) {
    const { error } = await supabase.from('event_slots').update({ aktif: !s.aktif }).eq('id', s.id)
    if (!error) setSlots(slots.map((x) => (x.id === s.id ? { ...x, aktif: !s.aktif } : x)))
  }

  async function hapusSlot(id) {
    if (!confirm('Yakin mau hapus slot ini?')) return
    const { error } = await supabase.from('event_slots').delete().eq('id', id)
    if (!error) setSlots(slots.filter((s) => s.id !== id))
  }

  // buka form kosong buat nambah event
  function tambah() {
    setEditId(null)
    setForm({ nama: '', mulai: '', selesai: '', min: '', aktif: true })
    setError('')
    setBukaForm(true)
  }

  // buka form keisi data event yang mau diedit
  function edit(ev) {
    setEditId(ev.id)
    setForm({ nama: ev.nama, mulai: ev.mulai, selesai: ev.selesai, min: String(ev.min_diskon), aktif: ev.aktif })
    setError('')
    setBukaForm(true)
  }

  // simpan event baru / hasil edit
  async function simpan(e) {
    e.preventDefault()
    setError('')

    // nonaktifin event yang tadinya aktif harus dikonfirmasi dulu, seller peserta bakal dapet notif
    const lama = editId ? events.find((x) => x.id === editId) : null
    if (lama && lama.aktif && !form.aktif) {
      if (!confirm('Yakin mau nonaktifin event ini? Harga produk peserta balik normal dan tokonya bakal dikabarin lewat notifikasi.')) return
    }

    setLoading(true)
    const isi = {
      nama: form.nama,
      mulai: form.mulai,
      selesai: form.selesai,
      min_diskon: Number(form.min) || 0,
      aktif: form.aktif,
    }
    const { data, error } = editId
      ? await supabase.from('events').update(isi).eq('id', editId).select().single()
      : await supabase.from('events').insert(isi).select().single()
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setEvents(editId ? events.map((x) => (x.id === editId ? data : x)) : [data, ...events])
    setBukaForm(false)
  }

  // nyalain / matiin event dari daftar, matiin yang aktif harus konfirmasi dulu
  async function toggleEvent(ev) {
    if (
      ev.aktif &&
      !confirm('Yakin mau nonaktifin event ini? Harga produk peserta balik normal dan tokonya bakal dikabarin lewat notifikasi.')
    )
      return
    const { error } = await supabase.from('events').update({ aktif: !ev.aktif }).eq('id', ev.id)
    if (!error) setEvents(events.map((x) => (x.id === ev.id ? { ...x, aktif: !ev.aktif } : x)))
  }

  // hapus event, pengajuan produknya ikut kehapus (cascade)
  async function hapus(id) {
    if (!confirm('Yakin mau hapus event ini? Produk yang udah didaftarin ikut kehapus.')) return
    const { error } = await supabase.from('events').delete().eq('id', id)
    if (!error) {
      setEvents(events.filter((ev) => ev.id !== id))
      // pengajuan produk event ini ikut kehapus, ambil ulang biar angkanya bener
      ambil()
    }
  }

  // jawab pengajuan produk seller
  async function jawab(a, setuju) {
    const { error } = await supabase
      .from('event_products')
      .update({ status: setuju ? 'disetujui' : 'ditolak' })
      .eq('id', a.id)
    if (error) {
      setError(error.message)
      return
    }
    setAjuan(ajuan.filter((x) => x.id !== a.id))
  }

  const btnFill =
    'bg-neon hover:bg-neon-terang text-putih text-xs font-semibold rounded-full px-4 py-1.5 transition duration-200 cursor-pointer shrink-0'
  const btnMerah =
    'border border-merah text-merah hover:bg-merah hover:text-putih text-xs font-medium rounded-full px-4 py-1.5 transition duration-200 cursor-pointer shrink-0'
  // icon button pola etalase seller
  const btnIconNaik =
    'w-9 h-9 bg-naik text-putih hover:text-neon rounded-(--radius-input) flex items-center justify-center transition duration-200 cursor-pointer shrink-0'
  const btnIconMerah =
    'w-9 h-9 border border-merah text-merah hover:bg-merah hover:text-putih rounded-(--radius-input) flex items-center justify-center transition duration-200 cursor-pointer shrink-0'

  return (
    <div>
      <p className="text-xs text-kabut">
        Kelola Sistem / <span className="text-putih">Event</span>
      </p>
      <div className="flex items-center justify-between mt-2">
        <h1 className="font-bold text-2xl">Event</h1>
        {tab === 'event' && !bukaForm && (
          <button
            onClick={tambah}
            className="bg-neon hover:bg-neon-terang text-putih text-sm font-semibold rounded-full px-5 py-2.5 transition duration-200 cursor-pointer"
          >
            + Tambah Event
          </button>
        )}
      </div>

      {/* baris tab, polanya samain kayak halaman pesanan */}
      <div className="flex gap-1 mt-6 border-b border-naik text-sm">
        {[
          { id: 'event', label: 'Daftar Event' },
          { id: 'ajuan', label: 'Pengajuan Produk' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={
              'flex items-center gap-1.5 px-4 py-2.5 whitespace-nowrap border-b-2 -mb-px transition duration-200 cursor-pointer ' +
              (tab === t.id ? 'border-neon text-neon font-semibold' : 'border-transparent text-kabut hover:text-putih')
            }
          >
            {t.label}
            {t.id === 'ajuan' && ajuan.length > 0 && (
              <span
                className={
                  'text-[10px] font-semibold rounded-full min-w-4 h-4 px-1 flex items-center justify-center ' +
                  (tab === t.id ? 'bg-neon text-putih' : 'bg-naik text-kabut')
                }
              >
                {ajuan.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {tab === 'event' && (
        <>
          {/* form tambah / edit event biasa */}
          {bukaForm && (
            <form onSubmit={simpan} className="bg-panel rounded-(--radius-kartu) p-6 mt-6">
              <div>
                <label className={labelCls}>Nama Event</label>
                <input
                  type="text"
                  value={form.nama}
                  onChange={(e) => setForm({ ...form, nama: e.target.value })}
                  required
                  className={inputCls}
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-4">
                <div className="w-44">
                  <label className={labelCls}>Mulai</label>
                  <input
                    type="date"
                    value={form.mulai}
                    onChange={(e) => setForm({ ...form, mulai: e.target.value })}
                    required
                    className={inputCls + ' [color-scheme:dark]'}
                  />
                </div>
                <div className="w-44">
                  <label className={labelCls}>Selesai</label>
                  <input
                    type="date"
                    value={form.selesai}
                    min={form.mulai}
                    onChange={(e) => setForm({ ...form, selesai: e.target.value })}
                    required
                    className={inputCls + ' [color-scheme:dark]'}
                  />
                </div>
                <div className="w-44">
                  <label className={labelCls}>Minimal Diskon (%)</label>
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={form.min}
                    onChange={(e) => setForm({ ...form, min: e.target.value })}
                    required
                    className={inputCls}
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 mt-4 text-sm cursor-pointer w-fit">
                <input
                  type="checkbox"
                  checked={form.aktif}
                  onChange={(e) => setForm({ ...form, aktif: e.target.checked })}
                  className="w-4 h-4 accent-(--color-neon) cursor-pointer"
                />
                Aktif
              </label>

              {error && <p className="text-neon text-sm mt-4">{error}</p>}

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-neon hover:bg-neon-terang text-putih text-sm font-semibold rounded-full px-6 py-2.5 transition duration-200 cursor-pointer disabled:opacity-60"
                >
                  Simpan
                </button>
                <button
                  type="button"
                  onClick={() => setBukaForm(false)}
                  className="text-kabut hover:text-neon text-sm font-medium px-2 cursor-pointer"
                >
                  Batal
                </button>
              </div>
            </form>
          )}

          {/* card flash sale, event tetap yang gak bisa dihapus */}
          {flash && (
            <div className="bg-panel rounded-(--radius-kartu) p-6 mt-6">
              <div className="flex items-start justify-between gap-4">
                <p className="font-semibold text-lg">Flash Sale</p>
                <button onClick={() => navigate('/admin/events/' + flash.id)} className={btnFill}>
                  Lihat Produk
                </button>
              </div>

              <div className="mt-4">
                <label className={labelCls}>Minimal Diskon (%)</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max="90"
                    value={minFlash}
                    onChange={(e) => setMinFlash(e.target.value)}
                    className={inputCls + ' w-28'}
                  />
                  <button
                    onClick={simpanMinFlash}
                    className="bg-naik hover:bg-neon text-putih text-sm font-medium rounded-full px-5 transition duration-200 cursor-pointer"
                  >
                    Simpan
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mt-5">
                <p className="text-sm text-kabut">Slot Jam</p>
                {!bukaSlot && (
                  <button
                    onClick={() => setBukaSlot(true)}
                    className="text-neon hover:text-neon-terang text-sm font-medium cursor-pointer"
                  >
                    + Tambah Slot
                  </button>
                )}
              </div>

              {slots.length === 0 && !bukaSlot ? (
                <p className="text-kabut text-sm text-center py-6">Belum ada slot jam. Tambahin dulu yuk.</p>
              ) : (
                <div className="mt-3 space-y-2">
                  {slots.map((s) => (
                    <div key={s.id} className="bg-naik rounded-(--radius-input) px-4 py-2.5 flex items-center gap-4">
                      <p className="text-sm flex-1">
                        {jam(s.jam_mulai)} – {jam(s.jam_selesai)}
                      </p>
                      <Saklar nyala={s.aktif} ubah={() => toggleSlot(s)} />
                      {/* icon tempat sampah buat hapus slot */}
                      <button onClick={() => hapusSlot(s.id)} title="Hapus slot" className={btnIconMerah}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" width={16} height={16}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* form nambah slot jam */}
              {bukaSlot && (
                <form onSubmit={tambahSlot} className="flex flex-wrap items-end gap-3 mt-3">
                  <div className="w-36">
                    <label className={labelCls}>Jam Mulai</label>
                    <input
                      type="time"
                      value={slotForm.mulai}
                      onChange={(e) => setSlotForm({ ...slotForm, mulai: e.target.value })}
                      required
                      className={inputCls + ' [color-scheme:dark]'}
                    />
                  </div>
                  <div className="w-36">
                    <label className={labelCls}>Jam Selesai</label>
                    <input
                      type="time"
                      value={slotForm.selesai}
                      min={slotForm.mulai}
                      onChange={(e) => setSlotForm({ ...slotForm, selesai: e.target.value })}
                      required
                      className={inputCls + ' [color-scheme:dark]'}
                    />
                  </div>
                  <button
                    type="submit"
                    className="bg-neon hover:bg-neon-terang text-putih text-sm font-semibold rounded-full px-5 py-2.5 transition duration-200 cursor-pointer"
                  >
                    Simpan
                  </button>
                  <button
                    type="button"
                    onClick={() => setBukaSlot(false)}
                    className="text-kabut hover:text-neon text-sm font-medium px-2 py-2.5 cursor-pointer"
                  >
                    Batal
                  </button>
                </form>
              )}

              {error && !bukaForm && <p className="text-neon text-sm mt-4">{error}</p>}
            </div>
          )}

          {/* daftar event biasa */}
          {events.length === 0 && !bukaForm ? (
            <p className="text-kabut text-center py-16">Belum ada event. Tambahin dulu yuk.</p>
          ) : (
            <div className="mt-6 space-y-3">
              {events.map((ev) => (
                <div key={ev.id} className="bg-panel rounded-(--radius-kartu) p-4 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{ev.nama}</p>
                    <p className="text-kabut text-xs mt-0.5">
                      {tgl(ev.mulai)} – {tgl(ev.selesai)} · Min. diskon {ev.min_diskon}%
                    </p>
                  </div>
                  <Saklar nyala={ev.aktif} ubah={() => toggleEvent(ev)} />
                  {/* icon pensil buat edit */}
                  <button onClick={() => edit(ev)} title="Edit event" className={btnIconNaik}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" width={16} height={16}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </button>
                  {/* icon tempat sampah buat hapus */}
                  <button onClick={() => hapus(ev.id)} title="Hapus event" className={btnIconMerah}>
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" width={16} height={16}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                  <button onClick={() => navigate('/admin/events/' + ev.id)} className={btnFill}>
                    Lihat Produk
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === 'ajuan' &&
        (ajuan.length === 0 ? (
          <p className="text-kabut text-center py-16">Belum ada pengajuan produk.</p>
        ) : (
          <div className="mt-6 space-y-3">
            {ajuan.map((a) => {
              // harga setelah dipotong diskon yang diajuin
              const hargaDiskon = Math.round((a.product.price * (100 - a.diskon)) / 100)
              return (
                <div key={a.id} className="bg-panel rounded-(--radius-kartu) p-4 flex items-center gap-4">
                  <img
                    src={a.product.images[0]}
                    alt={a.product.name}
                    className="w-16 h-16 object-cover rounded-(--radius-input) shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">{a.product.name}</p>
                    <p className="text-kabut text-xs mt-0.5 truncate">
                      {a.product.profiles?.store} · {a.event?.nama}
                    </p>
                    <p className="text-sm mt-1">
                      <span className="text-kabut line-through">{rupiah(a.product.price)}</span>{' '}
                      <span className="text-neon font-semibold">{rupiah(hargaDiskon)}</span>
                      <span className="text-kabut text-xs"> · Diskon {a.diskon}%</span>
                    </p>
                  </div>
                  <Link
                    to={'/admin/products/' + a.product.id}
                    className="text-kabut hover:text-neon text-xs font-medium shrink-0"
                  >
                    Lihat Detail
                  </Link>
                  <button onClick={() => jawab(a, false)} className={btnMerah}>
                    Tolak
                  </button>
                  <button onClick={() => jawab(a, true)} className={btnFill}>
                    Setujui
                  </button>
                </div>
              )
            })}
          </div>
        ))}
    </div>
  )
}
