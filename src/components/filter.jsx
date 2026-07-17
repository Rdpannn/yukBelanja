import { useState } from 'react'

// tombol corong + panel filter produk: kategori, urutan, rentang harga
// terpakai = filter yang lagi aktif, terapkan = dipanggil pas klik Terapkan / Reset
export default function Filter({ categories, terpakai, terapkan }) {
  const [buka, setBuka] = useState(false)
  // isian panel, baru dipake setelah tombol Terapkan diklik
  const [kategori, setKategori] = useState(terpakai.kategori)
  const [sortir, setSortir] = useState(terpakai.sortir)
  const [min, setMin] = useState(terpakai.min)
  const [maks, setMaks] = useState(terpakai.maks)

  // lagi ada filter aktif = icon corongnya dikasih titik pink
  const aktif = terpakai.kategori || terpakai.min || terpakai.maks || terpakai.sortir !== 'baru'

  function toggle() {
    // pas kebuka, isian panel disamain dulu sama filter yang lagi aktif
    if (!buka) {
      setKategori(terpakai.kategori)
      setSortir(terpakai.sortir)
      setMin(terpakai.min)
      setMaks(terpakai.maks)
    }
    setBuka(!buka)
  }

  function reset() {
    setKategori('')
    setSortir('baru')
    setMin('')
    setMaks('')
    terapkan({ kategori: '', sortir: 'baru', min: '', maks: '' })
    setBuka(false)
  }

  const inputCls =
    'w-full bg-naik rounded-(--radius-input) px-3 py-2 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon'

  return (
    <div className="relative">
      <button
        onClick={toggle}
        title="Filter"
        className="relative bg-naik text-putih hover:text-neon rounded-(--radius-input) p-2.5 transition duration-200 cursor-pointer"
      >
        {/* icon corong */}
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" width={18} height={18}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 0 1-.659 1.591l-5.432 5.432a2.25 2.25 0 0 0-.659 1.591v2.927a2.25 2.25 0 0 1-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 0 0-.659-1.591L3.659 7.409A2.25 2.25 0 0 1 3 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0 1 12 3Z" />
        </svg>
        {aktif && <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-neon rounded-full" />}
      </button>

      {buka && (
        <div className="absolute right-0 top-full mt-2 w-64 bg-panel rounded-(--radius-kartu) p-4 shadow-[0_12px_32px_rgba(0,0,0,0.35)] z-10 space-y-3">
          <div>
            <label className="text-sm font-medium">Kategori</label>
            <select
              value={kategori}
              onChange={(e) => setKategori(e.target.value)}
              className={inputCls + ' mt-1.5 cursor-pointer'}
            >
              <option value="">Semua Kategori</option>
              {categories.map((k) => (
                <option key={k.id} value={k.id}>
                  {k.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Urutkan</label>
            <select
              value={sortir}
              onChange={(e) => setSortir(e.target.value)}
              className={inputCls + ' mt-1.5 cursor-pointer'}
            >
              <option value="baru">Terbaru</option>
              <option value="murah">Harga Terendah</option>
              <option value="mahal">Harga Tertinggi</option>
            </select>
          </div>

          <div>
            <label className="text-sm font-medium">Rentang Harga</label>
            <div className="flex gap-2 mt-1.5">
              <input
                value={min}
                onChange={(e) => setMin(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                placeholder="Min"
                className={inputCls}
              />
              <input
                value={maks}
                onChange={(e) => setMaks(e.target.value.replace(/[^0-9]/g, ''))}
                inputMode="numeric"
                placeholder="Maks"
                className={inputCls}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={() => {
                terapkan({ kategori, sortir, min, maks })
                setBuka(false)
              }}
              className="flex-1 bg-neon hover:bg-neon-terang text-putih text-sm font-semibold rounded-full px-4 py-2 transition duration-200 cursor-pointer"
            >
              Terapkan
            </button>
            <button onClick={reset} className="text-kabut hover:text-putih text-sm cursor-pointer">
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
