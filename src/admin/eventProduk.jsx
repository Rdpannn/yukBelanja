import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import supabase from '../lib/supabase'

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

// list produk yang terdaftar (disetujui) di satu event
export default function EventProduk() {
  const { id } = useParams()
  const [event, setEvent] = useState(null)
  const [slots, setSlots] = useState([]) // slot jam aktif, buat info flash sale
  const [items, setItems] = useState([]) // produk yang disetujui di event ini
  const [loading, setLoading] = useState(true)
  const [cari, setCari] = useState('')
  const [sortir, setSortir] = useState('baru')

  useEffect(() => {
    ambil()
  }, [id])

  async function ambil() {
    const [ev, sl, ep] = await Promise.all([
      supabase.from('events').select('*').eq('id', id).single(),
      supabase.from('event_slots').select('*').eq('aktif', true).order('jam_mulai'),
      supabase
        .from('event_products')
        .select('id, diskon, product:products(id, name, price, images, profiles(store))')
        .eq('event_id', id)
        .eq('status', 'disetujui')
        .order('id', { ascending: false }),
    ])
    setEvent(ev.data)
    setSlots(sl.data || [])
    setItems(ep.data || [])
    setLoading(false)
  }

  // hapus produk dari event, seller nya dikabarin lewat trigger db
  async function hapus(item) {
    if (!confirm('Yakin mau hapus produk ini dari event? Diskonnya langsung gak berlaku.')) return
    const { error } = await supabase.from('event_products').delete().eq('id', item.id)
    if (!error) setItems(items.filter((x) => x.id !== item.id))
  }

  // teks info di bawah nama event, sama kayak card di halaman event
  function infoEvent() {
    if (event.tipe === 'flash_sale') {
      const jamSlot = slots.map((s) => jam(s.jam_mulai) + ' – ' + jam(s.jam_selesai)).join(', ')
      return 'Tiap hari' + (jamSlot ? ' · ' + jamSlot : '') + ' · Min. diskon ' + event.min_diskon + '%'
    }
    return tgl(event.mulai) + ' – ' + tgl(event.selesai) + ' · Min. diskon ' + event.min_diskon + '%'
  }

  if (loading) return <p className="text-kabut text-center py-16">Sebentar ya...</p>
  if (!event) return null

  // filter hasil cari + urutannya
  const kata = cari.toLowerCase()
  const tampil = items
    .filter(
      (item) =>
        item.product.name.toLowerCase().includes(kata) ||
        (item.product.profiles?.store || '').toLowerCase().includes(kata)
    )
    .sort((a, b) => (sortir === 'lama' ? a.id - b.id : b.id - a.id))

  return (
    <div>
      <p className="text-xs text-kabut">
        Kelola Sistem /{' '}
        <Link to="/admin/events" className="hover:text-neon">
          Event
        </Link>{' '}
        / <span className="text-putih">{event.nama}</span>
      </p>
      <h1 className="font-bold text-2xl mt-1">{event.nama}</h1>
      <p className="text-kabut text-xs mt-1">
        {infoEvent()} · {items.length} produk
      </p>

      {/* cari + urutan */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <div className="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={16} height={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-kabut">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama produk atau toko"
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

      {items.length === 0 ? (
        <p className="text-kabut text-center py-16">Belum ada produk yang terdaftar di event ini.</p>
      ) : tampil.length === 0 ? (
        <p className="text-kabut text-center py-16">Gak ada produk yang cocok sama pencarianmu.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {tampil.map((item) => {
            const hargaDiskon = Math.round((item.product.price * (100 - item.diskon)) / 100)
            return (
              <div key={item.id} className="bg-panel rounded-(--radius-kartu) p-4 flex items-center gap-4">
                <img
                  src={item.product.images[0]}
                  alt={item.product.name}
                  className="w-16 h-16 object-cover rounded-(--radius-input) shrink-0"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{item.product.name}</p>
                  <p className="text-kabut text-xs mt-0.5 truncate">{item.product.profiles?.store}</p>
                  <p className="text-sm mt-1">
                    <span className="text-kabut line-through">{rupiah(item.product.price)}</span>{' '}
                    <span className="text-neon font-semibold">{rupiah(hargaDiskon)}</span>
                    <span className="text-kabut text-xs"> · Diskon {item.diskon}%</span>
                  </p>
                </div>
                {/* icon tempat sampah buat hapus dari event */}
                <button
                  onClick={() => hapus(item)}
                  title="Hapus dari event"
                  className="w-9 h-9 border border-merah text-merah hover:bg-merah hover:text-putih rounded-(--radius-input) flex items-center justify-center transition duration-200 cursor-pointer shrink-0"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" width={16} height={16}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
