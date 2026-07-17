// ubah nomor 08xx jadi format internasional 628xx buat link whatsapp
export function normalisasiHp(hp) {
  const angka = (hp || '').replace(/[^0-9]/g, '')
  if (angka.startsWith('0')) return '62' + angka.slice(1)
  return angka
}

// bikin link wa.me dari nomor hp
export function linkWa(hp) {
  return 'https://wa.me/' + normalisasiHp(hp)
}
