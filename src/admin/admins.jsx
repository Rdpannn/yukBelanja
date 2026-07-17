import { useEffect, useState } from 'react'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'

// daftar akun admin, akun sendiri dikunci biar gak nurunin diri sendiri
export default function Admins() {
  const { session } = useAuth()
  const [admins, setAdmins] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // ambil semua profil yang role nya admin
    supabase
      .from('profiles')
      .select('*')
      .eq('role', 'admin')
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        setAdmins(data || [])
        setLoading(false)
      })
  }, [])

  async function ubahRole(u, role) {
    const { error } = await supabase.from('profiles').update({ role }).eq('id', u.id)
    if (!error) setAdmins(admins.map((x) => (x.id === u.id ? { ...x, role } : x)))
  }

  // yang diturunin role nya otomatis ilang dari daftar
  const tampil = admins.filter((u) => u.role === 'admin')

  return (
    <div>
      <p className="text-xs text-kabut">
        Kelola Pengguna / <span className="text-putih">Admin</span>
      </p>
      <h1 className="font-bold text-2xl mt-2">Admin</h1>

      {loading ? (
        <p className="text-kabut text-center py-16">Sebentar ya...</p>
      ) : (
        <div className="mt-6 space-y-3">
          {tampil.map((u) => (
            <div key={u.id} className="bg-panel rounded-(--radius-kartu) p-4 flex items-center gap-4">
              {u.avatar ? (
                <img src={u.avatar} alt={u.name} referrerPolicy="no-referrer" className="w-9 h-9 rounded-full object-cover shrink-0" />
              ) : (
                <span className="w-9 h-9 rounded-full bg-naik text-neon font-semibold flex items-center justify-center shrink-0">
                  {(u.name || 'A')[0].toUpperCase()}
                </span>
              )}
              <p className="flex-1 min-w-0 font-semibold truncate">{u.name}</p>
              {u.id === session?.user.id ? (
                // akun sendiri gak boleh diubah, biar gak ngunci diri sendiri
                <span className="bg-naik text-neon text-xs rounded-full px-3 py-1">{u.role}</span>
              ) : (
                <select
                  value={u.role}
                  onChange={(e) => ubahRole(u, e.target.value)}
                  className="bg-naik text-sm rounded-(--radius-input) px-3 py-2 outline-none focus:ring-2 focus:ring-neon cursor-pointer"
                >
                  <option value="buyer">buyer</option>
                  <option value="seller">toko</option>
                  <option value="admin">admin</option>
                </select>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
