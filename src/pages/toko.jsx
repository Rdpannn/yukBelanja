import { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'

export default function Toko() {
  const { session, profile, setProfile, loading: cekSession } = useAuth()
  const navigate = useNavigate()
  const [nama, setNama] = useState('')
  const [hp, setHp] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // masih ngecek session, jangan render dulu
  if (cekSession) return null

  // harus login dulu buat buka toko
  if (!session) return <Navigate to="/login" replace />

  // udah punya toko, langsung ke dashboard
  if (profile?.role === 'seller') return <Navigate to="/seller" replace />

  // ganti role jadi seller + simpan nama toko sama no hp nya
  async function bukaToko(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({ role: 'seller', store: nama, phone: hp })
      .eq('id', session.user.id)
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setProfile({ ...profile, role: 'seller', store: nama, phone: hp })
    navigate('/seller')
  }

  return (
    <div className="flex justify-center px-4 pt-16 md:pt-24">
      <div className="bg-panel rounded-(--radius-kartu) p-8 md:p-10 w-full max-w-[420px] text-center">
        <h1 className="font-bold text-2xl">Buka toko kamu</h1>
        <p className="text-kabut mt-2">Isi nama tokonya, langsung bisa mulai jualan. Gratis kok.</p>

        <form onSubmit={bukaToko} className="mt-8 text-left">
          <label className="block text-[13px] font-medium text-kabut mb-2">Nama toko</label>
          <input
            type="text"
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            placeholder="Contoh: Kios Hemat"
            required
            className="w-full bg-naik rounded-(--radius-input) px-4 py-3 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon"
          />
          <label className="block text-[13px] font-medium text-kabut mb-2 mt-4">No. HP</label>
          <input
            type="text"
            value={hp}
            onChange={(e) => setHp(e.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric"
            placeholder="Contoh: 081234567890"
            required
            className="w-full bg-naik rounded-(--radius-input) px-4 py-3 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon"
          />
          <p className="text-kabut text-xs mt-2">Biar pembeli bisa hubungin kamu lewat WhatsApp.</p>
          {error && <p className="text-neon text-sm mt-3">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neon hover:bg-neon-terang text-putih font-semibold rounded-full px-7 py-3 mt-5 transition duration-200 cursor-pointer disabled:opacity-60"
          >
            Buka Toko
          </button>
        </form>
      </div>
    </div>
  )
}
