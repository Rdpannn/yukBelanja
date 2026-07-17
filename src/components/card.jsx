import { Link } from 'react-router-dom'
import { potongHarga } from '../lib/diskon'

// teks harga: kalau ada varian dengan harga beda, tampil rentangnya
// diskon keisi = harganya dipotong dulu
function hargaTeks(p, diskon = 0) {
  const v = p.variants || []
  if (v.length === 0) return 'Rp' + potongHarga(p.price, diskon).toLocaleString('id-ID')
  const min = potongHarga(Math.min(...v.map((x) => x.price)), diskon)
  const max = potongHarga(Math.max(...v.map((x) => x.price)), diskon)
  if (min === max) return 'Rp' + min.toLocaleString('id-ID')
  return 'Rp' + min.toLocaleString('id-ID') + ' - Rp' + max.toLocaleString('id-ID')
}

// kartu produk buat di grid home
export default function Card({ product, diskon }) {
  // harga coret produk bervarian ditaruh di bawah (rentang kepanjangan kalau sejajar)
  const adaVarian = (product.variants || []).length > 0

  return (
    <Link
      to={'/detail/' + product.id}
      className="block bg-panel rounded-(--radius-kartu) overflow-hidden transition duration-200 ease-out hover:-translate-y-1 hover:shadow-[0_12px_32px_rgba(0,0,0,0.35)]"
    >
      {product.images?.[0] ? (
        <img src={product.images[0]} alt={product.name} className="w-full aspect-square object-cover" />
      ) : (
        <div className="w-full aspect-square bg-naik" />
      )}
      <div className="p-5">
        <p className="font-semibold truncate">{product.name}</p>
        <div className="flex items-center flex-wrap gap-x-2 gap-y-1 mt-1">
          <p className="text-neon font-semibold text-sm">{hargaTeks(product, diskon || 0)}</p>
          {/* badge nempel di kanan harga diskonnya, baru harga coret */}
          {diskon > 0 && (
            <span className="bg-naik text-neon text-[11px] font-semibold rounded-full px-2 py-0.5 shrink-0">
              -{diskon}%
            </span>
          )}
          {diskon > 0 && !adaVarian && (
            <p className="text-kabut text-xs line-through">{hargaTeks(product)}</p>
          )}
          {product.stock < 1 && (
            <span className="bg-naik text-kabut text-xs rounded-full px-3 py-1 ml-auto">Habis</span>
          )}
        </div>
        {diskon > 0 && adaVarian && (
          <p className="text-kabut text-xs line-through mt-0.5">{hargaTeks(product)}</p>
        )}
        {/* nama toko + jumlah kejual */}
        <p className="text-putih font-medium text-xs mt-2 truncate">{product.profiles?.store}</p>
        <p className="text-kabut text-xs mt-0.5">{product.sold || 0} terjual</p>
      </div>
    </Link>
  )
}
