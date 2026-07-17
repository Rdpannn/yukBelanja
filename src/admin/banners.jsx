import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'

const labelCls = 'block text-sm text-kabut mb-2'
const inputCls =
  'w-full bg-naik rounded-(--radius-input) px-4 py-3 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon'

export default function Banners() {
  const { session } = useAuth()
  const [banners, setBanners] = useState([])
  const [bukaForm, setBukaForm] = useState(false)
  const [editId, setEditId] = useState(null) // id banner yang lagi diedit
  const [form, setForm] = useState({ judul: '', link: '', urutan: '', aktif: true })
  const [foto, setFoto] = useState(null) // { url } dari db atau { file, preview } upload baru
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const fileRef = useRef()

  useEffect(() => {
    // ambil semua banner, diurutin sesuai urutan tampilnya
    supabase
      .from('banners')
      .select('*')
      .order('urutan')
      .order('created_at')
      .then(({ data }) => setBanners(data || []))
  }, [])

  // buka form kosong buat nambah banner
  function tambah() {
    setEditId(null)
    setForm({ judul: '', link: '', urutan: String(banners.length + 1), aktif: true })
    setFoto(null)
    setError('')
    setBukaForm(true)
  }

  // buka form keisi data banner yang mau diedit
  function edit(b) {
    setEditId(b.id)
    setForm({ judul: b.judul, link: b.link || '', urutan: String(b.urutan), aktif: b.aktif })
    setFoto({ url: b.image })
    setError('')
    setBukaForm(true)
  }

  function pilihFile(file) {
    if (!file) return
    setFoto({ file, preview: URL.createObjectURL(file) })
  }

  // simpan banner baru / hasil edit
  async function simpan(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // upload gambarnya dulu kalau gambarnya baru
    let url = foto.url
    if (!url) {
      const namaFile = session.user.id + '/' + Date.now() + '_' + foto.file.name
      const { error: errUpload } = await supabase.storage.from('banners').upload(namaFile, foto.file)
      if (errUpload) {
        setLoading(false)
        setError(errUpload.message)
        return
      }
      url = supabase.storage.from('banners').getPublicUrl(namaFile).data.publicUrl
    }

    const isi = {
      image: url,
      judul: form.judul,
      link: form.link || null,
      urutan: Number(form.urutan) || 0,
      aktif: form.aktif,
    }

    const { data, error } = editId
      ? await supabase.from('banners').update(isi).eq('id', editId).select().single()
      : await supabase.from('banners').insert(isi).select().single()

    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }

    const baru = editId ? banners.map((b) => (b.id === editId ? data : b)) : [...banners, data]
    setBanners(baru.sort((a, b) => a.urutan - b.urutan))
    setBukaForm(false)
  }

  async function hapus(id) {
    if (!confirm('Yakin mau hapus banner ini?')) return
    const { error } = await supabase.from('banners').delete().eq('id', id)
    if (!error) setBanners(banners.filter((b) => b.id !== id))
  }

  return (
    <div>
      <p className="text-xs text-kabut">
        Kelola Sistem / <span className="text-putih">Banner</span>
      </p>
      <div className="flex items-center justify-between mt-2">
        <h1 className="font-bold text-2xl">Banner</h1>
        {!bukaForm && (
          <button
            onClick={tambah}
            className="bg-neon hover:bg-neon-terang text-putih text-sm font-semibold rounded-full px-5 py-2.5 transition duration-200 cursor-pointer"
          >
            + Tambah Banner
          </button>
        )}
      </div>

      {/* form tambah / edit */}
      {bukaForm && (
        <form onSubmit={simpan} className="bg-panel rounded-(--radius-kartu) p-6 mt-6">
          <div>
            <label className={labelCls}>Gambar Banner</label>

            {/* input file aslinya disembunyiin, dipanggil dari tombol Pilih File */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={(e) => {
                pilihFile(e.target.files[0])
                e.target.value = ''
              }}
              className="hidden"
            />

            {!foto ? (
              // belum ada gambar: box drag & drop
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  pilihFile(e.dataTransfer.files[0])
                }}
                className="border-2 border-dashed border-naik rounded-(--radius-input) py-8 flex flex-col items-center gap-1 text-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={32} height={32} className="text-kabut">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
                </svg>
                <p className="text-sm text-kabut mt-2">Tarik fotomu ke sini</p>
                <p className="text-xs text-kabut">atau</p>
                <button
                  type="button"
                  onClick={() => fileRef.current.click()}
                  className="bg-naik hover:bg-neon text-putih text-sm font-medium rounded-full px-5 py-2 mt-2 transition duration-200 cursor-pointer"
                >
                  Pilih File
                </button>
              </div>
            ) : (
              // udah ada gambar: preview + tombol hapus
              <div className="relative inline-block">
                <img
                  src={foto.url || foto.preview}
                  alt=""
                  className="w-full max-w-md aspect-[3/1] object-cover rounded-(--radius-input)"
                />
                <button
                  type="button"
                  onClick={() => setFoto(null)}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-naik text-putih text-xs rounded-full flex items-center justify-center cursor-pointer hover:bg-neon"
                >
                  ×
                </button>
              </div>
            )}
            <p className="text-kabut text-xs mt-2">Pakai gambar landscape biar gak kepotong di layar lebar.</p>
          </div>

          <div className="mt-4">
            <label className={labelCls}>Judul Banner</label>
            <input
              type="text"
              value={form.judul}
              onChange={(e) => setForm({ ...form, judul: e.target.value })}
              required
              className={inputCls}
            />
          </div>

          <div className="mt-4">
            <label className={labelCls}>Link Tujuan</label>
            <input
              type="text"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              className={inputCls}
            />
            <p className="text-kabut text-xs mt-2">
              Contoh: https://contoh.com/promo. Linknya kebuka di tab baru. Kosongin kalau banner gak perlu bisa diklik.
            </p>
          </div>

          <div className="mt-4 flex items-end gap-6">
            <div className="w-28">
              <label className={labelCls}>Urutan</label>
              <input
                type="number"
                min="0"
                value={form.urutan}
                onChange={(e) => setForm({ ...form, urutan: e.target.value })}
                required
                className={inputCls}
              />
            </div>
            <label className="flex items-center gap-2 pb-3 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={form.aktif}
                onChange={(e) => setForm({ ...form, aktif: e.target.checked })}
                className="w-4 h-4 accent-(--color-neon) cursor-pointer"
              />
              Aktif
            </label>
          </div>

          {error && <p className="text-neon text-sm mt-4">{error}</p>}

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={loading || !foto}
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

      {/* daftar banner */}
      {banners.length === 0 && !bukaForm ? (
        <p className="text-kabut text-center py-16">Belum ada banner. Tambahin dulu yuk.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {banners.map((b) => (
            <div key={b.id} className="bg-panel rounded-(--radius-kartu) p-4 flex items-center gap-4">
              <img
                src={b.image}
                alt={b.judul}
                className={'w-36 aspect-[3/1] object-cover rounded-(--radius-input) shrink-0 ' + (b.aktif ? '' : 'opacity-40')}
              />
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">{b.judul}</p>
                <p className="text-kabut text-xs truncate mt-0.5">{b.link || '—'}</p>
              </div>
              <span className={'text-xs font-medium shrink-0 ' + (b.aktif ? 'text-ijo' : 'text-kabut')}>
                {b.aktif ? 'Aktif' : 'Nonaktif'}
              </span>
              <button
                onClick={() => edit(b)}
                className="bg-neon hover:bg-neon-terang text-putih text-xs font-semibold rounded-full px-4 py-1.5 transition duration-200 cursor-pointer shrink-0"
              >
                Edit
              </button>
              <button
                onClick={() => hapus(b.id)}
                className="border border-merah text-merah hover:bg-merah hover:text-putih text-xs font-medium rounded-full px-4 py-1.5 transition duration-200 cursor-pointer shrink-0"
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
