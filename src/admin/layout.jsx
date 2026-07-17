import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'

// kerangka halaman admin: navbar simpel + menu samping + isi halamannya
export default function Layout() {
  const { session, profile } = useAuth()
  const lokasi = useLocation()
  const [buka, setBuka] = useState(false) // dropdown akun admin
  // grup menu samping yang lagi kebuka, grup halaman aktif langsung kebuka dari awal
  const [grup, setGrup] = useState({
    pengguna:
      lokasi.pathname.startsWith('/admin/users') ||
      lokasi.pathname.startsWith('/admin/toko') ||
      lokasi.pathname.startsWith('/admin/admins'),
    sistem:
      lokasi.pathname.startsWith('/admin/categories') ||
      lokasi.pathname.startsWith('/admin/products') ||
      lokasi.pathname.startsWith('/admin/events') ||
      lokasi.pathname.startsWith('/admin/banners'),
  })

  const nama = profile?.name || 'Admin'

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
      {/* navbar admin, gak pake brand macem macem */}
      <nav className="bg-panel sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <p className="font-bold text-lg">Admin</p>

          {/* akun admin, hover buat munculin menunya */}
          <div
            className="relative"
            onMouseEnter={() => setBuka(true)}
            onMouseLeave={() => setBuka(false)}
          >
            <button
              onClick={() => setBuka(!buka)}
              className="flex items-center gap-3 p-1 sm:pr-3 rounded-full cursor-pointer hover:bg-naik transition duration-200"
            >
              <span className="w-9 h-9 rounded-full bg-naik text-neon font-semibold flex items-center justify-center">
                {nama[0].toUpperCase()}
              </span>
              <span className="hidden sm:block text-sm text-putih">{nama}</span>
            </button>

            {buka && (
              <div className="absolute right-0 top-full pt-3 w-48">
                <div className="bg-naik rounded-(--radius-input) py-2 text-sm shadow-[0_12px_32px_rgba(0,0,0,0.35)]">
                  <div className="px-4 py-2">
                    <p className="font-semibold truncate">{nama}</p>
                    <p className="text-kabut text-xs truncate mt-0.5">{session?.user.email}</p>
                  </div>
                  <div className="h-px bg-panel my-1"></div>
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
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-8 flex flex-col md:flex-row gap-8">
        {/* menu samping: menu utama pake icon, yang punya sub page bisa dibuka tutup */}
        <aside className="md:w-56 shrink-0">
          <nav className="flex flex-col gap-1 text-sm text-kabut">
            <NavLink to="/admin" end className={menuCls}>
              {/* icon rumah */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" width={20} height={20} className="shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
              </svg>
              Overview
            </NavLink>

            {/* grup kelola pengguna */}
            <button onClick={() => setGrup({ ...grup, pengguna: !grup.pengguna })} className={grupCls}>
              {/* icon orang */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" width={20} height={20} className="shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
              </svg>
              <span className="flex-1 text-left">Kelola Pengguna</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={14} height={14} className={'shrink-0 transition duration-200 ' + (grup.pengguna ? 'rotate-180' : '')}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {grup.pengguna && (
              <>
                <NavLink to="/admin/users" className={subCls}>
                  Pengguna
                </NavLink>
                <NavLink to="/admin/toko" className={subCls}>
                  Toko
                </NavLink>
                <NavLink to="/admin/admins" className={subCls}>
                  Admin
                </NavLink>
              </>
            )}

            {/* grup kelola sistem */}
            <button onClick={() => setGrup({ ...grup, sistem: !grup.sistem })} className={grupCls}>
              {/* icon gerigi */}
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" width={20} height={20} className="shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              <span className="flex-1 text-left">Kelola Sistem</span>
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" width={14} height={14} className={'shrink-0 transition duration-200 ' + (grup.sistem ? 'rotate-180' : '')}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {grup.sistem && (
              <>
                <NavLink to="/admin/categories" className={subCls}>
                  Kategori
                </NavLink>
                <NavLink to="/admin/products" className={subCls}>
                  Produk
                </NavLink>
                <NavLink to="/admin/events" className={subCls}>
                  Event
                </NavLink>
                <NavLink to="/admin/banners" className={subCls}>
                  Banner
                </NavLink>
              </>
            )}
          </nav>
        </aside>
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
