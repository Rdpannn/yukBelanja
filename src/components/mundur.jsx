import { useEffect, useState } from 'react'

// hitung mundur jam:menit:detik, dipake countdown flash sale
// habis = dipanggil sekali pas waktunya abis (buat refresh data diskon)
export default function Mundur({ detik, habis }) {
  const [sisa, setSisa] = useState(detik)

  // reset kalau sisa detiknya ganti (misal abis refetch)
  useEffect(() => {
    setSisa(detik)
  }, [detik])

  useEffect(() => {
    if (sisa <= 0) {
      if (habis) habis()
      return
    }
    const t = setTimeout(() => setSisa(sisa - 1), 1000)
    return () => clearTimeout(t)
  }, [sisa])

  const angka = (n) => String(n).padStart(2, '0')
  return (
    <span className="tabular-nums">
      {angka(Math.floor(sisa / 3600))}:{angka(Math.floor((sisa % 3600) / 60))}:{angka(sisa % 60)}
    </span>
  )
}
