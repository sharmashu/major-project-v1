"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";
import { LogOut, User, Menu } from "lucide-react";

export default function Topbar() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  return (
    <header className="h-20 flex justify-between items-center px-8 border-b border-zinc-800 bg-[#0a0a0a] shrink-0">
      <div className="flex items-center gap-4">
        {/* Mobile menu placeholder (optional) */}
        <button className="md:hidden text-zinc-400 hover:text-white">
          <Menu className="w-6 h-6" />
        </button>
      </div>

      <div className="flex items-center gap-4">
        {user ? (
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center border border-purple-500/30">
                <User className="w-4 h-4 text-purple-400" />
              </div>
              <span className="text-sm font-medium text-zinc-300 hidden sm:block">
                {user.email}
              </span>
            </div>
            
            <form action="/api/auth/signout" method="POST">
              <button 
                type="submit" 
                className="flex items-center gap-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-zinc-800"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:block">Sign out</span>
              </button>
            </form>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <Link href="/login" className="text-sm font-medium text-zinc-400 hover:text-white transition-colors px-4 py-2">
              Log in
            </Link>
            <Link href="/signup" className="text-sm font-medium bg-white text-black hover:bg-zinc-200 transition-colors px-4 py-2 rounded-lg">
              Sign up
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
