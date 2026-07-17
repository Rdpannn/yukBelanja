import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'
import Google from '../components/google'

// icon amplop buat modal nunggu verifikasi
function IconAmplop() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width={32} height={32}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
    </svg>
  )
}

export default function Register() {
  const { session, setProfile } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  // step 1 = form email, step 2 = modal nunggu verifikasi, step 3 = set nama & password
  // kalau baliknya dari link email (?lanjut=1), langsung ke step 3
  const [step, setStep] = useState(params.get('lanjut') ? 3 : 1)
  const [email, setEmail] = useState('')
  const [nama, setNama] = useState('')
  const [pw, setPw] = useState('')
  const [pw2, setPw2] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [detik, setDetik] = useState(0) // hitung mundur buat kirim ulang link

  // jalanin hitung mundurnya tiap detik
  useEffect(() => {
    if (detik <= 0) return
    const timer = setTimeout(() => setDetik(detik - 1), 1000)
    return () => clearTimeout(timer)
  }, [detik])

  // begitu verifikasi di tab email berhasil, session nyebar ke tab ini
  // langsung geser ke step set profil
  useEffect(() => {
    if (session && step === 2) setStep(3)
  }, [session, step])

  // udah login dari awal, gak perlu daftar lagi
  if (session && step === 1) return <Navigate to="/" replace />

  // daftar sama aja login pake google, akunnya kebuat otomatis
  function daftarGoogle() {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.origin },
    })
  }

  // kirim link verifikasi ke email user
  async function kirimLink(e) {
    e.preventDefault()
    setError('')
    if (!/\S+@\S+\.\S+/.test(email)) {
      setError('Format emailnya belum bener nih.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/register?lanjut=1' },
    })
    setLoading(false)
    if (error) {
      setError(error.message)
      return
    }
    setStep(2)
    setDetik(60)
  }

  async function kirimUlang() {
    setError('')
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin + '/register?lanjut=1' },
    })
    if (error) {
      setError(error.message)
      return
    }
    setDetik(60)
  }

  // simpan nama + password, terus selesai
  async function simpanProfil(e) {
    e.preventDefault()
    setError('')
    // cek kriteria: minimal 8 karakter, ada huruf sama angkanya
    if (pw.length < 8 || !/[a-zA-Z]/.test(pw) || !/[0-9]/.test(pw)) {
      setError('Passwordnya minimal 8 karakter dan wajib ada huruf sama angkanya ya.')
      return
    }
    if (pw !== pw2) {
      setError('Passwordnya belum sama nih, cek lagi.')
      return
    }
    setLoading(true)
    const { data, error } = await supabase.auth.updateUser({ password: pw })
    if (error) {
      setLoading(false)
      setError(error.message)
      return
    }
    // ganti nama profil (defaultnya keisi email dari trigger)
    await supabase.from('profiles').update({ name: nama }).eq('id', data.user.id)
    setProfile((p) => (p ? { ...p, name: nama } : p))
    navigate('/')
  }

  const inputCls =
    'w-full bg-naik rounded-(--radius-input) px-4 py-3 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon'
  const labelCls = 'block text-left text-[13px] font-medium text-kabut mb-2'

  return (
    <div className="flex justify-center px-4 pt-16 md:pt-24">
      <div className="bg-panel rounded-(--radius-kartu) p-8 md:p-10 w-full max-w-[420px] text-center">
        <h1 className="font-bold text-2xl">Gabung yuk!</h1>
        <p className="text-kabut mt-2">Sekali daftar, langsung bisa belanja.</p>

        <form onSubmit={kirimLink} className="mt-8 text-left">
          <label className={labelCls}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="kamu@email.com"
            className={inputCls}
          />
          {error && step === 1 && <p className="text-neon text-sm mt-3">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-neon hover:bg-neon-terang text-putih font-semibold rounded-full px-7 py-3 mt-5 transition duration-200 cursor-pointer disabled:opacity-60"
          >
            Daftar
          </button>
        </form>

        {/* pemisah */}
        <div className="flex items-center gap-3 my-5 text-kabut text-sm">
          <span className="h-px bg-naik flex-1"></span>
          atau
          <span className="h-px bg-naik flex-1"></span>
        </div>

        <button
          onClick={daftarGoogle}
          className="w-full border border-naik text-putih font-semibold rounded-full px-7 py-3 flex items-center justify-center gap-3 hover:border-neon transition duration-200 cursor-pointer"
        >
          <Google />
          Daftar dengan Google
        </button>

        <p className="text-kabut text-sm mt-6">
          Udah punya akun?{' '}
          <Link to="/login" className="text-neon font-medium">
            Masuk
          </Link>
        </p>
        <p className="text-kabut text-sm mt-2">
          Mau jualan?{' '}
          <Link to="/seller/login" className="text-neon font-medium">
            Masuk ke tokomu
          </Link>
        </p>
      </div>

      {/* modal nunggu verifikasi + set profil */}
      {step > 1 && (
        <div className="fixed inset-0 bg-dasar/80 flex items-center justify-center px-4 z-20">
          <div className="bg-panel rounded-(--radius-kartu) p-8 md:p-10 w-full max-w-[420px] text-center">
            {step === 2 ? (
              <div>
                <h2 className="font-bold text-2xl">Cek email kamu</h2>

                {/* animasi nungguin user klik link di emailnya */}
                <div className="relative w-20 h-20 mx-auto mt-8">
                  <span className="absolute inset-0 rounded-full bg-neon/20 animate-ping"></span>
                  <div className="relative w-20 h-20 rounded-full bg-naik text-neon flex items-center justify-center">
                    <IconAmplop />
                  </div>
                </div>
                <p className="text-kabut text-sm mt-6 animate-pulse">Nungguin verifikasi dari kamu...</p>

                <p className="text-kabut text-sm mt-4">
                  Link verifikasi udah dikirim ke <span className="text-putih">{email}</span>. Tinggal
                  buka emailnya terus klik link-nya. Kalau gak nongol, coba intip folder spam ya.
                </p>
                {error && <p className="text-neon text-sm mt-3">{error}</p>}
                <p className="text-kabut text-sm mt-4">
                  Belum dapet?{' '}
                  {detik > 0 ? (
                    <span>Kirim ulang dalam {detik} dtk</span>
                  ) : (
                    <button type="button" onClick={kirimUlang} className="text-neon font-medium cursor-pointer">
                      Kirim ulang link
                    </button>
                  )}
                </p>
              </div>
            ) : (
              <form onSubmit={simpanProfil} className="text-left">
                <h2 className="font-bold text-2xl text-center">Dikit lagi nih</h2>
                <p className="text-kabut mt-2 text-sm text-center">
                  Atur nama sama password buat akun kamu.
                </p>
                <label className={labelCls + ' mt-6'}>Nama</label>
                <input
                  type="text"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Nama kamu"
                  required
                  className={inputCls}
                />
                <label className={labelCls + ' mt-4'}>Password</label>
                <input
                  type="password"
                  value={pw}
                  onChange={(e) => setPw(e.target.value)}
                  className={inputCls}
                />
                <p className="text-kabut text-xs mt-2">Minimal 8 karakter, ada huruf dan angkanya.</p>
                <label className={labelCls + ' mt-4'}>Ulangi password</label>
                <input
                  type="password"
                  value={pw2}
                  onChange={(e) => setPw2(e.target.value)}
                  className={inputCls}
                />
                {error && <p className="text-neon text-sm mt-3">{error}</p>}
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-neon hover:bg-neon-terang text-putih font-semibold rounded-full px-7 py-3 mt-6 transition duration-200 cursor-pointer disabled:opacity-60"
                >
                  Simpan & Mulai Belanja
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
