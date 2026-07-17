import Salin from '../components/salin'
import Telpon from '../components/telpon'

// label + warna chip per status order
const statusInfo = {
  menunggu: { label: 'Menunggu Konfirmasi', warna: 'text-kabut' },
  dikirim: { label: 'Dikirim', warna: 'text-kuning' },
  sampai: { label: 'Sampai', warna: 'text-biru' },
  selesai: { label: 'Selesai', warna: 'text-ijo' },
  batal: { label: 'Dibatalkan', warna: 'text-merah' },
}

// tanggal dibikin format indonesia, contoh: 15 Juli 2026
function tanggal(waktu) {
  return new Date(waktu).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

// kartu 1 pesanan buat halaman seller, tombol aksinya dioper lewat children
// props retur keisi di halaman pembatalan & retur buat nampilin alasan + buktinya
export default function Kartu({ order, retur, children }) {
  return (
    <div className="bg-panel rounded-(--radius-kartu) p-5">
      {/* baris atas: nomor + tanggal di kiri, chip status di kanan */}
      <div className="flex items-center justify-between gap-4">
        <div>
          {/* nomor pesanan bisa disalin sekali klik */}
          <Salin id={order.kode} />
          <p className="text-kabut text-xs mt-0.5">{tanggal(order.created_at)}</p>
        </div>
        <span className={'bg-naik text-xs rounded-full px-3 py-1 shrink-0 ' + statusInfo[order.status].warna}>
          {statusInfo[order.status].label}
        </span>
      </div>

      {/* banner kalau pembeli minta batal */}
      {order.status === 'menunggu' && order.minta_batal && (
        <div className="bg-naik text-merah text-sm font-medium rounded-(--radius-input) px-4 py-3 mt-4">
          Pembeli minta pesanan ini dibatalin.
        </div>
      )}

      {/* alamat tujuan pengiriman + tombol hubungi penerima lewat wa */}
      <div className="bg-naik rounded-(--radius-input) p-4 mt-4 text-sm flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {/* avatar akun pembelinya, kalau gak ada fotonya pake huruf depan penerima */}
          {order.buyer?.avatar ? (
            <img
              src={order.buyer.avatar}
              alt={order.receiver}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover shrink-0"
            />
          ) : (
            <span className="w-10 h-10 rounded-full bg-panel text-neon font-semibold flex items-center justify-center shrink-0">
              {(order.receiver || 'P')[0].toUpperCase()}
            </span>
          )}
          <div>
            <p className="text-kabut text-xs">Penerima</p>
            <p className="font-semibold mt-1">
              {order.receiver} <span className="text-kabut font-normal">— {order.phone}</span>
            </p>
            <p className="text-kabut mt-0.5">{order.address}</p>
          </div>
        </div>
        <Telpon hp={order.phone} judul="Hubungi Penerima" />
      </div>

      {/* info pengirim yang diisi pas kirim, biar seller bisa ngontak kurirnya juga */}
      {order.status === 'dikirim' && order.kurir_nama && (
        <div className="bg-naik rounded-(--radius-input) p-4 mt-3 text-sm flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-kabut text-xs">Pengirim</p>
            <p className="font-semibold mt-1">
              {order.kurir_nama}
              {order.kurir_phone && (
                <span className="text-kabut font-normal"> — {order.kurir_phone}</span>
              )}
            </p>
            {order.dikirim_at && (
              <p className="text-kabut text-xs mt-1">
                Dikirim {tanggal(order.dikirim_at)}
                {order.estimasi_at && <span> · Estimasi tiba {tanggal(order.estimasi_at)}</span>}
              </p>
            )}
          </div>
          {order.kurir_phone && <Telpon hp={order.kurir_phone} judul="Hubungi Pengirim" />}
        </div>
      )}

      {/* kapan paket nyampe, buat yang udah sampai / selesai */}
      {['sampai', 'selesai'].includes(order.status) && order.sampai_at && (
        <p className="text-kabut text-xs mt-3">Tiba {tanggal(order.sampai_at)}</p>
      )}

      {/* alasan + bukti pengajuan pengembalian dari pembeli */}
      {retur && (
        <div className="bg-naik rounded-(--radius-input) p-4 mt-3 text-sm">
          <p className="text-kabut text-xs">Alasan Pengembalian</p>
          <p className="mt-1">{retur.alasan}</p>
          {retur.media.length > 0 && (
            <div className="flex flex-wrap gap-3 mt-3">
              {retur.media.map((url) =>
                // video bisa diputer langsung, foto diklik kebuka gede di tab baru
                url.match(/\.(mp4|webm|mov|mkv|avi)(\?|$)/i) ? (
                  <video key={url} src={url} controls className="w-40 rounded-(--radius-input)" />
                ) : (
                  <a key={url} href={url} target="_blank" rel="noreferrer">
                    <img src={url} alt="bukti" className="w-20 h-20 object-cover rounded-(--radius-input)" />
                  </a>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* daftar barang di order ini */}
      <div className="mt-4 space-y-3">
        {order.order_items.map((item) => (
          <div key={item.id} className="flex items-center gap-3">
            {item.products?.images?.[0] ? (
              <img
                src={item.products.images[0]}
                alt={item.products.name}
                className="w-12 h-12 object-cover rounded-(--radius-input)"
              />
            ) : (
              <div className="w-12 h-12 bg-naik rounded-(--radius-input)" />
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {item.products?.name}
                {item.variant_name && (
                  <span className="text-kabut font-normal"> ({item.variant_name})</span>
                )}
              </p>
              <p className="text-kabut text-xs">
                {item.qty} x Rp{item.price.toLocaleString('id-ID')}
              </p>
            </div>
            <p className="text-sm font-medium shrink-0">
              Rp{(item.price * item.qty).toLocaleString('id-ID')}
            </p>
          </div>
        ))}
      </div>

      {/* baris bawah: subtotal + tombol aksi kalau ada */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-naik mt-4 pt-4">
        <p className="text-sm">
          <span className="text-kabut">Subtotal: </span>
          <span className="text-neon font-bold text-lg">
            Rp{order.total.toLocaleString('id-ID')}
          </span>
        </p>
        {children && <div className="flex gap-2">{children}</div>}
      </div>
    </div>
  )
}
