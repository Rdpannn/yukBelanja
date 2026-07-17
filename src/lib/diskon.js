import supabase from './supabase'

// tanggal & jam sekarang versi WIB, biar hitungannya sama kayak di edge function
export function sekarangWib() {
  const s = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' })
  return { tanggal: s.slice(0, 10), jam: s.slice(11, 19) }
}

// harga setelah dipotong diskon persen
export function potongHarga(harga, diskon) {
  return harga - Math.floor((harga * diskon) / 100)
}

// ubah "12:00:00" jadi detik, buat ngitung sisa waktu slot
function keDetik(jam) {
  const [h, m, s] = jam.split(':').map(Number)
  return h * 3600 + m * 60 + (s || 0)
}

// ambil event yang lagi jalan + diskon per produk
// flash sale cuma dihitung pas ada slot jam yang lagi aktif
// hasilnya: jalan = daftar event buat section home, map = { product_id: { diskon, event } }
export async function ambilDiskon() {
  const { data } = await supabase
    .from('events')
    .select('id, nama, tipe, mulai, selesai, event_slots(jam_mulai, jam_selesai, aktif), event_products(product_id, diskon, status)')
    .eq('aktif', true)

  const { tanggal, jam } = sekarangWib()
  const jalan = []
  const map = {}

  for (const ev of data || []) {
    let sisa = null // sisa detik slot flash sale, buat countdown
    if (ev.tipe === 'flash_sale') {
      const slot = (ev.event_slots || []).find(
        (s) => s.aktif && s.jam_mulai <= jam && jam < s.jam_selesai
      )
      if (!slot) continue
      sisa = keDetik(slot.jam_selesai) - keDetik(jam)
    } else {
      // event biasa jalannya ngikutin tanggal mulai - selesai
      if (!ev.mulai || !ev.selesai || tanggal < ev.mulai || tanggal > ev.selesai) continue
    }

    const produk = (ev.event_products || []).filter((p) => p.status === 'disetujui')
    if (produk.length === 0) continue

    jalan.push({ ...ev, sisa, produk })
    // produk yang ikut lebih dari satu event, dipake diskon paling gede
    for (const p of produk) {
      if (!map[p.product_id] || p.diskon > map[p.product_id].diskon) {
        map[p.product_id] = { diskon: p.diskon, event: { nama: ev.nama, tipe: ev.tipe, selesai: ev.selesai, sisa } }
      }
    }
  }

  // flash sale ditaruh paling atas
  jalan.sort((a, b) => (b.tipe === 'flash_sale') - (a.tipe === 'flash_sale'))
  return { jalan, map }
}
