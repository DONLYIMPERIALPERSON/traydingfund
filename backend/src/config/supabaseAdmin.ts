import { createClient } from '@supabase/supabase-js'
import { env } from './env'

if (!env.supabaseServiceRoleKey) {
  console.warn('SUPABASE_SERVICE_ROLE_KEY is not set. Admin auth checks will fail.')
}

export const supabaseAdmin = createClient(env.supabaseUrl, env.supabaseServiceRoleKey)