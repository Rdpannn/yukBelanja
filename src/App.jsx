import { useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './context/auth'
import Navbar from './components/navbar'
import NavJualan from './seller/nav'
import Guard from './components/guard'
import Home from './pages/home'
import Login from './pages/login'
import Register from './pages/register'
import Toko from './pages/toko'
import TokoDetail from './pages/tokoDetail'
import Detail from './pages/detail'
import Produk from './pages/produk'
import EventDetail from './pages/event'
import Cari from './pages/cari'
import Cart from './pages/cart'
import Orders from './pages/orders'
import SellerLogin from './seller/login'
import SellerRegister from './seller/register'
import SellerLayout from './seller/layout'
import SellerDashboard from './seller/dashboard'
import SellerProducts from './seller/products'
import SellerProduk from './seller/produk'
import SellerEvent from './seller/event'
import SellerOrders from './seller/orders'
import SellerRetur from './seller/retur'
import SellerRiwayat from './seller/riwayat'
import AdminLogin from './admin/login'
import AdminLayout from './admin/layout'
import AdminDashboard from './admin/dashboard'
import AdminUsers from './admin/users'
import AdminToko from './admin/toko'
import AdminAdmins from './admin/admins'
import AdminProducts from './admin/products'
import AdminProduk from './admin/produk'
import AdminKategoriProduk from './admin/kategoriProduk'
import AdminEvents from './admin/events'
import AdminEventProduk from './admin/eventProduk'
import AdminCategories from './admin/categories'
import AdminBanners from './admin/banners'

function App() {
  const lokasi = useLocation()
  const { profile } = useAuth()

  // halaman gerbang seller (login, register, buka toko) dikasih navbar yukJualan versi polos
  const diGerbangSeller =
    lokasi.pathname === '/seller/login' ||
    lokasi.pathname === '/seller/register' ||
    lokasi.pathname === '/toko'

  // navbar yukBelanja cuma buat wilayah toko, di /seller, /admin, sama gerbang seller disembunyiin
  const diToko =
    !lokasi.pathname.startsWith('/seller') && !lokasi.pathname.startsWith('/admin') && !diGerbangSeller

  // ganti icon + judul tab sesuai wilayahnya
  useEffect(() => {
    const icon = document.querySelector("link[rel='icon']")
    if (lokasi.pathname.startsWith('/admin')) {
      icon.href = '/admin.svg'
      document.title = 'Admin YukBelanja'
    } else if (lokasi.pathname.startsWith('/seller') || lokasi.pathname === '/toko') {
      icon.href = '/toko.svg'
      document.title = 'YukJualan'
    } else {
      icon.href = '/keranjang.svg'
      document.title = 'YukBelanja'
    }
  }, [lokasi])

  // admin gak boleh keluyuran di area toko atau seller, tugasnya cuma di /admin
  if (profile?.role === 'admin' && !lokasi.pathname.startsWith('/admin')) {
    return <Navigate to="/admin" replace />
  }

  return (
    <>
      {diToko && <Navbar />}
      {diGerbangSeller && <NavJualan />}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/toko" element={<Toko />} />
        <Route path="/toko/:id" element={<TokoDetail />} />
        <Route path="/detail/:id" element={<Detail />} />
        <Route path="/produk" element={<Produk />} />
        <Route path="/event/:id" element={<EventDetail />} />
        <Route path="/cari" element={<Cari />} />
        <Route
          path="/cart"
          element={
            <Guard>
              <Cart />
            </Guard>
          }
        />
        <Route
          path="/orders"
          element={
            <Guard>
              <Orders />
            </Guard>
          }
        />
        <Route path="/seller/login" element={<SellerLogin />} />
        <Route path="/seller/register" element={<SellerRegister />} />
        <Route
          path="/seller"
          element={
            <Guard role="seller">
              <SellerLayout />
            </Guard>
          }
        >
          <Route index element={<SellerDashboard />} />
          <Route path="products" element={<SellerProducts />} />
          <Route path="products/:id" element={<SellerProduk />} />
          <Route path="event" element={<SellerEvent />} />
          <Route path="orders" element={<SellerOrders />} />
          <Route path="retur" element={<SellerRetur />} />
          <Route path="riwayat" element={<SellerRiwayat />} />
        </Route>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin"
          element={
            <Guard role="admin">
              <AdminLayout />
            </Guard>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="toko" element={<AdminToko />} />
          <Route path="admins" element={<AdminAdmins />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="products/kategori/:id" element={<AdminKategoriProduk />} />
          <Route path="products/:id" element={<AdminProduk />} />
          <Route path="events" element={<AdminEvents />} />
          <Route path="events/:id" element={<AdminEventProduk />} />
          <Route path="categories" element={<AdminCategories />} />
          <Route path="banners" element={<AdminBanners />} />
        </Route>
      </Routes>
    </>
  )
}

export default App
