import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/auth'
import supabase from '../lib/supabase'

// modal pilih alamat pengiriman terus lanjut bayar pake popup midtrans
// dipake di halaman keranjang sama tombol beli di detail produk
// pesanan isinya { items: [id cart] } atau { produk: { product_id, variant_id, qty } }
export default function Bayar({ pesanan, total, jumlah, tutup }) {
  const { session, profile } = useAuth()
  const navigate = useNavigate()
  const [alamatList, setAlamatList] = useState(null) // null berarti masih ngambil
  const [pilih, setPilih] = useState(null) // id alamat kepilih, 'baru' berarti isi form
  // form alamat baru, nama penerima diisi duluan dari nama akun
  const [nama, setNama] = useState(profile?.name || '')
  const [hp, setHp] = useState('')
  const [alamat, setAlamat] = useState('')
  const [proses, setProses] = useState(false)
  const [error, setError] = useState('')

  // pasang script snap midtrans buat popup pembayarannya
  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://app.sandbox.midtrans.com/snap/snap.js'
    script.setAttribute('data-client-key', import.meta.env.VITE_MIDTRANS_CLIENT_KEY)
    document.body.appendChild(script)
    return () => document.body.removeChild(script)
  }, [])

  // ambil alamat tersimpen, yang pertama langsung kepilih
  useEffect(() => {
    supabase
      .from('addresses')
      .select('*')
      .eq('user_id', session.user.id)
      .order('id')
      .then(({ data }) => {
        setAlamatList(data || [])
        setPilih(data?.length ? data[0].id : 'baru')
      })
  }, [session])

  // kirim ke edge function buat bikin order + snap token, terus buka popup midtrans
  async function bayar() {
    setProses(true)
    setError('')

    // ambil isi alamatnya sesuai pilihan
    let isi = { nama, hp, alamat }
    if (pilih !== 'baru') {
      const a = alamatList.find((x) => x.id === pilih)
      isi = { nama: a.receiver, hp: a.phone, alamat: a.address }
    } else {
      // alamat baru disimpen sekalian biar kepake lagi nanti
      await supabase.from('addresses').insert({ user_id: session.user.id, receiver: nama, phone: hp, address: alamat })
    }

    const { data, error: err } = await supabase.functions.invoke('pay', {
      body: { ...pesanan, ...isi },
    })
    if (err || !data?.token) {
      setError('Waduh, ada masalah pas mau bayar. Coba lagi ya.')
      setProses(false)
      return
    }
    // kalau belinya dari keranjang, itemnya udah dikosongin edge function
    window.dispatchEvent(new Event('cart'))
    tutup()

    // abis popup nya ketutup, cek status ke midtrans terus pindah ke pesanan
    async function selesai(sukses) {
      await supabase.functions.invoke('pay', {
        body: { aksi: 'cek', payment_id: data.payment_id },
      })
      navigate('/orders', { state: sukses ? { sukses: true } : undefined })
    }

    window.snap.pay(data.token, {
      onSuccess: () => selesai(true),
      onPending: () => selesai(false),
      onClose: () => selesai(false),
    })
  }

  // form baru wajib keisi semua kalau pilihannya alamat baru
  const belumLengkap = pilih === 'baru' && (!nama.trim() || !hp.trim() || !alamat.trim())

  const inputCls =
    'w-full bg-naik rounded-(--radius-input) px-4 py-3 text-sm placeholder:text-kabut outline-none focus:ring-2 focus:ring-neon mt-1.5'

  return (
    <div className="fixed inset-0 bg-dasar/80 flex items-center justify-center px-4 z-20">
      <div className="bg-panel rounded-(--radius-kartu) p-8 md:p-10 w-full max-w-[420px] max-h-[85vh] overflow-y-auto">
        <div className="flex items-start justify-between">
          <h2 className="font-bold text-2xl">Lengkapi Pesananmu</h2>
          <button
            onClick={tutup}
            className="text-kabut hover:text-putih text-2xl leading-none cursor-pointer"
          >
            &times;
          </button>
        </div>

        <p className="text-sm font-medium mt-6">Alamat Pengiriman</p>

        {alamatList === null ? (
          <p className="text-kabut text-sm mt-3">Sebentar ya...</p>
        ) : (
          <div className="space-y-3 mt-3">
            {/* daftar alamat tersimpen, tinggal klik buat milih */}
            {alamatList.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => setPilih(a.id)}
                className={
                  'w-full text-left bg-naik rounded-(--radius-input) p-4 cursor-pointer transition duration-200 ' +
                  (pilih === a.id ? 'ring-2 ring-neon' : 'hover:ring-2 hover:ring-kabut/40')
                }
              >
                <p className="font-semibold text-sm">{a.receiver}</p>
                <p className="text-kabut text-sm mt-0.5">{a.phone}</p>
                <p className="text-kabut text-sm mt-0.5">{a.address}</p>
              </button>
            ))}

            {/* pilihan pake alamat baru, formnya muncul di bawah */}
            {alamatList.length > 0 && (
              <button
                type="button"
                onClick={() => setPilih('baru')}
                className={
                  'w-full border border-naik text-sm font-semibold rounded-(--radius-input) px-4 py-3 cursor-pointer transition duration-200 ' +
                  (pilih === 'baru' ? 'border-neon text-neon' : 'text-putih hover:border-neon')
                }
              >
                + Kirim ke alamat baru
              </button>
            )}

            {pilih === 'baru' && (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Nama Penerima</label>
                  <input value={nama} onChange={(e) => setNama(e.target.value)} className={inputCls} />
                </div>
                <div>
                  <label className="text-sm font-medium">Nomor HP</label>
                  <input
                    value={hp}
                    onChange={(e) => setHp(e.target.value.replace(/[^0-9]/g, ''))}
                    inputMode="numeric"
                    placeholder="Contoh: 081234567890"
                    className={inputCls}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Alamat</label>
                  <textarea
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    rows={3}
                    placeholder="Tulis alamat lengkapmu ya (jalan, nomor rumah, kecamatan, kota)"
                    className={inputCls + ' resize-none'}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between mt-6 text-sm">
          <span className="text-kabut">Total ({jumlah} barang)</span>
          <span className="text-neon font-bold text-xl">Rp{total.toLocaleString('id-ID')}</span>
        </div>
        {error && <p className="text-merah text-sm mt-3">{error}</p>}
        <button
          onClick={bayar}
          disabled={proses || alamatList === null || belumLengkap}
          className="w-full bg-neon hover:bg-neon-terang text-putih font-semibold rounded-full px-7 py-3 mt-4 transition duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {proses ? 'Sebentar ya...' : 'Bayar Sekarang'}
        </button>
      </div>
    </div>
  )
}
