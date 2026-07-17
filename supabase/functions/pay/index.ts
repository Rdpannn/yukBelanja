import { createClient } from 'jsr:@supabase/supabase-js@2'

// header cors biar function nya bisa dipanggil dari browser
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// helper bikin response json
function jawab(data: object, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  })
}

// header buat manggil api midtrans, basic auth pake server key
function headerMidtrans() {
  return {
    'Content-Type': 'application/json',
    Authorization: 'Basic ' + btoa(Deno.env.get('MIDTRANS_SERVER_KEY') + ':'),
  }
}

Deno.serve(async (req) => {
  // preflight dari browser
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    // client pake service role biar bisa nulis ke payments & orders (bypass RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // cek siapa yang manggil dari token login nya
    const token = req.headers.get('Authorization')?.replace('Bearer ', '')
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return jawab({ error: 'harus login dulu' }, 401)

    const body = await req.json()

    // aksi "cek" = ngecek status pembayaran ke midtrans abis popup ditutup
    if (body.aksi === 'cek') return await cekStatus(supabase, user, body.payment_id)

    // default nya bikin pesanan baru dari item keranjang yang dipilih
    // origin dipake buat nentuin halaman balikan abis bayar
    return await buatPesanan(supabase, user, body, req.headers.get('origin'))
  } catch (e) {
    console.error(e)
    return jawab({ error: 'ada masalah di server' }, 500)
  }
})

// bikin pesanan, bisa dari keranjang (items) atau beli langsung dari detail (produk)
// 1 pembayaran = 1 payment, ordernya dipecah per toko, abis itu minta snap token ke midtrans
async function buatPesanan(supabase, user, body, origin) {
  const { items: ids, produk, nama, hp, alamat } = body
  if (!nama || !hp || !alamat) return jawab({ error: 'data pengiriman belum lengkap' }, 400)

  let items
  if (produk) {
    // beli langsung: ambil produknya, bentuk item nya disamain kayak item keranjang
    const { data: p } = await supabase
      .from('products')
      .select('id, seller_id, name, price, stock, status, variants(id, name, price, stock)')
      .eq('id', produk.product_id)
      .single()
    if (!p || !produk.qty || produk.qty < 1) return jawab({ error: 'produk gak ketemu' }, 400)

    const varian = (p.variants || []).find((v) => v.id === produk.variant_id)
    // produk yang punya varian wajib dikirim variant_id nya
    if (p.variants?.length > 0 && !varian) return jawab({ error: 'variannya belum dipilih' }, 400)

    items = [{ id: null, qty: produk.qty, variant_id: varian ? varian.id : null, products: p, variants: varian || null }]
  } else {
    if (!ids || ids.length === 0) return jawab({ error: 'gak ada item yang dipilih' }, 400)

    // ambil item keranjang nya, dipastiin punya user yang manggil
    const { data } = await supabase
      .from('cart_items')
      .select('id, qty, variant_id, products(id, seller_id, name, price, stock, status), variants(id, name, price, stock)')
      .in('id', ids)
      .eq('user_id', user.id)

    if (!data || data.length !== ids.length) return jawab({ error: 'item keranjang gak ketemu' }, 400)
    items = data
  }

  // diskon event yang lagi jalan, dihitung ulang di sini biar gak percaya harga dari frontend
  const diskon = await ambilDiskon(supabase)

  // hitung harga & cek stok per item, harga ngikutin varian kalau ada terus dipotong diskon
  // produk yang dihapus / ditangguhkan admin gak boleh dibeli
  let total = 0
  for (const item of items) {
    if (item.products.status !== 'aktif') {
      return jawab({ error: 'produk ' + item.products.name + ' udah gak tersedia' }, 400)
    }
    const normal = item.variants ? item.variants.price : item.products.price
    item.harga = potongHarga(normal, diskon[item.products.id] || 0)
    const stok = item.variants ? item.variants.stock : item.products.stock
    if (item.qty > stok) return jawab({ error: 'stok ' + item.products.name + ' kurang' }, 400)
    total += item.harga * item.qty
  }

  // kelompokin item per seller, 1 seller nanti jadi 1 order
  const perSeller = {}
  for (const item of items) {
    const sid = item.products.seller_id
    if (!perSeller[sid]) perSeller[sid] = []
    perSeller[sid].push(item)
  }

  // bikin payment nya dulu, status awal pending
  const { data: payment, error: errPayment } = await supabase
    .from('payments')
    .insert({ user_id: user.id, total })
    .select()
    .single()
  if (errPayment) throw errPayment

  // bikin order per seller + simpen detail barangnya
  // harga & nama varian di-snapshot biar gak berubah kalau seller ganti
  for (const sid of Object.keys(perSeller)) {
    const punya = perSeller[sid]
    const subtotal = punya.reduce((t, item) => t + item.harga * item.qty, 0)
    const { data: order, error: errOrder } = await supabase
      .from('orders')
      .insert({
        payment_id: payment.id,
        user_id: user.id,
        seller_id: sid,
        total: subtotal,
        receiver: nama,
        phone: hp,
        address: alamat,
      })
      .select()
      .single()
    if (errOrder) throw errOrder

    const { error: errItems } = await supabase.from('order_items').insert(
      punya.map((item) => ({
        order_id: order.id,
        product_id: item.products.id,
        variant_id: item.variant_id,
        variant_name: item.variants ? item.variants.name : null,
        qty: item.qty,
        // harga snapshot udah harga diskon, biar riwayat pesanan nya sesuai yang dibayar
        price: item.harga,
      }))
    )
    if (errItems) throw errItems
  }

  // ambil nama user buat data pelanggan di midtrans
  const { data: profil } = await supabase.from('profiles').select('name').eq('id', user.id).single()

  // minta snap token ke midtrans, id transaksinya nempel ke payment
  const res = await fetch('https://app.sandbox.midtrans.com/snap/v1/transactions', {
    method: 'POST',
    headers: headerMidtrans(),
    body: JSON.stringify({
      transaction_details: { order_id: 'PAY-' + payment.id, gross_amount: total },
      item_details: items.map((item) => ({
        id: String(item.products.id),
        // nama item midtrans maksimal 50 huruf
        name: (item.variants ? item.products.name + ' - ' + item.variants.name : item.products.name).slice(0, 50),
        price: item.harga,
        quantity: item.qty,
      })),
      customer_details: { first_name: profil?.name || 'Pembeli', email: user.email },
      // kalau snap ngeredirect penuh (bukan lewat callback popup), baliknya ke halaman pesanan
      callbacks: { finish: origin ? origin + '/orders' : undefined },
    }),
  })

  if (!res.ok) {
    // gagal dapet token, payment nya dihapus (ordernya ikut kehapus, cascade)
    console.error(await res.text())
    await supabase.from('payments').delete().eq('id', payment.id)
    return jawab({ error: 'gagal bikin transaksi midtrans' }, 500)
  }

  const snap = await res.json()

  // simpen token nya, potong stok, terus kosongin item keranjang yang dibeli
  await supabase.from('payments').update({ snap_token: snap.token }).eq('id', payment.id)

  for (const item of items) {
    if (item.variants) {
      // produk pake varian: potong stok varian nya juga
      await supabase
        .from('variants')
        .update({ stock: item.variants.stock - item.qty })
        .eq('id', item.variant_id)
    }
    await supabase
      .from('products')
      .update({ stock: item.products.stock - item.qty })
      .eq('id', item.products.id)
  }

  // yang lewat keranjang, item nya dikosongin (beli langsung gak nyentuh keranjang)
  if (ids && ids.length > 0) {
    await supabase.from('cart_items').delete().in('id', ids)
  }

  return jawab({ token: snap.token, payment_id: payment.id })
}

// tanggal & jam sekarang versi WIB, disamain sama hitungan di frontend
function sekarangWib() {
  const s = new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Jakarta' })
  return { tanggal: s.slice(0, 10), jam: s.slice(11, 19) }
}

// harga setelah dipotong diskon persen
function potongHarga(harga: number, diskon: number) {
  return harga - Math.floor((harga * diskon) / 100)
}

// ambil diskon event yang lagi jalan, bentuknya { product_id: persen }
// flash sale cuma keitung pas ada slot jam yang aktif
// produk yang ikut lebih dari satu event dipake diskon paling gede
async function ambilDiskon(supabase) {
  const { data } = await supabase
    .from('events')
    .select('tipe, mulai, selesai, event_slots(jam_mulai, jam_selesai, aktif), event_products(product_id, diskon, status)')
    .eq('aktif', true)

  const { tanggal, jam } = sekarangWib()
  const map = {}
  for (const ev of data || []) {
    if (ev.tipe === 'flash_sale') {
      const slot = (ev.event_slots || []).find(
        (s) => s.aktif && s.jam_mulai <= jam && jam < s.jam_selesai
      )
      if (!slot) continue
    } else {
      if (!ev.mulai || !ev.selesai || tanggal < ev.mulai || tanggal > ev.selesai) continue
    }
    for (const p of ev.event_products || []) {
      if (p.status !== 'disetujui') continue
      if (!map[p.product_id] || p.diskon > map[p.product_id]) map[p.product_id] = p.diskon
    }
  }
  return map
}

// ngecek status transaksi ke midtrans, dipanggil frontend abis bayar
async function cekStatus(supabase, user, paymentId) {
  // pastiin payment nya beneran punya user ini
  const { data: payment } = await supabase
    .from('payments')
    .select('id, status')
    .eq('id', paymentId)
    .eq('user_id', user.id)
    .single()
  if (!payment) return jawab({ error: 'pembayaran gak ketemu' }, 404)

  // tanya status nya langsung ke midtrans, jangan percaya frontend doang
  const res = await fetch('https://api.sandbox.midtrans.com/v2/PAY-' + payment.id + '/status', {
    headers: headerMidtrans(),
  })
  const data = await res.json()

  // settlement / capture artinya udah dibayar, ordernya tetep menunggu konfirmasi seller
  // cara bayarnya ikut disimpen buat data laporan admin
  if ((data.transaction_status === 'settlement' || data.transaction_status === 'capture') && payment.status !== 'paid') {
    await supabase
      .from('payments')
      .update({ status: 'paid', metode: data.payment_type, paid_at: new Date().toISOString() })
      .eq('id', payment.id)
    return jawab({ status: 'paid' })
  }

  // expire / cancel / deny artinya hangus: ordernya dibatalin
  // stok dibalikin otomatis sama trigger db pas status order jadi batal
  if (['expire', 'cancel', 'deny'].includes(data.transaction_status) && payment.status === 'pending') {
    await supabase.from('payments').update({ status: 'expire' }).eq('id', payment.id)
    await supabase.from('orders').update({ status: 'batal' }).eq('payment_id', payment.id)
    return jawab({ status: 'expire' })
  }

  return jawab({ status: payment.status })
}
