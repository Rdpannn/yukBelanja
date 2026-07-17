import { useState } from 'react'

// nomor pesanan + tombol salin ke clipboard, dipake di pesanan buyer & seller
export default function Salin({ id }) {
  const [udah, setUdah] = useState(false)

  // salin nomornya, icon berubah centang bentar sebagai tanda berhasil
  function salin() {
    navigator.clipboard.writeText(String(id))
    setUdah(true)
    setTimeout(() => setUdah(false), 1500)
  }

  return (
    <span className="flex items-center gap-1.5">
      <span className="text-sm">{id}</span>
      <button
        onClick={salin}
        title="Salin nomor pesanan"
        className="text-kabut hover:text-putih transition duration-200 cursor-pointer"
      >
        {udah ? (
          // centang, tanda udah kesalin
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        ) : (
          // icon copy
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <rect x="9" y="9" width="13" height="13" rx="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
        )}
      </button>
    </span>
  )
}
