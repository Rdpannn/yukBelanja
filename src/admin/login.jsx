import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'

export default function Login() {
  const { session, profile, loading: cekSession } = useAuth()
  const [email, setEmail] = useState('')
  const [pw, setPw] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // masih ngecek session, tunggu dulu
  if (cekSession) return null

  // udah login sebagai admin, langsung ke dashboard
  // yang login sebagai akun lain tetep boleh liat form, login admin bakal nimpa session nya
  if (session && profile?.role === 'admin') return <Navigate to="/admin" replace />

  // login admin pake email + password
  async function masuk(e) {
    e.preventDefault()
    setError('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: pw })
    setLoading(false)
    // kalau sukses, redirect di atas yang kerja
    if (error) setError('Email atau password-nya salah nih, coba cek lagi.')
  }

  const inputCls =
    'w-full bg-naik rounded-(--radius-input) px-4 py-3 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon'
  const labelCls = 'block text-left text-[13px] font-medium text-kabut mb-2'

  return (
    <div className="flex justify-center px-4 pt-16 md:pt-24">
      <div className="bg-panel rounded-(--radius-kartu) p-8 md:p-10 w-full max-w-[420px] text-center">
        <h1 className="font-bold text-2xl">Area Admin</h1>
        <p className="text-kabut mt-2">Khusus pengelola YukBelanja.</p>

        <form onSubmit={masuk} className="mt-8 text-left">
          <label className={labelCls}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
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
      </div>
    </div>
  )
}
