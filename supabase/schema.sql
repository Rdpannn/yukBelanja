-- skema database yukbelanja
-- jalankan di supabase dashboard > SQL Editor

-- tabel profil, nyimpen data tambahan user + role nya
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text,
  role text not null default 'buyer' check (role in ('buyer', 'seller', 'admin')),
  store text, -- nama toko, keisi kalau dia seller
  phone text, -- no hp seller, buat dihubungin pembeli lewat wa
  avatar text, -- foto profil dari akun google, buat ditampilin di box seller
  created_at timestamptz default now()
);

-- tabel kategori produk, isinya dikelola admin
create table categories (
  id bigint generated always as identity primary key,
  name text not null,
  created_at timestamptz default now()
);

-- tabel produk
create table products (
  id bigint generated always as identity primary key,
  seller_id uuid not null references profiles (id) on delete cascade,
  category_id bigint references categories (id) on delete set null,
  name text not null,
  price int not null,
  description text,
  images text[] not null default '{}', -- bisa banyak foto, yang pertama jadi cover
  stock int not null default 0,
  sold int not null default 0, -- jumlah kejual, naik pas order selesai
  -- moderasi admin: dihapus = soft delete biar riwayat pesanan gak bolong
  status text not null default 'aktif' check (status in ('aktif', 'ditangguhkan', 'dihapus')),
  alasan text, -- alasan dihapus / ditangguhkan dari admin
  tangguh_sejak timestamptz,
  tangguh_sampai timestamptz, -- lewat tanggal ini produknya aktif lagi otomatis (timer)
  created_at timestamptz default now()
);

-- tabel varian produk, opsional per produk (misal: Merah, Hitam, Biru)
-- kalau produk punya varian, harga & stok di products jadi turunan: harga termurah + total stok varian
create table variants (
  id bigint generated always as identity primary key,
  product_id bigint not null references products (id) on delete cascade,
  name text not null,
  price int not null,
  stock int not null default 0,
  created_at timestamptz default now()
);

-- tabel isi keranjang
create table cart_items (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles (id) on delete cascade,
  product_id bigint not null references products (id) on delete cascade,
  variant_id bigint references variants (id) on delete cascade, -- keisi kalau produknya pake varian
  qty int not null default 1,
  -- 1 produk (per varian) cuma 1 baris per user, tinggal update qty nya
  unique nulls not distinct (user_id, product_id, variant_id)
);

-- tabel alamat tersimpen buyer, biar gak ngetik ulang tiap checkout
create table addresses (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles (id) on delete cascade,
  receiver text not null, -- nama penerima
  phone text not null,
  address text not null,
  created_at timestamptz default now()
);

-- tabel pembayaran, 1 kali bayar snap bisa nyakup beberapa order (beda toko)
create table payments (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles (id),
  total int not null,
  snap_token text,
  status text not null default 'pending' check (status in ('pending', 'paid', 'expire')),
  metode text, -- cara bayarnya dari midtrans (qris, gopay, dst)
  paid_at timestamptz, -- kapan dibayar, buat timer auto batal
  created_at timestamptz default now()
);

-- tabel order, 1 order isinya barang dari 1 toko aja
create table orders (
  id bigint generated always as identity primary key,
  -- nomor pesanan yang tampil ke user, acak biar gak keliatan urutannya
  kode text not null unique default ('YB-' || upper(substr(md5(random()::text), 1, 8))),
  payment_id bigint not null references payments (id) on delete cascade,
  user_id uuid not null references profiles (id),
  seller_id uuid not null references profiles (id),
  total int not null, -- subtotal barang toko ini doang
  status text not null default 'menunggu' check (status in ('menunggu', 'dikirim', 'sampai', 'selesai', 'batal')),
  receiver text, -- nama penerima, boleh beda sama nama akun
  phone text,
  address text, -- alamat pengiriman
  kurir_nama text, -- nama pengirim, diisi seller pas kirim
  kurir_phone text,
  estimasi_at timestamptz, -- perkiraan tanggal sampai, diisi seller pas kirim
  minta_batal boolean not null default false, -- buyer minta batal, nunggu seller setuju
  dikirim_at timestamptz,
  sampai_at timestamptz, -- kapan sampai, buat timer auto selesai
  created_at timestamptz default now()
);

-- tabel detail barang per order
create table order_items (
  id bigint generated always as identity primary key,
  order_id bigint not null references orders (id) on delete cascade,
  product_id bigint not null references products (id),
  variant_id bigint references variants (id) on delete set null,
  variant_name text, -- nama varian pas dibeli, biar tetep kebaca walau variannya dihapus
  qty int not null,
  price int not null -- harga pas dibeli, biar gak berubah kalau seller ganti harga
);

-- tabel pengajuan pengembalian barang, 1 order cuma bisa ngajuin sekali
create table returns (
  id bigint generated always as identity primary key,
  order_id bigint not null unique references orders (id) on delete cascade,
  alasan text not null,
  media text[] not null default '{}', -- bukti foto / video
  status text not null default 'diajukan' check (status in ('diajukan', 'disetujui', 'ditolak')),
  created_at timestamptz default now()
);

-- tabel notifikasi, isinya ditulis trigger db tiap ada kejadian di pesanan
create table notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references profiles (id) on delete cascade,
  judul text not null,
  isi text not null,
  link text, -- halaman yang dibuka pas notifnya diklik
  dibaca boolean not null default false,
  created_at timestamptz default now()
);

-- tabel banner carousel di home, dikelola admin
create table banners (
  id bigint generated always as identity primary key,
  image text not null,
  judul text not null,
  link text, -- halaman yang dibuka pas banner diklik, boleh kosong
  urutan int not null default 0,
  aktif boolean not null default true,
  created_at timestamptz default now()
);

-- tabel event diskon, dikelola admin
-- flash sale = 1 baris tetap yang di-seed di paling bawah, gak dibikin / dihapus dari halaman admin
create table events (
  id bigint generated always as identity primary key,
  nama text not null,
  tipe text not null default 'biasa' check (tipe in ('biasa', 'flash_sale')),
  mulai date, -- periode event biasa, flash sale gak pake (jalannya tiap hari)
  selesai date,
  min_diskon int not null default 10, -- persen diskon paling kecil yang boleh diajuin seller
  aktif boolean not null default true,
  created_at timestamptz default now()
);

-- slot jam flash sale, muter tiap hari
create table event_slots (
  id bigint generated always as identity primary key,
  event_id bigint not null references events (id) on delete cascade,
  jam_mulai time not null,
  jam_selesai time not null,
  aktif boolean not null default true,
  created_at timestamptz default now()
);

-- produk yang didaftarin seller ke event, diskonnya nunggu di-acc admin
create table event_products (
  id bigint generated always as identity primary key,
  event_id bigint not null references events (id) on delete cascade,
  product_id bigint not null references products (id) on delete cascade,
  diskon int not null, -- persen, minimal ngikutin min_diskon event nya
  status text not null default 'diajukan' check (status in ('diajukan', 'disetujui', 'ditolak')),
  created_at timestamptz default now(),
  -- 1 produk cuma bisa didaftarin sekali per event
  unique (event_id, product_id)
);

-- tiap ada user baru daftar, otomatis bikinin baris di profiles
-- kalau daftarnya dari halaman register seller, metadata nya bawa role + nama toko
-- role dari metadata cuma boleh 'seller', selain itu dianggap buyer biar gak bisa nyelundup jadi admin
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, role, store, phone, avatar)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    case when new.raw_user_meta_data ->> 'role' = 'seller' then 'seller' else 'buyer' end,
    case when new.raw_user_meta_data ->> 'role' = 'seller' then new.raw_user_meta_data ->> 'store' end,
    case when new.raw_user_meta_data ->> 'role' = 'seller' then new.raw_user_meta_data ->> 'phone' end,
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- helper buat ngecek role user yang lagi login
-- pake security definer biar gak muter (policy profiles ngecek profiles)
create function public.my_role()
returns text as $$
  select role from public.profiles where id = auth.uid()
$$ language sql security definer stable;

-- helper cek order ini nyangkut sama user yang login (pembeli atau seller nya)
-- pake security definer biar policy order_items gak muter lewat RLS orders
create function public.order_saya(oid bigint)
returns boolean as $$
  select exists (
    select 1 from orders o
    where o.id = oid and (o.user_id = auth.uid() or o.seller_id = auth.uid())
  )
$$ language sql security definer stable;

-- tiap status order berubah, urusin efek sampingnya di satu tempat:
-- batal = stok barangnya dibalikin, selesai = jumlah terjual naik
-- pake security definer soalnya yang mindahin status belum tentu punya akses ke products nya
create function public.urus_status_order()
returns trigger as $$
begin
  if new.status = 'batal' then
    -- balikin stok produk (dijumlah per produk, 1 produk bisa muncul di beberapa item beda varian)
    update products p set stock = p.stock + s.qty
    from (select product_id, sum(qty) as qty from order_items where order_id = new.id group by product_id) s
    where p.id = s.product_id;
    -- balikin stok varian nya juga
    update variants v set stock = v.stock + s.qty
    from (select variant_id, sum(qty) as qty from order_items where order_id = new.id and variant_id is not null group by variant_id) s
    where v.id = s.variant_id;
  end if;

  if new.status = 'selesai' then
    -- uangnya udah cair, jumlah terjual baru dihitung sekarang
    update products p set sold = p.sold + s.qty
    from (select product_id, sum(qty) as qty from order_items where order_id = new.id group by product_id) s
    where p.id = s.product_id;
  end if;

  return new;
end;
$$ language plpgsql security definer;

-- jalan cuma pas kolom status nya beneran ganti, biar gak dobel
create trigger on_order_status
  after update of status on orders
  for each row
  when (old.status is distinct from new.status)
  execute function public.urus_status_order();

-- helper buat nulis satu notif, dipake trigger-trigger di bawah
-- security definer biar bisa nulis notif buat user lain (RLS notifications gak ngizinin insert dari client)
create function public.tulis_notif(penerima uuid, judul text, isi text, tujuan text)
returns void as $$
  insert into notifications (user_id, judul, isi, link) values (penerima, judul, isi, tujuan)
$$ language sql security definer;

-- pas pembayaran masuk, kabarin tiap seller yang ordernya kebayar
create function public.notif_payment()
returns trigger as $$
declare o record;
begin
  if new.status = 'paid' then
    for o in select kode, seller_id from orders where payment_id = new.id loop
      perform tulis_notif(o.seller_id, 'Ada pesanan baru!', 'Pesanan ' || o.kode || ' masuk. Yuk dikonfirmasi.', '/seller/orders');
    end loop;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_payment_paid
  after update of status on payments
  for each row
  when (old.status is distinct from new.status)
  execute function public.notif_payment();

-- tiap status order ganti, kirim notif ke pihak yang perlu tau
create function public.notif_status_order()
returns trigger as $$
declare
  toko text;
  otomatis boolean;
begin
  select store into toko from profiles where id = new.seller_id;
  -- timer pg_cron bakal nyalain setting ini biar teks notifnya versi otomatis
  otomatis := coalesce(current_setting('yb.auto', true), '') = '1';

  if new.status = 'dikirim' then
    perform tulis_notif(new.user_id, 'Pesananmu dikirim!', 'Pesanan ' || new.kode || ' dari ' || toko || ' lagi otw ke kamu.', '/orders');
  elsif new.status = 'sampai' then
    perform tulis_notif(new.user_id, 'Pesananmu udah sampai', 'Pesanan ' || new.kode || ' udah nyampe. Jangan lupa klik "Pesanan Diterima" ya.', '/orders');
  elsif new.status = 'selesai' then
    if otomatis then
      perform tulis_notif(new.user_id, 'Pesanan selesai otomatis', 'Pesanan ' || new.kode || ' udah 2x24 jam sejak sampai, jadi kami tandain selesai.', '/orders');
    else
      perform tulis_notif(new.user_id, 'Pesanan selesai', 'Pesanan ' || new.kode || ' udah selesai. Makasih udah belanja!', '/orders');
    end if;
    perform tulis_notif(new.seller_id, 'Pesanan selesai', 'Pesanan ' || new.kode || ' selesai. Pendapatanmu udah dihitung.', '/seller/riwayat');
  elsif new.status = 'batal' then
    -- batal gara-gara payment expire gak usah dinotif, ordernya belum pernah nongol di mana-mana
    if (select status from payments where id = new.payment_id) <> 'paid' then
      return new;
    end if;
    if otomatis then
      perform tulis_notif(new.user_id, 'Pesananmu dibatalin otomatis', 'Pesanan ' || new.kode || ' gak dikonfirmasi toko dalam 24 jam, jadi kami batalin.', '/orders');
      perform tulis_notif(new.seller_id, 'Pesanan dibatalin otomatis', 'Pesanan ' || new.kode || ' lewat 24 jam gak dikonfirmasi, jadi dibatalin sistem.', '/seller/riwayat');
    elsif exists (select 1 from returns r where r.order_id = new.id and r.status = 'disetujui') then
      -- batalnya karena pengembalian disetujui, notifnya udah dikirim trigger returns
      null;
    elsif new.minta_batal then
      perform tulis_notif(new.user_id, 'Pembatalan disetujui', 'Permintaan batal buat pesanan ' || new.kode || ' udah disetujui toko.', '/orders');
    else
      perform tulis_notif(new.user_id, 'Pesananmu dibatalin', 'Yah, pesanan ' || new.kode || ' dibatalin sama ' || toko || '. Stok barangnya udah dibalikin.', '/orders');
    end if;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_order_status_notif
  after update of status on orders
  for each row
  when (old.status is distinct from new.status)
  execute function public.notif_status_order();

-- pembeli minta batal, kabarin seller nya
create function public.notif_minta_batal()
returns trigger as $$
begin
  if new.minta_batal and not old.minta_batal then
    perform tulis_notif(new.seller_id, 'Permintaan pembatalan', 'Pembeli minta pesanan ' || new.kode || ' dibatalin. Cek dulu yuk.', '/seller/retur');
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_minta_batal
  after update of minta_batal on orders
  for each row execute function public.notif_minta_batal();

-- pengajuan pengembalian: masuk → kabarin seller, dijawab → kabarin pembeli
create function public.notif_retur()
returns trigger as $$
declare o record;
begin
  select kode, user_id, seller_id into o from orders where id = new.order_id;
  if tg_op = 'INSERT' then
    perform tulis_notif(o.seller_id, 'Ada pengajuan pengembalian', 'Pembeli ajuin pengembalian buat pesanan ' || o.kode || '. Cek buktinya ya.', '/seller/retur');
  elsif new.status = 'disetujui' and old.status = 'diajukan' then
    perform tulis_notif(o.user_id, 'Pengembalian disetujui', 'Pengajuan pengembalian pesanan ' || o.kode || ' disetujui. Pesanannya dibatalin.', '/orders');
  elsif new.status = 'ditolak' and old.status = 'diajukan' then
    perform tulis_notif(o.user_id, 'Pengembalian ditolak', 'Pengajuan pengembalian pesanan ' || o.kode || ' ditolak toko.', '/orders');
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_retur
  after insert or update of status on returns
  for each row execute function public.notif_retur();

-- admin ngehapus / nangguhin produk, kabarin seller nya
-- kalau yang ngubah seller nya sendiri (hapus produk dari etalase), gak usah dinotif
create function public.notif_moderasi_produk()
returns trigger as $$
begin
  if new.seller_id = auth.uid() then
    return new;
  end if;
  if new.status = 'dihapus' then
    perform tulis_notif(new.seller_id, 'Produkmu dihapus', '"' || new.name || '" dihapus dari YukBelanja sama admin. Alasan: ' || coalesce(new.alasan, '-'), '/seller/products');
  elsif new.status = 'ditangguhkan' then
    perform tulis_notif(new.seller_id, 'Produkmu ditangguhkan', '"' || new.name || '" ditangguhin sampe ' || to_char(new.tangguh_sampai, 'DD-MM-YYYY') || '. Alasan: ' || coalesce(new.alasan, '-'), '/seller/products');
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_moderasi_produk
  after update of status on products
  for each row
  when (old.status is distinct from new.status)
  execute function public.notif_moderasi_produk();

-- admin nonaktifin event, kabarin semua seller yang produknya ikut
create function public.notif_event_nonaktif()
returns trigger as $$
declare s record;
begin
  if old.aktif and not new.aktif then
    for s in
      select distinct p.seller_id from event_products ep
      join products p on p.id = ep.product_id
      where ep.event_id = new.id and ep.status = 'disetujui'
    loop
      perform tulis_notif(s.seller_id, 'Event dinonaktifin', 'Event ' || new.nama || ' udah dihentikan admin. Produk kamu yang ikut event ini balik ke harga normal.', '/seller/event');
    end loop;
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_event_nonaktif
  after update of aktif on events
  for each row execute function public.notif_event_nonaktif();

-- admin jawab pengajuan event, kabarin seller nya
create function public.notif_jawab_event()
returns trigger as $$
declare
  produk text;
  sid uuid;
  ev text;
begin
  select p.name, p.seller_id into produk, sid from products p where p.id = new.product_id;
  select nama into ev from events where id = new.event_id;
  if new.status = 'disetujui' and old.status = 'diajukan' then
    perform tulis_notif(sid, 'Pengajuan event disetujui', '"' || produk || '" lolos ke event ' || ev || '. Diskonnya aktif ngikutin jadwal event.', '/seller/event');
  elsif new.status = 'ditolak' and old.status = 'diajukan' then
    perform tulis_notif(sid, 'Pengajuan event ditolak', '"' || produk || '" gak lolos ke event ' || ev || '. Kamu bisa cabut terus ajuin ulang pake diskon lain.', '/seller/event');
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_jawab_event
  after update of status on event_products
  for each row execute function public.notif_jawab_event();

-- produk yang udah disetujui dicabut admin dari event, kabarin seller nya
-- seller yang nyabut produknya sendiri gak usah dinotif
create function public.notif_cabut_event()
returns trigger as $$
declare
  produk text;
  sid uuid;
  ev text;
begin
  select p.name, p.seller_id into produk, sid from products p where p.id = old.product_id;
  if sid = auth.uid() or old.status <> 'disetujui' then
    return old;
  end if;
  select nama into ev from events where id = old.event_id;
  perform tulis_notif(sid, 'Produk dicabut dari event', '"' || produk || '" dicabut admin dari event ' || ev || '. Diskonnya udah gak berlaku.', '/seller/event');
  return old;
end;
$$ language plpgsql security definer;

create trigger on_cabut_event
  before delete on event_products
  for each row execute function public.notif_cabut_event();

-- timer otomatis, dijalanin pg_cron tiap 10 menit
-- butuh extension pg_cron nyala dulu (dashboard > database > extensions)
create function public.jalanin_timer_order()
returns void as $$
begin
  -- tandain biar trigger notif make teks versi otomatis
  perform set_config('yb.auto', '1', true);

  -- auto batal: order yang gak dikonfirmasi seller 24 jam sejak dibayar
  -- stok balik + notif dua pihak jalan sendiri lewat trigger
  update orders o set status = 'batal'
  from payments p
  where p.id = o.payment_id
    and o.status = 'menunggu'
    and p.status = 'paid'
    and p.paid_at < now() - interval '24 hours';

  -- auto selesai: order yang udah 2x24 jam sampai dan gak ada pengajuan pengembalian
  update orders o set status = 'selesai'
  where o.status = 'sampai'
    and o.sampai_at < now() - interval '48 hours'
    and not exists (select 1 from returns r where r.order_id = o.id and r.status = 'diajukan');

  -- penangguhan yang udah lewat tanggalnya, produknya diaktifin lagi
  update products
  set status = 'aktif', alasan = null, tangguh_sejak = null, tangguh_sampai = null
  where status = 'ditangguhkan' and tangguh_sampai < now();
end;
$$ language plpgsql security definer;

-- jadwalin timernya tiap 10 menit
select cron.schedule('timer-order', '*/10 * * * *', 'select public.jalanin_timer_order()');

-- nyalain RLS di semua tabel
alter table profiles enable row level security;
alter table categories enable row level security;
alter table products enable row level security;
alter table variants enable row level security;
alter table cart_items enable row level security;
alter table addresses enable row level security;
alter table payments enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table returns enable row level security;
alter table notifications enable row level security;
alter table banners enable row level security;
alter table events enable row level security;
alter table event_slots enable row level security;
alter table event_products enable row level security;

-- policy profiles
-- profil bebas diliat termasuk yang belum login, buat nampilin nama toko di etalase & detail
create policy "liat profil" on profiles
  for select using (true);

-- user boleh edit profil sendiri, tapi gak boleh naikin diri jadi admin
create policy "edit profil sendiri" on profiles
  for update using (auth.uid() = id)
  with check (role in ('buyer', 'seller'));

-- admin boleh edit profil siapa aja (buat kelola user)
create policy "admin edit profil" on profiles
  for update using (my_role() = 'admin');

-- policy categories: semua bisa liat, cuma admin yang bisa ngatur
create policy "liat kategori" on categories
  for select using (true);

create policy "admin kelola kategori" on categories
  for all using (my_role() = 'admin') with check (my_role() = 'admin');

-- policy products
-- produk bebas diliat siapa aja, termasuk yang belum login
create policy "liat produk" on products
  for select using (true);

-- seller cuma bisa nambah produk atas nama dia sendiri
create policy "seller nambah produk" on products
  for insert with check (auth.uid() = seller_id and my_role() = 'seller');

-- seller edit / hapus produk miliknya, admin bisa semua
create policy "seller edit produk" on products
  for update using (auth.uid() = seller_id or my_role() = 'admin');

create policy "seller hapus produk" on products
  for delete using (auth.uid() = seller_id or my_role() = 'admin');

-- policy variants: bebas diliat, yang ngatur seller pemilik produknya (atau admin)
create policy "liat varian" on variants
  for select using (true);

create policy "seller kelola varian" on variants
  for all using (
    exists (select 1 from products p where p.id = variants.product_id and p.seller_id = auth.uid())
    or my_role() = 'admin'
  ) with check (
    exists (select 1 from products p where p.id = variants.product_id and p.seller_id = auth.uid())
    or my_role() = 'admin'
  );

-- policy cart_items: user cuma bisa akses keranjang sendiri
create policy "kelola cart sendiri" on cart_items
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- policy addresses: user cuma bisa akses alamat sendiri
create policy "kelola alamat sendiri" on addresses
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- policy payments: user liat pembayaran sendiri, admin liat semua
create policy "liat payment sendiri" on payments
  for select using (auth.uid() = user_id or my_role() = 'admin');

-- seller boleh liat payment yang nyakup order tokonya (buat tau udah dibayar apa belum)
create policy "seller liat payment" on payments
  for select using (
    exists (select 1 from orders o where o.payment_id = payments.id and o.seller_id = auth.uid())
  );

-- policy orders
-- user liat order sendiri, seller liat order tokonya, admin liat semua
create policy "liat order" on orders
  for select using (
    auth.uid() = user_id
    or auth.uid() = seller_id
    or my_role() = 'admin'
  );

-- seller ubah order tokonya (kirim, tandai sampai, batalin)
create policy "seller update order" on orders
  for update using (auth.uid() = seller_id);

-- buyer ubah order sendiri (minta batal, pesanan diterima)
create policy "buyer update order" on orders
  for update using (auth.uid() = user_id);

-- policy order_items: ikut aturan order nya
create policy "liat order items" on order_items
  for select using (order_saya(order_id) or my_role() = 'admin');

-- policy returns
-- pembeli & seller order nya boleh liat, admin juga
create policy "liat retur" on returns
  for select using (order_saya(order_id) or my_role() = 'admin');

-- buyer cuma bisa ajuin retur buat order sendiri yang statusnya sampai
create policy "ajukan retur" on returns
  for insert with check (
    exists (select 1 from orders o where o.id = order_id and o.user_id = auth.uid() and o.status = 'sampai')
  );

-- seller yang jawab pengajuannya (setujui / tolak)
create policy "seller jawab retur" on returns
  for update using (
    exists (select 1 from orders o where o.id = returns.order_id and o.seller_id = auth.uid())
  );

-- policy notifications: user cuma bisa liat + tandain dibaca notif sendiri
-- yang nulis notif trigger db (security definer), jadi gak ada policy insert
create policy "liat notif sendiri" on notifications
  for select using (auth.uid() = user_id);

create policy "update notif sendiri" on notifications
  for update using (auth.uid() = user_id);

-- policy banners: semua bisa liat (buat carousel home), cuma admin yang ngatur
create policy "liat banner" on banners
  for select using (true);

create policy "admin kelola banner" on banners
  for all using (my_role() = 'admin') with check (my_role() = 'admin');

-- policy events & slot jam: semua bisa liat (buat harga diskon di toko), cuma admin yang ngatur
create policy "liat event" on events
  for select using (true);

create policy "admin kelola event" on events
  for all using (my_role() = 'admin') with check (my_role() = 'admin');

create policy "liat slot event" on event_slots
  for select using (true);

create policy "admin kelola slot event" on event_slots
  for all using (my_role() = 'admin') with check (my_role() = 'admin');

-- policy event_products: semua bisa liat, seller daftarin / cabut produknya sendiri, admin yang jawab
create policy "liat produk event" on event_products
  for select using (true);

create policy "seller daftarin produk event" on event_products
  for insert with check (
    exists (select 1 from products p where p.id = product_id and p.seller_id = auth.uid())
  );

create policy "seller cabut produk event" on event_products
  for delete using (
    exists (select 1 from products p where p.id = event_products.product_id and p.seller_id = auth.uid())
    or my_role() = 'admin'
  );

create policy "admin jawab produk event" on event_products
  for update using (my_role() = 'admin') with check (my_role() = 'admin');

-- catatan: insert ke payments, orders & order_items dilakukan edge function
-- pake service role, jadi gak perlu policy insert buat client

-- bucket buat gambar produk
insert into storage.buckets (id, name, public) values ('products', 'products', true);

-- gambar produk bisa diliat semua orang
create policy "liat gambar produk" on storage.objects
  for select using (bucket_id = 'products');

-- yang login boleh upload gambar
create policy "upload gambar produk" on storage.objects
  for insert with check (bucket_id = 'products' and auth.uid() is not null);

-- bucket buat foto profil user
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true);

-- foto profil bisa diliat semua orang
create policy "liat foto profil" on storage.objects
  for select using (bucket_id = 'avatars');

-- yang login boleh upload foto profil
create policy "upload foto profil" on storage.objects
  for insert with check (bucket_id = 'avatars' and auth.uid() is not null);

-- bucket buat bukti pengembalian barang
insert into storage.buckets (id, name, public) values ('retur', 'retur', true);

-- bukti retur bisa diliat lewat link nya
create policy "liat bukti retur" on storage.objects
  for select using (bucket_id = 'retur');

-- yang login boleh upload bukti
create policy "upload bukti retur" on storage.objects
  for insert with check (bucket_id = 'retur' and auth.uid() is not null);

-- bucket buat gambar banner home
insert into storage.buckets (id, name, public) values ('banners', 'banners', true);

-- gambar banner bisa diliat semua orang
create policy "liat gambar banner" on storage.objects
  for select using (bucket_id = 'banners');

-- cuma admin yang boleh upload banner
create policy "upload gambar banner" on storage.objects
  for insert with check (bucket_id = 'banners' and my_role() = 'admin');

-- kategori awal, selanjutnya dikelola admin dari dashboard
insert into categories (name) values
  ('Elektronik'),
  ('Fashion'),
  ('Makanan & Minuman'),
  ('Kesehatan & Kecantikan'),
  ('Rumah Tangga'),
  ('Hobi & Mainan'),
  ('Olahraga'),
  ('Buku & Alat Tulis');

-- event flash sale bawaan, admin tinggal ngatur slot jam & minimal diskonnya
insert into events (nama, tipe, min_diskon) values ('Flash Sale', 'flash_sale', 10);
