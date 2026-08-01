'use client';

import Image from 'next/image';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  useEffect(() => {
    document.title = 'ApolloEMS | Login';
  }, []);

  const [statusMessage, setStatusMessage] = useState('');

  const handleLogin = async () => {
    setStatusMessage('Opening Google sign-in...');

    const requestedNext = new URLSearchParams(window.location.search).get('next');
    const nextPath = requestedNext?.startsWith('/') && !requestedNext.startsWith('//')
      ? requestedNext
      : '/dashboard';

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
      },
    });

    if (error) {
      setStatusMessage(error.message);
      window.alert(error.message);
    }
  };

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#071632] via-[#0b3f78] to-[#0795e6] px-4">
      <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <Image
            src="/apollo-logo.png"
            alt="Apollo EMS Management"
            width={320}
            height={320}
            priority
            className="mb-6 h-auto w-full max-w-[320px]"
          />

          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            ApolloEMS
          </h1>

          <p className="mt-4 max-w-lg text-sm leading-7 text-slate-600">
            ApolloEMS is a modern EMS workforce and operations management platform
            designed specifically for emergency medical services agencies. Apollo
            streamlines scheduling, timecards, employee management, shift requests,
            communication, and operational oversight into one secure cloud-based
            system.
          </p>

          <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-900">
            Secure access is limited to authorized company personnel using approved
            Google Workspace accounts.
          </div>

          <button
            type="button"
            onClick={handleLogin}
            className="mt-8 w-full max-w-md cursor-pointer rounded-2xl bg-gradient-to-r from-[#0b1f4d] to-[#0878d1] px-4 py-4 text-sm font-semibold text-white transition hover:brightness-110 active:scale-[0.99]"
          >
            Sign in with Google
          </button>

          <button type="button" onClick={() => { window.location.href = '/dispatch-login'; }} className="mt-3 w-full max-w-md cursor-pointer rounded-2xl border border-slate-300 bg-white px-4 py-4 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 active:scale-[0.99]">
            Dispatch Login
          </button>

          {statusMessage && (
            <div className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700">
              {statusMessage}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
