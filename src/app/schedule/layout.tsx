'use client';

import React, { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function isSupervisorRole(role: string | null | undefined, jobTitle: string | null | undefined): boolean {
  const normalizedRole = (role ?? '').trim().toLowerCase();
  const normalizedJobTitle = (jobTitle ?? '').trim().toLowerCase();

  return (
    normalizedRole === 'supervisor' ||
    normalizedRole === 'admin' ||
    normalizedRole === 'gm' ||
    normalizedJobTitle.includes('supervisor') ||
    normalizedJobTitle.includes('admin') ||
    normalizedJobTitle.includes('general manager')
  );
}

export default function SupervisorProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authChecked, setAuthChecked] = useState(false);
  const [accessDenied, setAccessDenied] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [isSigningOut, setIsSigningOut] = useState(false);

  useEffect(() => {
    document.title = 'ApolloEMS | Schedule';

    let isMounted = true;

    async function verifySupervisorAccess(activeUser: User | null | undefined) {
      if (!activeUser?.email) {
        router.replace('/login');
        return;
      }

      const { data: employee, error } = await supabase
        .from('employees')
        .select('id,email,role,job_title,status')
        .ilike('email', activeUser.email)
        .maybeSingle();

      if (!isMounted) return;

      if (error) {
        console.error('Supervisor access check failed:', error);
        setAccessDenied(true);
        setAuthChecked(true);
        return;
      }

      const isActive = (employee?.status ?? 'Active').trim().toLowerCase() === 'active';
      const allowed = isActive && isSupervisorRole(employee?.role, employee?.job_title);

      if (!allowed) {
        setAccessDenied(true);
        setAuthChecked(true);
        return;
      }

      setUser(activeUser);
      setAccessDenied(false);
      setAuthChecked(true);
    }

    async function checkSession() {
      const { data } = await supabase.auth.getSession();
      await verifySupervisorAccess(data.session?.user);
    }

    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;

      if (!session?.user) {
        setUser(null);
        router.replace('/login');
        return;
      }

      void verifySupervisorAccess(session.user);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [router]);

  async function handleSignOut() {
    setIsSigningOut(true);
    await supabase.auth.signOut();
    router.replace('/login');
  }

  if (!authChecked) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
          <div className="text-xl font-bold text-slate-900">Loading ApolloEMS...</div>
          <div className="mt-2 text-sm text-slate-600">Checking your secure login session.</div>
        </div>
      </main>
    );
  }

  if (accessDenied) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100 px-4">
        <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <div className="text-xl font-bold text-red-700">Access Denied</div>
          <div className="mt-2 text-sm text-slate-600">
            This page is restricted to supervisors, admins, and general managers.
          </div>
          <button
            type="button"
            onClick={() => router.replace('/dashboard')}
            className="mt-5 rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
          >
            Return to Dashboard
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm md:px-6">
        <div className="mx-auto flex max-w-[1500px] flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-bold text-slate-900">ApolloEMS</div>
            <div className="text-xs text-slate-500">
              Signed in as {user?.email ?? 'Authenticated user'}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSignOut}
            disabled={isSigningOut}
            className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            {isSigningOut ? 'Signing Out...' : 'Sign Out'}
          </button>
        </div>
      </div>

      {children}
    </div>
  );
}
