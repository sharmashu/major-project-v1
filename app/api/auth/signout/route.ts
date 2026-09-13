import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function POST(request: Request) {
  const supabase = createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
