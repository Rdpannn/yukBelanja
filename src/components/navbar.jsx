import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'
import IconToko from './iconToko'
import IconKeranjang from './iconKeranjang'
import Profil from './profil'
import Notif from './notif'

export default function Navbar() {
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const [jumlah, setJumlah] = useState(0) // jumlah barang di keranjang buat badge
  const [buka, setBuka] = useState(false) // dropdown menu user
  const [bukaProfil, setBukaProfil] = useState(false) // modal edit profil
  const [cari, setCari] = useState('')

  // submit pencarian, lempar ke halaman hasil cari
  function submitCari(e) {
    e.preventDefault()
    if (!cari.trim()) return
    navigate('/cari?q=' + encodeURIComponent(cari))
  }

  useEffect(() => {
    if (!session) {
      setJumlah(0)
      return
    }
    // hitung isi keranjang buat badge
    function hitung() {
      supabase
        .from('cart_items')
        .select('qty')
        .eq('user_id', session.user.id)
        .then(({ data }) => {
          const total = (data || []).reduce((t, item) => t + item.qty, 0)
          setJumlah(total)
        })
    }
    hitung()
    // halaman lain ngirim event "cart" tiap isi keranjang berubah
    window.addEventListener('cart', hitung)
    return () => window.removeEventListener('cart', hitung)
  }, [session])

  // nama depan user buat sapaan
  const nama = profile?.name?.split(' ')[0]

  return (
    <nav className="bg-panel sticky top-0 z-10">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* logo */}
        <Link to="/" className="flex items-center gap-2 font-bold text-lg">
          <span className="text-neon">
            <IconKeranjang ukuran={26} />
          </span>
          <span>
            Yuk<span className="text-neon">Belanja</span>
          </span>
        </Link>

        {/* search bar ngisi tengah navbar */}
        <form onSubmit={submitCari} className="flex-1 mx-4 md:mx-8">
          <div className="relative">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={16} height={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-kabut">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
            </svg>
            <input
              type="text"
              value={cari}
              onChange={(e) => setCari(e.target.value)}
              placeholder="Mau cari apa hari ini?"
              className="w-full bg-naik rounded-(--radius-input) pl-11 pr-4 py-2.5 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon"
            />
          </div>
        </form>

        <div className="flex items-center gap-4">
          {session ? (
            <>
              {/* bagian icon-icon: keranjang + badge jumlah */}
              <Link to="/cart" className="relative text-kabut hover:text-neon p-1">
                <IconKeranjang ukuran={22} />
                {jumlah > 0 && (
                  <span className="absolute -top-1 -right-1 bg-neon text-putih text-[10px] font-semibold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                    {jumlah}
                  </span>
                )}
              </Link>

              <Notif />

              {/* divider vertikal misahin icon sama grup akun */}
              <span className="h-6 w-px bg-naik"></span>

              {/* grup jualan + akun */}
              <div className="flex items-center gap-5">
                {/* tombol ke dashboard jualan, kalau belum seller diarahin buka toko */}
                <Link
                  to={profile?.role === 'seller' ? '/seller' : '/toko'}
                  className="bg-neon hover:bg-neon-terang text-putih text-sm font-semibold rounded-full px-4 py-2 flex items-center gap-2 transition duration-200"
                >
                  <IconToko ukuran={16} />
                  YukJualan
                </Link>

                {/* avatar + sapaan jadi satu tombol, hover buat munculin menunya */}
                <div
                  className="relative"
                  onMouseEnter={() => setBuka(true)}
                  onMouseLeave={() => setBuka(false)}
                >
                  <button
                    onClick={() => setBuka(!buka)}
                    className="flex items-center gap-3 p-1 sm:pr-3 rounded-full cursor-pointer hover:bg-naik transition duration-200"
                  >
                    {profile?.avatar ? (
                      <img
                        src={profile.avatar}
                        alt={nama}
                        referrerPolicy="no-referrer"
                        className="w-9 h-9 rounded-full object-cover"
                      />
                    ) : (
                      <span className="w-9 h-9 rounded-full bg-naik text-neon font-semibold flex items-center justify-center">
                        {(nama || 'A')[0].toUpperCase()}
                      </span>
                    )}
                    {/* sapaan di kanan avatar, di hp disembunyiin */}
                    <span className="hidden sm:block text-sm text-putih">Hai, {nama || 'kamu'}</span>
                  </button>

                  {/* pt-3 biar mouse gak keputus pas turun dari tombol ke menu */}
                  {buka && (
                    <div className="absolute right-0 top-full pt-3 w-44">
                      <div className="bg-naik rounded-(--radius-input) py-2 text-sm shadow-[0_12px_32px_rgba(0,0,0,0.35)]">
                        <div className="px-4 py-2">
                          <p className="font-semibold truncate">{nama || 'Akun'}</p>
                          <p className="text-kabut text-xs truncate mt-0.5">{session.user.email}</p>
                        </div>
                        <div className="h-px bg-panel my-1"></div>
                        <Link to="/orders" onClick={() => setBuka(false)} className="block px-4 py-2 hover:text-neon">
                          Pesanan Saya
                        </Link>
                        <button
                          onClick={() => {
                            setBuka(false)
                            setBukaProfil(true)
                          }}
                          className="block w-full text-left px-4 py-2 hover:text-neon cursor-pointer"
                        >
                          Edit Profil
                        </button>
                        <button
                          onClick={() => {
                            setBuka(false)
                            supabase.auth.signOut()
                          }}
                          className="block w-full text-left px-4 py-2 text-kabut hover:text-neon cursor-pointer"
                        >
                          Keluar
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              <Link to="/login" className="text-kabut hover:text-neon text-sm font-medium">
                Masuk
              </Link>
              <Link to="/register" className="bg-neon hover:bg-neon-terang text-putih text-sm font-semibold rounded-full px-6 py-2 transition duration-200">
                Daftar
              </Link>
            </>
          )}
        </div>
      </div>

      {/* modal edit profil */}
      {bukaProfil && <Profil tutup={() => setBukaProfil(false)} />}
    </nav>
  )
}
