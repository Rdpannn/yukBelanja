import { Link } from 'react-router-dom'
import IconToko from '../components/iconToko'
import IconKeranjang from '../components/iconKeranjang'

// navbar yukJualan versi belum login, dipake di halaman login & register seller
export default function Nav() {
  return (
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

        {/* tombol balik ke toko pembeli */}
        <Link
          to="/"
          className="bg-neon hover:bg-neon-terang text-putih text-sm font-semibold rounded-full px-4 py-2 flex items-center gap-2 transition duration-200"
        >
          <IconKeranjang ukuran={16} />
          YukBelanja
        </Link>
      </div>
    </nav>
  )
}
