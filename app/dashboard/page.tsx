import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import { LogOut } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()

  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch user profile to get their role
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const role = profile?.role || 'intern'

  // Fetch assigned repositories
  const { data: assignedRepos } = await supabase
    .from('user_repositories')
    .select('repository_id, repositories(name, url)')
    .eq('user_id', user.id)

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8">
      <header className="flex justify-between items-center mb-12">
        <h1 className="text-3xl font-bold text-slate-800">GitSimple Dashboard</h1>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="font-medium">{user.email}</p>
            <p className="text-sm text-slate-500 uppercase tracking-wide">{role}</p>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button className="p-2 hover:bg-slate-200 rounded-full transition-colors">
              <LogOut size={20} />
            </button>
          </form>
        </div>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        
        {/* Manager Section */}
        {role === 'manager' && (
          <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-xl font-bold mb-4">Manager Tools</h2>
            <div className="bg-slate-50 p-4 rounded-lg border border-slate-100">
              <h3 className="font-semibold mb-2">Provision Access</h3>
              <p className="text-sm text-slate-600 mb-4">Invite team members and assign them roles.</p>
              
              <form className="flex gap-2" action="/api/auth/invite" method="POST">
                <input type="email" name="email" placeholder="email@company.com" className="px-3 py-2 border rounded-md flex-1" required />
                <select name="role" className="px-3 py-2 border rounded-md bg-white">
                  <option value="employee">Employee</option>
                  <option value="intern">Intern</option>
                  <option value="manager">Manager</option>
                </select>
                <button type="submit" className="bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors">
                  Invite User
                </button>
              </form>
              <p className="text-xs text-slate-400 mt-2">Note: In a full app, you would select repositories here before inviting.</p>
            </div>
          </section>
        )}

        {/* Assigned Repositories Section */}
        <section className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-4">Your Assigned Repositories</h2>
          
          {assignedRepos && assignedRepos.length > 0 ? (
            <ul className="space-y-3">
              {assignedRepos.map((ar: any) => (
                <li key={ar.repository_id} className="p-4 border border-slate-100 rounded-lg flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors">
                  <div>
                    <h3 className="font-bold text-slate-800">{ar.repositories.name}</h3>
                    <a href={ar.repositories.url} target="_blank" rel="noreferrer" className="text-sm text-blue-600 hover:underline">
                      {ar.repositories.url}
                    </a>
                  </div>
                  <a href={`/?repo=${encodeURIComponent(ar.repositories.url)}`} className="px-4 py-2 bg-white border shadow-sm rounded-md text-sm font-medium hover:bg-slate-50 transition-colors">
                    Analyze Commits &rarr;
                  </a>
                </li>
              ))}
            </ul>
          ) : (
            <div className="text-center py-8 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
              <p>You have not been assigned to any repositories yet.</p>
              <p className="text-sm mt-1">Please contact your manager for access.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
