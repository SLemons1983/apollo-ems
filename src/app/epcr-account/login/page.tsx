'use client';

import Image from 'next/image';
import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';

const inputClasses =
  'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100';

export default function EpcrLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setWorking(true);
    setMessage('Signing in...');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setMessage(error.message);
      setWorking(false);
      return;
    }
    const sessionResponse = await fetch('/api/epcr/session', { method: 'POST' });
    if (!sessionResponse.ok) {
      await supabase.auth.signOut({ scope: 'local' });
      setMessage('This account does not have active ePCR access.');
      setWorking(false);
      return;
    }
    window.location.href = '/epcr-dashboard';
  }

  async function reset() {
    if (!email) {
      setMessage('Enter your email address first.');
      return;
    }
    setWorking(true);
    setMessage('Sending password reset link...');
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/epcr/setup-password`,
    });
    setMessage(error?.message ?? 'Password reset link sent.');
    setWorking(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#071632] via-[#0b3f78] to-[#0795e6] px-4 py-10 text-slate-900">
      <form onSubmit={submit} className="w-full max-w-md rounded-3xl border border-white/60 bg-white p-8 shadow-2xl sm:p-10">
        <div className="text-center">
          <Image src="/apollo-logo.png" alt="Apollo EMS Management" width={220} height={220} priority className="mx-auto h-auto w-full max-w-[190px]" />
          <p className="mt-5 text-xs font-black uppercase tracking-[0.22em] text-blue-700">Secure ePCR access</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Welcome to Apollo ePCR</h1>
          <p className="mt-3 text-sm leading-6 text-slate-600">Sign in with the private account issued by your agency.</p>
        </div>

        <label className="mt-7 block text-sm font-bold text-slate-800">
          Email address
          <input required autoComplete="email" type="email" placeholder="name@agency.org" className={inputClasses} value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="mt-4 block text-sm font-bold text-slate-800">
          Password
          <input required autoComplete="current-password" type="password" placeholder="Enter your password" className={inputClasses} value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>

        <button disabled={working} className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#0b1f4d] to-[#0878d1] px-4 py-3.5 font-black text-white shadow-lg shadow-blue-900/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
          {working ? 'Please wait...' : 'Sign in'}
        </button>
        <button type="button" disabled={working} onClick={() => void reset()} className="mt-4 w-full rounded-xl px-4 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-50 disabled:opacity-60">
          Send password reset link
        </button>
        {message && <p role="status" className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3 text-sm font-bold text-blue-950">{message}</p>}
      </form>
    </main>
  );
}
