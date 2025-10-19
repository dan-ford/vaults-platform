import { createBrowserClient, type SupabaseClient } from '@supabase/ssr'
import type { Database } from '@/lib/supabase/database.types'

export function createClient(): SupabaseClient<Database> {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}