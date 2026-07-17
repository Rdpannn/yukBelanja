import { useNavigate } from 'react-router-dom'
import Telpon from './telpon'

// box info toko: avatar + nama, badannya bisa diklik buat mampir ke tokonya
// gelap = versi bg hitam + garis tipis (dipake di detail produk), default nya abu
export default function TokoBox({ id, nama, avatar, hp, gelap }) {
  const navigate = useNavigate()

  return (
    <div
      onClick={() => navigate('/toko/' + id)}
      className={
        'rounded-(--radius-input) p-4 text-sm flex items-center gap-3 cursor-pointer transition duration-200 ' +
        (gelap
          ? 'bg-dasar border border-putih/10 hover:border-putih/30'
          : 'bg-naik hover:ring-1 hover:ring-putih/20')
      }
    >
      {/* avatar toko, kalau gak ada fotonya pake huruf depan nama toko */}
      {avatar ? (
        <img src={avatar} alt={nama} referrerPolicy="no-referrer" className="w-10 h-10 rounded-full object-cover shrink-0" />
      ) : (
        <span className="w-10 h-10 rounded-full bg-panel text-neon font-semibold flex items-center justify-center shrink-0">
          {(nama || 'T')[0].toUpperCase()}
        </span>
      )}

      <div className="min-w-0">
        <p className="text-kabut text-xs">Toko</p>
        <p className="font-semibold mt-0.5 truncate">{nama}</p>
      </div>

      {/* tombol telpon jangan ikut kebawa navigasi pas diklik */}
      {hp && (
        <span className="ml-auto shrink-0" onClick={(e) => e.stopPropagation()}>
          <Telpon hp={hp} judul="Hubungi Toko" />
        </span>
      )}
    </div>
  )
}
