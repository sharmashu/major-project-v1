import { signup } from './actions'
import { signInWithGithub, signInWithGoogle } from '@/app/login/actions'
import { Github } from 'lucide-react'

export default function SignupPage({
  searchParams,
}: {
  searchParams: { message: string }
}) {
  return (
    <div className="flex-1 flex flex-col w-full px-8 sm:max-w-md justify-center gap-2 mx-auto pt-20">
      <div className="animate-in flex-1 flex flex-col w-full justify-center gap-2 text-slate-800">
        <h2 className="text-2xl font-bold mb-4 text-center">Sign Up for GitSimple</h2>
        
        <form action={signInWithGithub}>
          <button className="w-full flex items-center justify-center gap-2 bg-zinc-900 text-white rounded-md px-4 py-2 mb-2 hover:bg-zinc-800 transition-colors">
            <Github className="w-4 h-4" />
            Sign Up with GitHub
          </button>
        </form>
        
        <form action={signInWithGoogle}>
          <button className="w-full flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-300 rounded-md px-4 py-2 mb-6 hover:bg-slate-50 transition-colors">
            Sign Up with Google
          </button>
        </form>

        <div className="relative flex py-2 items-center">
          <div className="flex-grow border-t border-slate-300"></div>
          <span className="flex-shrink-0 mx-4 text-slate-400 text-sm">Or with email</span>
          <div className="flex-grow border-t border-slate-300"></div>
        </div>

        <form className="flex flex-col w-full gap-2" action={signup}>
        <label className="text-md" htmlFor="email">
          Email
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border border-slate-300 mb-6"
          name="email"
          placeholder="you@example.com"
          required
        />
        <label className="text-md" htmlFor="password">
          Password
        </label>
        <input
          className="rounded-md px-4 py-2 bg-inherit border border-slate-300 mb-6"
          type="password"
          name="password"
          placeholder="••••••••"
          required
        />
        <button className="bg-slate-900 text-white rounded-md px-4 py-2 mb-2">
          Sign Up
        </button>
        {searchParams?.message && (
          <p className="mt-4 p-4 bg-slate-100 text-slate-900 text-center">
            {searchParams.message}
          </p>
        )}
        </form>
      </div>
    </div>
  )
}
