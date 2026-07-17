import { useEffect, useState } from 'react'
import supabase from '../lib/supabase'

export default function Categories() {
  const [categories, setCategories] = useState([])
  const [nama, setNama] = useState('')
  const [editId, setEditId] = useState(null) // id kategori yang lagi diedit
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    // ambil semua kategori
    supabase
      .from('categories')
      .select('*')
      .order('name')
      .then(({ data }) => setCategories(data || []))
  }, [])

  // simpan kategori baru / hasil edit
  async function simpan(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error } = editId
      ? await supabase.from('categories').update({ name: nama }).eq('id', editId).select().single()
      : await supabase.from('categories').insert({ name: nama }).select().single()

    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }

    if (editId) {
      setCategories(categories.map((c) => (c.id === editId ? data : c)))
    } else {
      setCategories([...categories, data].sort((a, b) => a.name.localeCompare(b.name)))
    }
    setNama('')
    setEditId(null)
  }

  async function hapus(id) {
    if (!confirm('Yakin mau hapus kategori ini? Produknya gak ikut kehapus, cuma jadi tanpa kategori.')) return
    const { error } = await supabase.from('categories').delete().eq('id', id)
    if (!error) setCategories(categories.filter((c) => c.id !== id))
  }

  return (
    <div>
      <p className="text-xs text-kabut">
        Kelola Sistem / <span className="text-putih">Kategori</span>
      </p>
      <h1 className="font-bold text-2xl mt-2">Kategori</h1>

      {/* form tambah / edit */}
      <form onSubmit={simpan} className="flex gap-3 mt-6">
        <input
          type="text"
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder={editId ? 'Nama baru kategorinya' : 'Nama kategori baru'}
          required
          className="flex-1 bg-naik rounded-(--radius-input) px-4 py-3 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-neon hover:bg-neon-terang text-putih text-sm font-semibold rounded-full px-6 py-2.5 transition duration-200 cursor-pointer disabled:opacity-60 shrink-0"
        >
          {editId ? 'Simpan' : '+ Tambah'}
        </button>
        {editId && (
          <button
            type="button"
            onClick={() => {
              setEditId(null)
              setNama('')
            }}
            className="text-kabut hover:text-neon text-sm font-medium px-2 cursor-pointer shrink-0"
          >
            Batal
          </button>
        )}
      </form>
      {error && <p className="text-neon text-sm mt-3">{error}</p>}

      {/* daftar kategori */}
      <div className="mt-6 space-y-3">
        {categories.map((c) => (
          <div key={c.id} className="bg-panel rounded-(--radius-kartu) p-4 flex items-center gap-4">
            <p className="font-semibold flex-1 truncate">{c.name}</p>
            <button
              onClick={() => {
                setEditId(c.id)
                setNama(c.name)
              }}
              className="bg-neon hover:bg-neon-terang text-putih text-xs font-semibold rounded-full px-4 py-1.5 transition duration-200 cursor-pointer"
            >
              Edit
            </button>
            <button
              onClick={() => hapus(c.id)}
              className="border border-merah text-merah hover:bg-merah hover:text-putih text-xs font-medium rounded-full px-4 py-1.5 transition duration-200 cursor-pointer"
            >
              Hapus
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
