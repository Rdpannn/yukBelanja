import { useEffect, useState } from 'react'
import supabase from '../lib/supabase'

// carousel banner di home, isinya dikelola admin
export default function Banner() {
  const [banners, setBanners] = useState([])
  const [loading, setLoading] = useState(true)
  const [posisi, setPosisi] = useState(0) // slide yang lagi tampil
  const [diam, setDiam] = useState(false) // true pas kursor di atas banner, geser otomatisnya berhenti

  useEffect(() => {
    // ambil banner yang aktif aja
    supabase
      .from('banners')
      .select('*')
      .eq('aktif', true)
      .order('urutan')
      .then(({ data }) => {
        setBanners(data || [])
        setLoading(false)
      })
  }, [])

  // maju mundur slide, muter balik ke awal / akhir
  function geser(arah) {
    setPosisi((p) => (p + arah + banners.length) % banners.length)
  }

  // geser otomatis tiap 5 detik
  useEffect(() => {
    if (diam || banners.length < 2) return
    const timer = setInterval(() => setPosisi((p) => (p + 1) % banners.length), 5000)
    return () => clearInterval(timer)
  }, [diam, banners])

  if (loading) return null

  // belum ada banner aktif, pake hero lama sebagai cadangan
  if (banners.length === 0) {
    return (
      <section className="text-center py-16 md:py-24">
        <h1 className="font-bold text-[clamp(28px,4vw,40px)] leading-tight">
          Yuk, cari yang kamu suka.
        </h1>
        <p className="text-kabut mt-4 max-w-md mx-auto">
          Produk pilihan dari toko lokal, siap dianter ke kamu.
        </p>
        <a
          href="#produk"
          className="inline-block bg-neon hover:bg-neon-terang text-putih font-semibold rounded-full px-7 py-3 mt-8 transition duration-200"
        >
          Lihat Produk
        </a>
      </section>
    )
  }

  return (
    <section className="pt-8 pb-10">
      <div
        onMouseEnter={() => setDiam(true)}
        onMouseLeave={() => setDiam(false)}
        className="relative overflow-hidden rounded-(--radius-kartu)"
      >
        {/* barisan slide, digeser pake translate */}
        <div
          className="flex transition-transform duration-500"
          style={{ transform: `translateX(-${posisi * 100}%)` }}
        >
          {banners.map((b) => (
            <div
              key={b.id}
              onClick={() => b.link && window.open(b.link, '_blank')}
              className={'relative w-full shrink-0 aspect-[5/2] md:aspect-[3/1] ' + (b.link ? 'cursor-pointer' : '')}
            >
              <img src={b.image} alt={b.judul} className="w-full h-full object-cover" />
              {/* gradasi tipis di bawah biar judulnya kebaca */}
              <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-black/60 to-transparent"></div>
              <p className="absolute bottom-4 left-5 right-5 font-bold text-lg md:text-2xl">{b.judul}</p>
            </div>
          ))}
        </div>

        {/* tombol panah kiri kanan */}
        {banners.length > 1 && (
          <>
            <button
              onClick={() => geser(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-putih flex items-center justify-center transition duration-200 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={18} height={18}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button
              onClick={() => geser(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/40 hover:bg-black/60 text-putih flex items-center justify-center transition duration-200 cursor-pointer"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={18} height={18}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </>
        )}

        {/* titik penunjuk slide, klik buat lompat */}
        {banners.length > 1 && (
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {banners.map((_, i) => (
              <button
                key={i}
                onClick={() => setPosisi(i)}
                className={
                  'h-2 rounded-full transition-all duration-200 cursor-pointer ' +
                  (i === posisi ? 'w-4 bg-putih' : 'w-2 bg-putih/40')
                }
              ></button>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
