import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'

// format waktu notif, contoh: 16 Jul, 14.30
function waktu(t) {
  const d = new Date(t)
  return (
    d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' }) +
    ', ' +
    d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })
  )
}

// lonceng notifikasi di navbar: badge belum dibaca + dropdown 5 terbaru + modal lihat semua
export default function Notif() {
  const { session } = useAuth()
  const navigate = useNavigate()
  const [buka, setBuka] = useState(false) // dropdown
  const [modal, setModal] = useState(false) // modal lihat semua
  const [list, setList] = useState([]) // 5 terbaru buat dropdown
  const [semua, setSemua] = useState([]) // isi modal
  const [belum, setBelum] = useState(0) // jumlah belum dibaca

  // ambil notif terbaru + hitung yang belum dibaca
  function ambil() {
    supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('id', { ascending: false })
      .limit(5)
      .then(({ data }) => setList(data || []))
    supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', session.user.id)
      .eq('dibaca', false)
      .then(({ count }) => setBelum(count || 0))
  }

  useEffect(() => {
    if (!session) return
    ambil()
    // dicek ulang tiap menit, soalnya notifnya dateng dari user lain
    const timer = setInterval(ambil, 60000)
    return () => clearInterval(timer)
  }, [session])

  if (!session) return null

  // buka tutup dropdown, pas dibuka sekalian refresh
  function toggle() {
    if (!buka) ambil()
    setBuka(!buka)
  }

  async function bukaSemua() {
    setBuka(false)
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('id', { ascending: false })
      .limit(100)
    setSemua(data || [])
    setModal(true)
  }

  // klik notif: tandain kebaca terus lompat ke halamannya
  function klik(n) {
    if (!n.dibaca) {
      supabase.from('notifications').update({ dibaca: true }).eq('id', n.id).then(ambil)
    }
    setBuka(false)
    setModal(false)
    if (n.link) navigate(n.link)
  }

  async function bacaSemua() {
    await supabase
      .from('notifications')
      .update({ dibaca: true })
      .eq('user_id', session.user.id)
      .eq('dibaca', false)
    setSemua(semua.map((n) => ({ ...n, dibaca: true })))
    ambil()
  }

  // hapus satu notif, e distop biar kliknya gak ikut kebuka halaman notifnya
  async function hapusNotif(n, e) {
    e.stopPropagation()
    await supabase.from('notifications').delete().eq('id', n.id)
    setSemua((lama) => lama.filter((x) => x.id !== n.id))
    // dropdown 5 terbaru + badge diitung ulang dari db
    ambil()
  }

  // bersihin semua notif sekaligus
  async function hapusSemua() {
    if (!confirm('Yakin mau hapus semua notifikasi?')) return
    await supabase.from('notifications').delete().eq('user_id', session.user.id)
    setSemua([])
    setList([])
    setBelum(0)
  }

  // satu baris notif, dipake di dropdown & modal
  // pake div (bukan button) karena di dalemnya ada tombol hapus sendiri
  function baris(n) {
    return (
      <div
        key={n.id}
        onClick={() => klik(n)}
        className="w-full flex gap-3 px-4 py-3 text-left hover:bg-dasar/40 cursor-pointer"
      >
        {/* dot pink penanda belum dibaca */}
        <span className={'w-2 h-2 rounded-full mt-1.5 shrink-0 ' + (n.dibaca ? 'bg-transparent' : 'bg-neon')}></span>
        <span className="flex-1 min-w-0">
          <span className="block text-sm font-medium">{n.judul}</span>
          <span className="block text-xs text-kabut mt-0.5">{n.isi}</span>
          <span className="block text-[11px] text-kabut mt-1">{waktu(n.created_at)}</span>
        </span>
        <button
          onClick={(e) => hapusNotif(n, e)}
          title="Hapus notifikasi"
          className="self-start text-kabut hover:text-merah text-base leading-none cursor-pointer shrink-0"
        >
          &times;
        </button>
      </div>
    )
  }

  return (
    <div className="relative">
      <button onClick={toggle} className="relative text-kabut hover:text-neon p-1 cursor-pointer">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" width={22} height={22}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 0 0 5.454-1.31A8.967 8.967 0 0 1 18 9.75V9A6 6 0 0 0 6 9v.75a8.967 8.967 0 0 1-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 0 1-5.714 0m5.714 0a3 3 0 1 1-5.714 0" />
        </svg>
        {belum > 0 && (
          <span className="absolute -top-1 -right-1 bg-neon text-putih text-[10px] font-semibold rounded-full min-w-4 h-4 px-1 flex items-center justify-center">
            {belum}
          </span>
        )}
      </button>

      {/* dropdown notif terbaru */}
      {buka && (
        <div className="absolute right-0 mt-3 w-80 bg-naik rounded-(--radius-input) py-2 text-sm shadow-[0_12px_32px_rgba(0,0,0,0.35)]">
          <p className="px-4 py-2 font-semibold">Notifikasi</p>
          {list.length === 0 ? (
            <p className="py-6 text-kabut text-center">Belum ada notifikasi.</p>
          ) : (
            <>
              <div>{list.map(baris)}</div>
              <div className="h-px bg-panel my-1"></div>
              <button
                onClick={bukaSemua}
                className="block w-full text-center px-4 py-2 text-neon font-medium cursor-pointer"
              >
                Lihat Semua
              </button>
            </>
          )}
        </div>
      )}

      {/* modal lihat semua notif */}
      {modal && (
        <div className="fixed inset-0 bg-dasar/80 flex items-center justify-center px-4 z-20">
          <div className="bg-panel rounded-(--radius-kartu) p-8 w-full max-w-[480px]">
            <div className="flex items-start justify-between">
              <h2 className="font-bold text-2xl">Notifikasi</h2>
              <button onClick={() => setModal(false)} className="text-kabut hover:text-putih text-2xl leading-none cursor-pointer">
                &times;
              </button>
            </div>
            {semua.length === 0 ? (
              <p className="text-kabut text-sm text-center py-10">Belum ada notifikasi buat kamu.</p>
            ) : (
              <>
                <div className="flex justify-end gap-4 mt-2">
                  <button onClick={hapusSemua} className="text-merah text-sm font-medium cursor-pointer">
                    Hapus Semua
                  </button>
                  <button onClick={bacaSemua} className="text-neon text-sm font-medium cursor-pointer">
                    Tandai Semua Dibaca
                  </button>
                </div>
                <div className="mt-2 -mx-4 max-h-[55vh] overflow-y-auto">{semua.map(baris)}</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
