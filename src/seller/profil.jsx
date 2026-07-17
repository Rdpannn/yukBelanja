import { useState } from 'react'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'
import FotoProfil from '../components/fotoProfil'

// modal edit profil toko: nama toko + no hp, kebuka dari dropdown identitas navbar
export default function Profil({ tutup }) {
  const { session, profile, setProfile } = useAuth()
  const [toko, setToko] = useState(profile?.store || '')
  const [hp, setHp] = useState(profile?.phone || '')
  const [sukses, setSukses] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // simpan perubahan ke tabel profiles
  async function simpan(e) {
    e.preventDefault()
    setError('')
    setSukses(false)
    setLoading(true)
    const { error } = await supabase
      .from('profiles')
      .update({ store: toko, phone: hp })
      .eq('id', session.user.id)
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setProfile({ ...profile, store: toko, phone: hp })
    setSukses(true)
  }

  const inputCls =
    'w-full bg-naik rounded-(--radius-input) px-4 py-3 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon'
  const labelCls = 'block text-[13px] font-medium text-kabut mb-2'

  return (
    <div className="fixed inset-0 bg-dasar/80 flex items-center justify-center px-4 z-20">
      <form onSubmit={simpan} className="bg-panel rounded-(--radius-kartu) p-8 md:p-10 w-full max-w-[420px]">
        <div className="flex items-start justify-between">
          <h2 className="font-bold text-2xl">Profil Toko</h2>
          <button
            type="button"
            onClick={tutup}
            className="text-kabut hover:text-putih text-2xl leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        <div className="mt-6">
          <FotoProfil nama={profile?.store} />
          <label className={labelCls + ' mt-4'}>Nama toko</label>
          <input
            type="text"
            value={toko}
            onChange={(e) => setToko(e.target.value)}
            placeholder="Contoh: Kios Hemat"
            required
            className={inputCls}
          />
          <label className={labelCls + ' mt-4'}>No. HP</label>
          <input
            type="text"
            value={hp}
            onChange={(e) => setHp(e.target.value.replace(/[^0-9]/g, ''))}
            inputMode="numeric"
            placeholder="Contoh: 081234567890"
            required
            className={inputCls}
          />
          <p className="text-kabut text-xs mt-2">Biar pembeli bisa hubungin kamu lewat WhatsApp.</p>
          {sukses && <p className="text-neon text-sm mt-3">Perubahan tokomu udah disimpen.</p>}
          {error && <p className="text-merah text-sm mt-3">{error}</p>}
        </div>

        {/* tombol simpan di kanan bawah, nutupnya lewat tombol x di atas */}
        <div className="flex justify-end mt-8">
          <button
            type="submit"
            disabled={loading}
            className="bg-neon hover:bg-neon-terang text-putih font-semibold rounded-full px-7 py-2.5 transition duration-200 cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Sebentar ya...' : 'Simpan Perubahan'}
          </button>
        </div>
      </form>
    </div>
  )
}
