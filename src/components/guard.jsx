import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/auth'

// pembatas route, cek udah login belum sama role nya cocok gak
export default function Guard({ role, children }) {
  const { session, profile, loading } = useAuth()

  // masih ngecek session, jangan render apa apa dulu
  if (loading) return null

  // belum login, lempar ke halaman login sesuai wilayahnya
  if (!session) {
    if (role === 'admin') return <Navigate to="/admin/login" replace />
    if (role === 'seller') return <Navigate to="/seller/login" replace />
    return <Navigate to="/login" replace />
  }

  // login tapi role nya gak cocok
  if (role && profile?.role !== role) {
    // buyer yang nyasar ke area seller ditawarin buka toko
    if (role === 'seller') return <Navigate to="/toko" replace />
    return <Navigate to="/" replace />
  }

  return children
}
