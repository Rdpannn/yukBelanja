import { createContext, useContext, useEffect, useState } from 'react'
import supabase from '../lib/supabase'

// context buat nyimpen data user yang lagi login, biar bisa diakses dari mana aja
const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // ambil session pas app pertama kebuka
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      if (!data.session) setLoading(false)
    })

    // dengerin perubahan login / logout
    const { data: listener } = supabase.auth.onAuthStateChange((event, newSession) => {
      setSession(newSession)
      if (!newSession) {
        setProfile(null)
        setLoading(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // tiap session berubah, ambil profile nya dari db biar tau role nya
  useEffect(() => {
    if (!session) return
    supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data }) => {
        setProfile(data)
        setLoading(false)
      })
  }, [session])

  return (
    <AuthContext.Provider value={{ session, profile, setProfile, loading }}>
      {children}
    </AuthContext.Provider>
  )
}

// cara pakenya: const { session, profile } = useAuth()
export function useAuth() {
  return useContext(AuthContext)
}
