import { useEffect, useState } from 'react'
import supabase from '../lib/supabase'

// daftar toko (akun seller) + jumlah produknya masing masing
export default function Toko() {
  const [sellers, setSellers] = useState([])
  const [jumlah, setJumlah] = useState({}) // jumlah produk per seller
  const [loading, setLoading] = useState(true)
  const [cari, setCari] = useState('')
  const [sortir, setSortir] = useState('baru')

  useEffect(() => {
    // ambil semua seller + daftar produk buat ngitung punya siapa aja
    Promise.all([
      supabase.from('profiles').select('*').eq('role', 'seller').order('created_at', { ascending: false }),
      supabase.from('products').select('seller_id').neq('status', 'dihapus'),
    ]).then(([prof, prod]) => {
      setSellers(prof.data || [])
      const hitung = {}
      ;(prod.data || []).forEach((p) => {
        hitung[p.seller_id] = (hitung[p.seller_id] || 0) + 1
      })
      setJumlah(hitung)
      setLoading(false)
    })
  }, [])

  async function ubahRole(u, role) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', u.id)
    if (!error) setSellers(sellers.map((x) => (x.id === u.id ? { ...x, role } : x)))
  }

  // saring sesuai kata cari, yang pindah role otomatis ilang dari daftar
  const tampil = sellers
    .filter((u) => u.role === 'seller' && (u.store || '').toLowerCase().includes(cari.toLowerCase()))
    .sort((a, b) =>
      sortir === 'lama'
        ? new Date(a.created_at) - new Date(b.created_at)
        : new Date(b.created_at) - new Date(a.created_at)
    )

  return (
    <div>
      <p className="text-xs text-kabut">
        Kelola Pengguna / <span className="text-putih">Toko</span>
      </p>
      <h1 className="font-bold text-2xl mt-2">Toko</h1>

      {/* cari + sortir */}
      <div className="flex flex-col sm:flex-row gap-3 mt-6">
        <div className="relative flex-1">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={16} height={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-kabut">
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
          </svg>
          <input
            type="text"
            value={cari}
            onChange={(e) => setCari(e.target.value)}
            placeholder="Cari nama toko"
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
      ) : tampil.length === 0 ? (
        <p className="text-kabut text-center py-16">
          {cari ? 'Gak ada yang cocok sama pencarianmu.' : 'Belum ada toko yang buka.'}
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {tampil.map((u) => (
            <div key={u.id} className="bg-panel rounded-(--radius-kartu) p-4 flex items-center gap-4">
              {u.avatar ? (
                <img src={u.avatar} alt={u.store} referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover shrink-0" />
              ) : (
                <span className="w-9 h-9 rounded-full bg-naik text-neon font-semibold flex items-center justify-center shrink-0">
                  {(u.store || 'T')[0].toUpperCase()}
                </span>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{u.store}</p>
                <p className="text-kabut text-xs mt-0.5 truncate">Pemilik: {u.name}</p>
                <p className="text-kabut text-xs mt-0.5">
                  {u.phone} · {jumlah[u.id] || 0} produk
                </p>
              </div>
              <select
                value={u.role}
                onChange={(e) => ubahRole(u, e.target.value)}
                className="bg-naik text-sm rounded-(--radius-input) px-3 py-2 outline-none focus:ring-2 focus:ring-neon cursor-pointer"
              >
                <option value="buyer">buyer</option>
                <option value="seller">toko</option>
                <option value="admin">admin</option>
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
