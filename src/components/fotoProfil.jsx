import { useState } from 'react'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'

// bagian foto profil di modal edit: preview + tombol ganti + hapus
// nama dipake buat fallback huruf depan kalau belum ada foto
export default function FotoProfil({ nama }) {
  const { session, profile, setProfile } = useAuth()
  const [proses, setProses] = useState(false)
  const [error, setError] = useState('')

  // upload foto baru ke bucket avatars terus simpen url nya ke profiles
  async function ganti(e) {
    const file = e.target.files[0]
    if (!file) return
    setError('')
    setProses(true)
    const namaFile = session.user.id + '/' + Date.now() + '_' + file.name
    const { error: errUpload } = await supabase.storage.from('avatars').upload(namaFile, file)
    if (errUpload) {
      setProses(false)
      setError(errUpload.message)
      return
    }
    const url = supabase.storage.from('avatars').getPublicUrl(namaFile).data.publicUrl
    const { error: errSimpan } = await supabase.from('profiles').update({ avatar: url }).eq('id', session.user.id)
    setProses(false)
    e.target.value = ''
    if (errSimpan) {
      setError(errSimpan.message)
      return
    }
    setProfile({ ...profile, avatar: url })
  }

  // hapus foto, avatar balik jadi huruf depan
  async function hapus() {
    setError('')
    const { error } = await supabase.from('profiles').update({ avatar: null }).eq('id', session.user.id)
    if (error) {
      setError(error.message)
      return
    }
    setProfile({ ...profile, avatar: null })
  }

  return (
    <div>
      <label className="block text-[13px] font-medium text-kabut mb-2">Foto Profil</label>
      <div className="flex items-center gap-4">
        {profile?.avatar ? (
          <img
            src={profile.avatar}
            alt={nama}
            referrerPolicy="no-referrer"
            className="w-16 h-16 rounded-full object-cover shrink-0"
          />
        ) : (
          <span className="w-16 h-16 rounded-full bg-naik text-neon font-bold text-2xl flex items-center justify-center shrink-0">
            {(nama || 'A')[0].toUpperCase()}
          </span>
        )}
        <div className="flex items-center gap-4">
          {/* label dibikin kayak tombol, input file aslinya disembunyiin */}
          <label className="border border-naik text-putih text-sm font-semibold rounded-full px-4 py-2 hover:border-neon transition duration-200 cursor-pointer">
            {proses ? 'Sebentar ya...' : 'Ganti Foto'}
            <input type="file" accept="image/*" onChange={ganti} disabled={proses} className="hidden" />
          </label>
          {profile?.avatar && (
            <button type="button" onClick={hapus} className="text-merah text-sm font-medium cursor-pointer">
              Hapus Foto
            </button>
          )}
        </div>
      </div>
      {error && <p className="text-merah text-sm mt-2">{error}</p>}
    </div>
  )
}
