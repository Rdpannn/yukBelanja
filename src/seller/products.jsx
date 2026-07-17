import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'

// isian form kosong buat reset
const kosong = { name: '', category_id: '', price: '', stock: '', description: '' }

// tanggal dibikin format indonesia, contoh: 15 Juli 2026
function tanggal(waktu) {
  return new Date(waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function Products() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [tangguh, setTangguh] = useState(null) // produk ditangguhkan yang lagi diliat detailnya
  const [form, setForm] = useState(kosong)
  // foto produk jadi satu list biar urutannya bisa diatur bebas
  // isinya campuran: { url } buat foto lama, { file, preview } buat foto baru
  const [fotos, setFotos] = useState([])
  const [drag, setDrag] = useState(null) // index foto yang lagi ditarik buat digeser
  const fileRef = useRef(null) // input file aslinya disembunyiin, dibuka lewat tombol
  // varian produk (opsional), tiap baris: nama + harga + stok
  // kalau ada isinya, harga & stok global ngikutin varian
  const [varian, setVarian] = useState([])
  const [editId, setEditId] = useState(null) // id produk yang lagi diedit
  const [formBuka, setFormBuka] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => {
    if (!session) return
    // ambil produk milik toko ini, yang udah dihapus gak usah ikut
    supabase
      .from('products')
      .select('*, variants(*)')
      .eq('seller_id', session.user.id)
      .neq('status', 'dihapus')
      .order('created_at', { ascending: false })
      .then(({ data }) => setProducts(data || []))
    // ambil daftar kategori buat dropdown
    supabase
      .from('categories')
      .select('*')
      .order('name')
      .then(({ data }) => setCategories(data || []))
  }, [session])

  // buka form kosong buat nambah
  function bukaTambah() {
    setForm(kosong)
    setFotos([])
    setVarian([])
    setEditId(null)
    setError('')
    setFormBuka(true)
  }

  // buka form keisi data produk yang mau diedit
  function bukaEdit(p) {
    setForm({
      name: p.name,
      category_id: p.category_id || '',
      price: String(p.price),
      stock: p.stock,
      description: p.description || '',
    })
    setFotos((p.images || []).map((url) => ({ url })))
    setVarian(
      [...(p.variants || [])]
        .sort((a, b) => a.id - b.id)
        .map((v) => ({ id: v.id, name: v.name, price: String(v.price), stock: String(v.stock) }))
    )
    setEditId(p.id)
    setError('')
    setFormBuka(true)
  }

  // ganti isian salah satu baris varian
  function ubahVarian(i, isi) {
    setVarian(varian.map((v, x) => (x === i ? { ...v, ...isi } : v)))
  }

  // masukin file yang dipilih / di-drop, dijaga biar totalnya gak lebih dari 5
  function tambahFile(files) {
    const sisa = 5 - fotos.length
    const baru = files
      .filter((f) => f.type.startsWith('image/'))
      .slice(0, sisa)
      .map((f) => ({ file: f, preview: URL.createObjectURL(f) }))
    setFotos([...fotos, ...baru])
  }

  // pindahin foto dari posisi asal ke posisi tujuan (hasil drag)
  function geser(dari, ke) {
    if (dari === null || dari === ke) return
    const urut = [...fotos]
    const [foto] = urut.splice(dari, 1)
    urut.splice(ke, 0, foto)
    setFotos(urut)
  }

  // simpan produk baru / hasil edit
  async function simpan(e) {
    e.preventDefault()
    setError('')
    setLoading(true)

    // susun url foto ngikutin urutan di form, yang baru diupload dulu satu satu
    const urls = []
    for (const foto of fotos) {
      if (foto.url) {
        urls.push(foto.url)
        continue
      }
      const namaFile = session.user.id + '/' + Date.now() + '_' + foto.file.name
      const { error: errUpload } = await supabase.storage.from('products').upload(namaFile, foto.file)
      if (errUpload) {
        setLoading(false)
        setError(errUpload.message)
        return
      }
      urls.push(supabase.storage.from('products').getPublicUrl(namaFile).data.publicUrl)
    }

    // kalau pake varian, harga produk = varian termurah, stok = total stok varian
    const adaVarian = varian.length > 0
    const isi = {
      name: form.name,
      category_id: Number(form.category_id),
      price: adaVarian ? Math.min(...varian.map((v) => Number(v.price))) : Number(form.price),
      stock: adaVarian ? varian.reduce((t, v) => t + Number(v.stock), 0) : Number(form.stock),
      description: form.description,
      images: urls,
      seller_id: session.user.id,
    }

    const { data, error } = editId
      ? await supabase.from('products').update(isi).eq('id', editId).select().single()
      : await supabase.from('products').insert(isi).select().single()

    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }

    // sinkronin varian: yang diilangin dari form dibuang, sisanya diupdate / ditambah
    const idTetap = varian.filter((v) => v.id).map((v) => v.id)
    let buang = supabase.from('variants').delete().eq('product_id', data.id)
    if (idTetap.length > 0) buang = buang.not('id', 'in', '(' + idTetap.join(',') + ')')
    await buang
    for (const v of varian) {
      const isiVarian = { name: v.name, price: Number(v.price), stock: Number(v.stock) }
      if (v.id) {
        await supabase.from('variants').update(isiVarian).eq('id', v.id)
      } else {
        await supabase.from('variants').insert({ ...isiVarian, product_id: data.id })
      }
    }

    // ambil ulang produknya biar varian di daftar ikut kebaru
    const { data: fix } = await supabase
      .from('products')
      .select('*, variants(*)')
      .eq('id', data.id)
      .single()

    // update daftar di layar tanpa fetch ulang semua
    if (editId) {
      setProducts(products.map((p) => (p.id === editId ? fix : p)))
    } else {
      setProducts([fix, ...products])
    }
    setFormBuka(false)
  }

  // hapus produk dari etalase (soft delete, biar riwayat pesanan lama gak bolong)
  async function hapus(id) {
    if (!confirm('Yakin mau hapus produk ini?')) return
    const { error } = await supabase.from('products').update({ status: 'dihapus' }).eq('id', id)
    if (!error) setProducts(products.filter((p) => p.id !== id))
  }

  const inputCls =
    'w-full bg-naik rounded-(--radius-input) px-4 py-3 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon'
  const labelCls = 'block text-[13px] font-medium text-kabut mb-2'

  // teks harga: kalau ada varian dengan harga beda, tampil rentangnya
  function hargaTeks(p) {
    const v = p.variants || []
    if (v.length === 0) return 'Rp' + p.price.toLocaleString('id-ID')
    const min = Math.min(...v.map((x) => x.price))
    const max = Math.max(...v.map((x) => x.price))
    if (min === max) return 'Rp' + min.toLocaleString('id-ID')
    return 'Rp' + min.toLocaleString('id-ID') + ' - Rp' + max.toLocaleString('id-ID')
  }

  return (
    <div>
      <p className="text-xs text-kabut">
        Kelola Produk / <span className="text-putih">Etalase</span>
      </p>
      <div className="flex items-center justify-between gap-4 mt-1">
        <h1 className="font-bold text-2xl">Etalase</h1>
        <button
          onClick={bukaTambah}
          className="bg-neon hover:bg-neon-terang text-putih text-sm font-semibold rounded-full px-6 py-2.5 transition duration-200 cursor-pointer shrink-0"
        >
          + Tambah Produk
        </button>
      </div>

      {/* form tambah / edit */}
      {formBuka && (
        <form onSubmit={simpan} className="bg-panel rounded-(--radius-kartu) p-6 md:p-8 mt-6">
          <h2 className="font-semibold text-lg">{editId ? 'Edit Produk' : 'Tambah Produk'}</h2>

          <div className="mt-5">
            <label className={labelCls}>Nama produk</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              required
              className={inputCls}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
            <div>
              <label className={labelCls}>Kategori</label>
              <select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                required
                className={inputCls}
              >
                <option value="" disabled>
                  Pilih kategori
                </option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            {/* harga & stok global cuma kepake kalau produknya gak punya varian */}
            {varian.length === 0 && (
              <>
                <div>
                  <label className={labelCls}>Harga</label>
                  {/* angkanya disimpen polos, tampilnya dikasih titik ribuan biar gak salah itung nol */}
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-putih">
                      Rp
                    </span>
                    <input
                      type="text"
                      inputMode="numeric"
                      value={form.price ? Number(form.price).toLocaleString('id-ID') : ''}
                      onChange={(e) => setForm({ ...form, price: e.target.value.replace(/\D/g, '') })}
                      required
                      className="w-full bg-naik rounded-(--radius-input) pl-11 pr-4 py-3 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon"
                    />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Stok</label>
                  <input
                    type="number"
                    min="0"
                    value={form.stock}
                    onChange={(e) => setForm({ ...form, stock: e.target.value })}
                    required
                    className={inputCls}
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-4">
            <label className={labelCls}>Varian produk (opsional)</label>
            <p className="text-kabut text-xs mb-3">
              Kalau produkmu ada beberapa pilihan (warna, ukuran, rasa), tambahin di sini. Harga &
              stok bakal ngikutin tiap varian.
            </p>

            {varian.map((v, i) => (
              <div key={v.id || 'baru' + i} className="flex items-center gap-2 mb-2">
                {/* nomor urut variannya */}
                <span className="w-6 shrink-0 text-center text-sm font-medium text-kabut">
                  {i + 1}.
                </span>
                <input
                  type="text"
                  value={v.name}
                  onChange={(e) => ubahVarian(i, { name: e.target.value })}
                  placeholder="Contoh: Merah"
                  required
                  className="flex-1 min-w-0 bg-naik rounded-(--radius-input) px-4 py-3 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon"
                />
                <div className="relative w-48 shrink-0">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-putih">
                    Rp
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={v.price ? Number(v.price).toLocaleString('id-ID') : ''}
                    onChange={(e) => ubahVarian(i, { price: e.target.value.replace(/\D/g, '') })}
                    required
                    className="w-full bg-naik rounded-(--radius-input) pl-11 pr-4 py-3 text-sm outline-none focus:ring-2 focus:ring-neon"
                  />
                </div>
                <input
                  type="number"
                  min="0"
                  value={v.stock}
                  onChange={(e) => ubahVarian(i, { stock: e.target.value })}
                  placeholder="Stok"
                  required
                  className="w-24 shrink-0 bg-naik rounded-(--radius-input) px-4 py-3 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon"
                />
                <button
                  type="button"
                  onClick={() => setVarian(varian.filter((_, x) => x !== i))}
                  className="w-9 h-9 shrink-0 border border-merah text-merah hover:bg-merah hover:text-putih rounded-(--radius-input) flex items-center justify-center transition duration-200 cursor-pointer"
                >
                  −
                </button>
              </div>
            ))}

            <button
              type="button"
              onClick={() => setVarian([...varian, { name: '', price: '', stock: '' }])}
              className="text-neon text-sm font-medium cursor-pointer mt-1"
            >
              + Tambah Varian
            </button>
          </div>

          <div className="mt-4">
            <label className={labelCls}>Deskripsi</label>
            <textarea
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              rows={4}
              className={inputCls}
            />
          </div>

          <div className="mt-4">
            <label className={labelCls}>Foto produk</label>

            {/* input file aslinya disembunyiin, dipanggil dari tombol Pilih File / + */}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={(e) => {
                tambahFile(Array.from(e.target.files))
                e.target.value = ''
              }}
              className="hidden"
            />

            {fotos.length === 0 ? (
              // belum ada foto: box drag & drop
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  tambahFile(Array.from(e.dataTransfer.files))
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
              // udah ada foto: barisan foto, ditarik buat ngatur urutan
              <div className="flex flex-wrap gap-3">
                {fotos.map((foto, i) => (
                  <div
                    key={foto.url || foto.preview}
                    draggable
                    onDragStart={() => setDrag(i)}
                    onDragEnd={() => setDrag(null)}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => {
                      geser(drag, i)
                      setDrag(null)
                    }}
                    className={'relative cursor-grab ' + (drag === i ? 'opacity-40' : '')}
                  >
                    <img
                      src={foto.url || foto.preview}
                      alt=""
                      className="w-20 h-20 object-cover rounded-(--radius-input) pointer-events-none"
                    />
                    {i === 0 && (
                      <span className="absolute bottom-1 left-1 bg-neon text-putih text-[10px] font-semibold px-1.5 py-0.5 rounded-full">
                        Cover
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setFotos(fotos.filter((_, x) => x !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-naik text-putih text-xs rounded-full flex items-center justify-center cursor-pointer hover:bg-neon"
                    >
                      ×
                    </button>
                  </div>
                ))}
                {/* tombol nambah foto lagi, ilang kalau udah 5 */}
                {fotos.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileRef.current.click()}
                    className="w-20 h-20 border-2 border-dashed border-naik rounded-(--radius-input) text-kabut text-2xl hover:border-neon hover:text-neon transition duration-200 cursor-pointer"
                  >
                    +
                  </button>
                )}
              </div>
            )}
            <p className="text-kabut text-xs mt-2">
              Maksimal 5 foto. Foto pertama jadi cover di etalase. Tarik fotonya buat ngatur urutan.
            </p>
          </div>

          {error && <p className="text-neon text-sm mt-4">{error}</p>}

          <div className="flex gap-3 mt-6">
            <button
              type="submit"
              disabled={loading}
              className="bg-neon hover:bg-neon-terang text-putih text-sm font-semibold rounded-full px-7 py-2.5 transition duration-200 cursor-pointer disabled:opacity-60"
            >
              Simpan
            </button>
            <button
              type="button"
              onClick={() => setFormBuka(false)}
              className="text-kabut hover:text-neon text-sm font-medium px-4 cursor-pointer"
            >
              Batal
            </button>
          </div>
        </form>
      )}

      {/* daftar produk */}
      {products.length === 0 && !formBuka ? (
        <p className="text-kabut text-center py-16">Belum ada produk. Yuk pajang barang pertamamu!</p>
      ) : (
        <div className="mt-6 space-y-3">
          {products.map((p) => {
            const kena = p.status === 'ditangguhkan' // produknya lagi ditangguhkan admin
            return (
              <div
                key={p.id}
                onClick={() => kena && setTangguh(p)}
                className={
                  'bg-panel rounded-(--radius-kartu) p-4 flex items-center gap-4 ' +
                  (kena ? 'opacity-60 cursor-pointer' : '')
                }
              >
                {p.images?.[0] ? (
                  <img src={p.images[0]} alt={p.name} className="w-16 h-16 object-cover rounded-(--radius-input)" />
                ) : (
                  <div className="w-16 h-16 bg-naik rounded-(--radius-input)" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold truncate">{p.name}</p>
                    {kena && (
                      <span className="bg-naik text-kuning text-[10px] font-medium rounded-full px-2.5 py-0.5 shrink-0">
                        Ditangguhkan
                      </span>
                    )}
                  </div>
                  <p className="text-neon text-sm font-medium mt-1.5">{hargaTeks(p)}</p>
                  <p className="text-kabut text-xs mt-1.5">Stok: {p.stock}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {/* icon pensil buat edit */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      bukaEdit(p)
                    }}
                    title="Edit produk"
                    className="w-9 h-9 bg-naik text-putih hover:text-neon rounded-(--radius-input) flex items-center justify-center transition duration-200 cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" width={16} height={16}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                    </svg>
                  </button>
                  {/* icon tempat sampah buat hapus */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      hapus(p.id)
                    }}
                    title="Hapus produk"
                    className="w-9 h-9 border border-merah text-merah hover:bg-merah hover:text-putih rounded-(--radius-input) flex items-center justify-center transition duration-200 cursor-pointer"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" width={16} height={16}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                    </svg>
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate('/seller/products/' + p.id)
                    }}
                    className="bg-neon hover:bg-neon-terang text-putih text-xs font-semibold rounded-full px-4 py-1.5 transition duration-200 cursor-pointer"
                  >
                    Lihat Detail
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* modal detail penangguhan, kebuka pas card produk yang kena diklik */}
      {tangguh && (
        <div className="fixed inset-0 bg-dasar/80 flex items-center justify-center px-4 z-20">
          <div className="bg-panel rounded-(--radius-kartu) p-8 md:p-10 w-full max-w-[420px]">
            <div className="flex items-start justify-between">
              <h2 className="font-bold text-2xl">Produk Ditangguhkan</h2>
              <button
                onClick={() => setTangguh(null)}
                className="text-kabut hover:text-putih text-2xl leading-none cursor-pointer"
              >
                &times;
              </button>
            </div>
            <p className="font-semibold mt-4">{tangguh.name}</p>
            {(tangguh.tangguh_sejak || tangguh.tangguh_sampai) && (
              <p className="text-kabut text-sm mt-1">
                {tangguh.tangguh_sejak && 'Sejak ' + tanggal(tangguh.tangguh_sejak)}
                {tangguh.tangguh_sejak && tangguh.tangguh_sampai && ' · '}
                {tangguh.tangguh_sampai && 'Sampe ' + tanggal(tangguh.tangguh_sampai)}
              </p>
            )}
            <div className="bg-naik rounded-(--radius-input) p-4 mt-4 text-sm">
              <p className="text-kabut text-xs">Alasan</p>
              <p className="mt-1">{tangguh.alasan}</p>
            </div>
            <p className="text-kabut text-sm mt-4">
              Selama masa penangguhan, produkmu gak tampil di YukBelanja. Lewat tanggalnya, produk
              aktif lagi otomatis.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
