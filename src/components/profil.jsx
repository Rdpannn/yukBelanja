import { useEffect, useState } from 'react'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'
import FotoProfil from './fotoProfil'

// modal edit profil: kolom kiri nama akun, kolom kanan kelola alamat tersimpen
export default function Profil({ tutup }) {
  const { session, profile, setProfile } = useAuth()
  const [nama, setNama] = useState(profile?.name || '')
  const [sukses, setSukses] = useState(false)
  const [simpanNama, setSimpanNama] = useState(false)
  const [alamatList, setAlamatList] = useState([])
  // form alamat: null berarti lagi nampilin list, ada isinya berarti lagi tambah / edit
  const [form, setForm] = useState(null)
  const [proses, setProses] = useState(false)
  const [error, setError] = useState('')

  // ambil daftar alamat user
  useEffect(() => {
    supabase
      .from('addresses')
      .select('*')
      .eq('user_id', session.user.id)
      .order('id')
      .then(({ data }) => setAlamatList(data || []))
  }, [session])

  // simpan nama akun
  async function simpan() {
    setError('')
    setSukses(false)
    if (!nama.trim()) return
    setSimpanNama(true)
    const { error } = await supabase.from('profiles').update({ name: nama }).eq('id', session.user.id)
    setSimpanNama(false)
    if (error) {
      setError(error.message)
      return
    }
    setProfile({ ...profile, name: nama })
    setSukses(true)
  }

  // simpan alamat, bisa alamat baru atau hasil edit
  async function simpanAlamat(e) {
    e.preventDefault()
    setError('')
    setProses(true)
    const isi = { receiver: form.receiver, phone: form.phone, address: form.address }
    const { data, error } = form.id
      ? await supabase.from('addresses').update(isi).eq('id', form.id).select().single()
      : await supabase.from('addresses').insert({ ...isi, user_id: session.user.id }).select().single()
    setProses(false)
    if (error) {
      setError(error.message)
      return
    }
    if (form.id) setAlamatList(alamatList.map((a) => (a.id === data.id ? data : a)))
    else setAlamatList([...alamatList, data])
    setForm(null)
  }

  async function hapus(id) {
    if (!confirm('Yakin mau hapus alamat ini?')) return
    const { error } = await supabase.from('addresses').delete().eq('id', id)
    if (error) {
      setError(error.message)
      return
    }
    setAlamatList(alamatList.filter((a) => a.id !== id))
  }

  const inputCls =
    'w-full bg-naik rounded-(--radius-input) px-4 py-3 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon'
  const labelCls = 'block text-[13px] font-medium text-kabut mb-2'

  return (
    <div className="fixed inset-0 bg-dasar/80 flex items-center justify-center px-4 z-20">
      <div className="bg-panel rounded-(--radius-kartu) p-8 md:p-10 w-full max-w-[760px] max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <h2 className="font-bold text-2xl">Edit Profil</h2>
          <button onClick={tutup} className="text-kabut hover:text-putih text-2xl leading-none cursor-pointer">
            &times;
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mt-6">
          {/* kolom kiri: data akun */}
          <div>
            <FotoProfil nama={profile?.name} />
            <label className={labelCls + ' mt-4'}>Nama</label>
            <input type="text" value={nama} onChange={(e) => setNama(e.target.value)} className={inputCls} />
            <label className={labelCls + ' mt-4'}>Email</label>
            <input type="text" value={session.user.email} disabled className={inputCls + ' opacity-60'} />
            <p className="text-kabut text-xs mt-2">Email gak bisa diganti ya.</p>
            {sukses && <p className="text-neon text-sm mt-3">Perubahan udah disimpen.</p>}
            {error && <p className="text-merah text-sm mt-3">{error}</p>}
          </div>

          {/* kolom kanan: alamat tersimpen */}
          <div>
            <p className="text-[13px] font-medium text-kabut mb-2">Alamat Kamu</p>
            {form ? (
              // form tambah / edit alamat, gantiin list nya
              <form onSubmit={simpanAlamat}>
                <label className={labelCls}>Nama Penerima</label>
                <input
                  value={form.receiver}
                  onChange={(e) => setForm({ ...form, receiver: e.target.value })}
                  required
                  className={inputCls}
                />
                <label className={labelCls + ' mt-4'}>Nomor HP</label>
                <input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/[^0-9]/g, '') })}
                  inputMode="numeric"
                  placeholder="Contoh: 081234567890"
                  required
                  className={inputCls}
                />
                <label className={labelCls + ' mt-4'}>Alamat</label>
                <textarea
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  rows={3}
                  placeholder="Tulis alamat lengkapmu ya (jalan, nomor rumah, kecamatan, kota)"
                  required
                  className={inputCls + ' resize-none'}
                />
                <div className="flex gap-3 mt-4">
                  <button
                    type="submit"
                    disabled={proses}
                    className="flex-1 bg-neon hover:bg-neon-terang text-putih text-sm font-semibold rounded-full px-5 py-2.5 transition duration-200 cursor-pointer disabled:opacity-60"
                  >
                    {proses ? 'Sebentar ya...' : 'Simpan Alamat'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setForm(null)}
                    className="flex-1 border border-naik text-putih text-sm font-semibold rounded-full px-5 py-2.5 hover:border-neon transition duration-200 cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              </form>
            ) : (
              <div>
                {alamatList.length === 0 ? (
                  <p className="text-kabut text-sm">Belum ada alamat tersimpen. Tambahin dulu yuk.</p>
                ) : (
                  <div className="space-y-3">
                    {alamatList.map((a) => (
                      <div key={a.id} className="bg-naik rounded-(--radius-input) p-4">
                        <p className="font-semibold text-sm">{a.receiver}</p>
                        <p className="text-kabut text-sm mt-0.5">{a.phone}</p>
                        <p className="text-kabut text-sm mt-0.5">{a.address}</p>
                        <div className="flex gap-4 mt-2 text-sm">
                          <button
                            onClick={() =>
                              setForm({ id: a.id, receiver: a.receiver, phone: a.phone, address: a.address })
                            }
                            className="text-neon font-medium cursor-pointer"
                          >
                            Ubah
                          </button>
                          <button onClick={() => hapus(a.id)} className="text-merah font-medium cursor-pointer">
                            Hapus
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setForm({ receiver: profile?.name || '', phone: '', address: '' })}
                  className="w-full border border-naik text-putih text-sm font-semibold rounded-full px-5 py-2.5 mt-4 hover:border-neon transition duration-200 cursor-pointer"
                >
                  + Tambah Alamat
                </button>
              </div>
            )}
          </div>
        </div>

        {/* tombol simpan di kanan bawah, nutupnya lewat tombol x di atas */}
        <div className="flex justify-end mt-8">
          <button
            onClick={simpan}
            disabled={simpanNama}
            className="bg-neon hover:bg-neon-terang text-putih font-semibold rounded-full px-7 py-2.5 transition duration-200 cursor-pointer disabled:opacity-60"
          >
            {simpanNama ? 'Sebentar ya...' : 'Simpan'}
          </button>
        </div>
      </div>
    </div>
  )
}
