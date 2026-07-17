// tombol nomor halaman di bawah grid produk
export default function Pagination({ halaman, total, ganti }) {
  // gak usah tampil kalau halamannya cuma satu
  if (total <= 1) return null

  const nomor = []
  for (let i = 1; i <= total; i++) nomor.push(i)

  const btn =
    'w-9 h-9 rounded-(--radius-input) text-sm flex items-center justify-center transition duration-200 cursor-pointer'
  const mati = ' bg-naik text-kabut hover:text-putih disabled:opacity-40 disabled:hover:text-kabut disabled:cursor-default'

  return (
    <div className="flex justify-center gap-2 mt-10">
      <button onClick={() => ganti(halaman - 1)} disabled={halaman === 1} className={btn + mati}>
        ‹
      </button>
      {nomor.map((n) => (
        <button
          key={n}
          onClick={() => ganti(n)}
          className={btn + (n === halaman ? ' bg-neon text-putih font-semibold' : ' bg-naik text-kabut hover:text-putih')}
        >
          {n}
        </button>
      ))}
      <button onClick={() => ganti(halaman + 1)} disabled={halaman === total} className={btn + mati}>
        ›
      </button>
    </div>
  )
}
