import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'
import Google from '../components/google'

export default function Login() {
  const { session, profile, loading: cekSession } = useAuth()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // masih ngecek session, jangan render dulu
  if (cekSession) return null

  // udah login: seller langsung ke dashboard, yang belum ditawarin buka toko
  if (session) {
    return profile?.role === 'seller' ? <Navigate to="/seller" replace /> : <Navigate to="/toko" replace />
  }

  // login pake email + password
  async function masuk(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    setLoading(false)
    // kalau sukses, session keisi dan redirect di atas yang kerja
    if (error) setError('Email atau password-nya salah nih, coba cek lagi.')
  }

  // login google, abis itu balik ke halaman ini biar role nya dicek
  function masukGoogle() {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin + '/seller/login' },
    })
  }

  const inputCls =
    'w-full bg-naik rounded-(--radius-input) px-4 py-3 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon'
  const labelCls = 'block text-left text-[13px] font-medium text-kabut mb-2'

  return (
    <div className="flex justify-center px-4 pt-16 md:pt-24">
      <div className="bg-panel rounded-(--radius-kartu) p-8 md:p-10 w-full max-w-[420px] text-center">
        <h1 className="font-bold text-2xl">Masuk ke tokomu</h1>
        <p className="text-kabut mt-2">Kelola produk dan pesanan dari satu tempat.</p>

        <form onSubmit={masuk} className="mt-8 text-left">
          <label className={labelCls}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="kamu@email.com"
            required
            className={inputCls}
          />
          <label className={labelCls + ' mt-4'}>Password</label>
          <input
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            required
            className={inputCls}
          />
          {error && <p className="text-neon text-sm mt-3">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neon hover:bg-neon-terang text-putih font-semibold rounded-full px-7 py-3 mt-5 transition duration-200 cursor-pointer disabled:opacity-60"
          >
            Masuk
          </button>
        </form>

        {/* pemisah */}
        <div className="flex items-center gap-3 my-5 text-kabut text-sm">
          <span className="h-px bg-naik flex-1"></span>
          atau
          <span className="h-px bg-naik flex-1"></span>
        </div>

        <button
          onClick={masukGoogle}
          className="w-full border border-naik text-putih font-semibold rounded-full px-7 py-3 flex items-center justify-center gap-3 hover:border-neon transition duration-200 cursor-pointer"
        >
          <Google />
          Masuk dengan Google
        </button>

        <p className="text-kabut text-sm mt-6">
          Belum punya toko?{' '}
          <Link to="/seller/register" className="text-neon font-medium">
            Daftar dulu
          </Link>
        </p>
        <p className="text-kabut text-sm mt-2">
          Cuma mau belanja?{' '}
          <Link to="/login" className="text-neon font-medium">
            Masuk di sini
          </Link>
        </p>
      </div>
    </div>
  )
}
