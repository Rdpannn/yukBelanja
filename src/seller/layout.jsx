import { useEffect, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'
import IconToko from '../components/iconToko'
import IconKeranjang from '../components/iconKeranjang'
import Notif from '../components/notif'
import Profil from './profil'

// kerangka halaman seller: navbar yukJualan + menu samping + isi halamannya
export default function Layout() {
  const { session, profile, setProfile } = useAuth()
  const lokasi = useLocation()
  const [buka, setBuka] = useState(false) // dropdown identitas toko
  const [editToko, setEditToko] = useState(false) // modal profil toko
  // grup menu samping yang lagi kebuka, grup halaman aktif langsung kebuka dari awal
  const [grup, setGrup] = useState({
    produk:
      lokasi.pathname.startsWith('/seller/products') ||
      lokasi.pathname.startsWith('/seller/event'),
    pesanan:
      lokasi.pathname.startsWith('/seller/orders') ||
      lokasi.pathname.startsWith('/seller/riwayat') ||
      lokasi.pathname.startsWith('/seller/retur'),
  })
  const [badge, setBadge] = useState(0) // jumlah pesanan yang perlu dikonfirmasi
  const [badgeRetur, setBadgeRetur] = useState(0) // permintaan batal + pengajuan pengembalian
  const [hp, setHp] = useState('') // buat modal lengkapi no hp
  const [simpanHp, setSimpanHp] = useState(false)
  const [errorHp, setErrorHp] = useState('')

  useEffect(() => {
    if (!session) return
    // hitung pesanan yang masih nunggu diproses buat badge menu
    function hitung() {
      // yang diminta batal gak dihitung di sini, dia masuk badge pembatalan & retur
      supabase
        .from('orders')
        .select('id, payments!inner(status)', { count: 'exact', head: true })
        .eq('seller_id', session.user.id)
        .eq('payments.status', 'paid')
        .eq('status', 'menunggu')
        .eq('minta_batal', false)
        .then(({ count }) => setBadge(count || 0))
      // permintaan batal + pengajuan pengembalian yang belum dijawab
      const q1 = supabase
        .from('orders')
        .select('id, payments!inner(status)', { count: 'exact', head: true })
        .eq('seller_id', session.user.id)
        .eq('payments.status', 'paid')
        .eq('status', 'menunggu')
        .eq('minta_batal', true)
      const q2 = supabase
        .from('returns')
        .select('id, orders!inner(seller_id)', { count: 'exact', head: true })
        .eq('orders.seller_id', session.user.id)
        .eq('status', 'diajukan')
      Promise.all([q1, q2]).then(([r1, r2]) => setBadgeRetur((r1.count || 0) + (r2.count || 0)))
    }
    hitung()
    // halaman pesanan ngasih tau lewat event ini tiap ada order yang berubah
    window.addEventListener('pesanan', hitung)
    return () => window.removeEventListener('pesanan', hitung)
  }, [session])

  // seller lama / jalur google belum punya no hp, wajib diisi dulu
  async function isiHp(e) {
    e.preventDefault()
    setErrorHp('')
    setSimpanHp(true)
    const { error } = await supabase.from('profiles').update({ phone: hp }).eq('id', session.user.id)
    setSimpanHp(false)
    if (error) {
      setErrorHp(error.message)
      return
    }
    setProfile({ ...profile, phone: hp })
  }

  // style link menu utama, yang aktif jadi pink
  function menuCls({ isActive }) {
    return (
      'flex items-center gap-3 px-4 py-2 rounded-(--radius-input) whitespace-nowrap ' +
      (isActive ? 'text-neon font-medium bg-naik' : 'hover:text-neon')
    )
  }

  // style link sub menu, geser ke kanan biar sejajar sama teks menu utamanya
  function subCls({ isActive }) {
    return (
      'flex items-center pl-12 pr-4 py-2 rounded-(--radius-input) whitespace-nowrap ' +
      (isActive ? 'text-neon font-medium bg-naik' : 'hover:text-neon')
    )
  }

  // tombol grup menu yang punya sub page
  const grupCls =
    'w-full flex items-center gap-3 px-4 py-2 rounded-(--radius-input) whitespace-nowrap hover:text-neon cursor-pointer'

  return (
    <div>
      {/* navbar yukJualan, strukturnya samain kayak yukBelanja */}
      <nav className="bg-panel sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          {/* logo */}
          <Link to="/seller" className="flex items-center gap-2 font-bold text-lg">
            <span className="text-neon">
              <IconToko ukuran={26} />
            </span>
            <span>
              Yuk<span className="text-neon">Jualan</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Notif />

            {/* divider vertikal misahin icon sama grup akun */}
            <span className="h-6 w-px bg-naik"></span>

            {/* grup belanja + identitas toko */}
            <div className="flex items-center gap-5">
              {/* tombol balik ke toko pembeli */}
              <Link
                to="/"
                className="bg-neon hover:bg-neon-terang text-putih text-sm font-semibold rounded-full px-4 py-2 flex items-center gap-2 transition duration-200"
              >
                <IconKeranjang ukuran={16} />
                YukBelanja
              </Link>

              {/* avatar + nama toko jadi satu tombol, hover buat munculin menunya */}
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
                      alt={profile?.store}
                      referrerPolicy="no-referrer"
                      className="w-9 h-9 rounded-full object-cover"
                    />
                  ) : (
                    <span className="w-9 h-9 rounded-full bg-naik text-neon font-semibold flex items-center justify-center">
                      {(profile?.store || 'T')[0].toUpperCase()}
                    </span>
                  )}
                  <span className="hidden sm:block text-sm text-putih">{profile?.store}</span>
                </button>

                {/* pt-3 biar mouse gak keputus pas turun dari tombol ke menu */}
                {buka && (
                  <div className="absolute right-0 top-full pt-3 w-48">
                    <div className="bg-naik rounded-(--radius-input) py-2 text-sm shadow-[0_12px_32px_rgba(0,0,0,0.35)]">
                      <div className="px-4 py-2">
                        <p className="font-semibold truncate">{profile?.store}</p>
                        <p className="text-kabut text-xs truncate mt-0.5">{session?.user.email}</p>
                      </div>
                      <div className="h-px bg-panel my-1"></div>
                      <button
                        onClick={() => {
                          setBuka(false)
                          setEditToko(true)
                        }}
                        className="block w-full text-left px-4 py-2 text-kabut hover:text-neon cursor-pointer"
                      >
                        Profil Toko
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
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        {/* menu samping: menu utama pake icon, yang punya sub page bisa dibuka tutup */}
        <aside className="md:w-56 shrink-0">
          <nav className="flex flex-col gap-1 text-sm text-kabut">
            <NavLink to="/seller" end className={menuCls}>
              {/* icon rumah */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" width={20} height={20} className="shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              Overview
            </NavLink>

            {/* grup kelola produk */}
            <button onClick={() => setGrup({ ...grup, produk: !grup.produk })} className={grupCls}>
              {/* icon kotak */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" width={20} height={20} className="shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
              </svg>
              <span className="flex-1 text-left">Kelola Produk</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={14} height={14} className={'shrink-0 transition duration-200 ' + (grup.produk ? 'rotate-180' : '')}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {grup.produk && (
              <>
                <NavLink to="/seller/products" className={subCls}>
                  Etalase
                </NavLink>
                <NavLink to="/seller/event" className={subCls}>
                  Event Produk
                </NavLink>
              </>
            )}

            {/* grup kelola pesanan */}
            <button onClick={() => setGrup({ ...grup, pesanan: !grup.pesanan })} className={grupCls}>
              {/* icon nota */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" width={20} height={20} className="shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
              </svg>
              <span className="flex-1 text-left">Kelola Pesanan</span>
              {/* titik penanda ada pesanan baru, angkanya baru muncul pas grupnya dibuka */}
              {(badge > 0 || badgeRetur > 0) && !grup.pesanan && <span className="w-2 h-2 rounded-full bg-neon shrink-0"></span>}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={14} height={14} className={'shrink-0 transition duration-200 ' + (grup.pesanan ? 'rotate-180' : '')}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {grup.pesanan && (
              <>
                <NavLink to="/seller/orders" className={subCls}>
                  Pesanan Masuk
                  {badge > 0 && (
                    <span className="ml-auto bg-neon text-putih text-[10px] font-semibold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                      {badge}
                    </span>
                  )}
                </NavLink>
                <NavLink to="/seller/retur" className={subCls}>
                  Pembatalan & Retur
                  {badgeRetur > 0 && (
                    <span className="ml-auto bg-neon text-putih text-[10px] font-semibold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
                      {badgeRetur}
                    </span>
                  )}
                </NavLink>
                <NavLink to="/seller/riwayat" className={subCls}>
                  Riwayat Pesanan
                </NavLink>
              </>
            )}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>

      {/* modal edit profil toko */}
      {editToko && <Profil tutup={() => setEditToko(false)} />}

      {/* modal wajib isi no hp, gak bisa ditutup sebelum keisi */}
      {profile && !profile.phone && (
        <div className="fixed inset-0 bg-dasar/80 flex items-center justify-center px-4 z-20">
          <form onSubmit={isiHp} className="bg-panel rounded-(--radius-kartu) p-8 md:p-10 w-full max-w-[420px]">
            <h2 className="font-bold text-2xl text-center">Satu langkah lagi</h2>
            <p className="text-kabut mt-2 text-sm text-center">
              Tokomu butuh nomor HP biar pembeli bisa hubungin kamu lewat WhatsApp.
            </p>
            <label className="block text-[13px] font-medium text-kabut mb-2 mt-6">No. HP</label>
            <input
              type="text"
              value={hp}
              onChange={(e) => setHp(e.target.value.replace(/[^0-9]/g, ''))}
              inputMode="numeric"
              placeholder="Contoh: 081234567890"
              required
              className="w-full bg-naik rounded-(--radius-input) px-4 py-3 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon"
            />
            {errorHp && <p className="text-merah text-sm mt-3">{errorHp}</p>}
            <button
              type="submit"
              disabled={simpanHp}
              className="w-full bg-neon hover:bg-neon-terang text-putih font-semibold rounded-full px-7 py-3 mt-5 transition duration-200 cursor-pointer disabled:opacity-60"
            >
              {simpanHp ? 'Sebentar ya...' : 'Simpan'}
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
