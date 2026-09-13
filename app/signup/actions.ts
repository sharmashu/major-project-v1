'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export async function signup(formData: FormData) {
  const supabase = createClient()

  const data = {
    email: formData.get('email') as string,
    password: formData.get('password') as string,
  }

  const { data: authData, error } = await supabase.auth.signUp(data)

  if (error) {
    return redirect(`/signup?message=${encodeURIComponent(error.message)}`)
  }

  if (!authData.session) {
    return redirect('/login?message=Check your email to confirm your account before logging in.')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
