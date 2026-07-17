import { createClient } from '@supabase/supabase-js'

// koneksi ke supabase, url sama key nya diambil dari .env
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

export default supabase
