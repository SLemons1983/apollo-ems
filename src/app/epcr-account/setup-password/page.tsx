'use client';

import Image from 'next/image';
import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type SessionState = 'checking' | 'ready' | 'invalid' | 'complete';

const inputClasses =
  'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100';

export default function SetupPassword() {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [message, setMessage] = useState('');
  const [working, setWorking] = useState(false);
  const [sessionState, setSessionState] = useState<SessionState>('checking');

  useEffect(() => {
    let active = true;
    async function establishSession() {
      const query = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const code = query.get('code');
      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');
      const linkType = hash.get('type');
      let error: Error | null = null;

      // Never allow an unrelated session that was already active in this browser
      // to authorize a password change. A recovery credential from the link is
      // required every time this page is opened.
      await supabase.auth.signOut({ scope: 'local' });

      if (code) {
        const result = await supabase.auth.exchangeCodeForSession(code);
        error = result.error;
      } else if (accessToken && refreshToken && ['recovery', 'invite', 'signup'].includes(linkType ?? '')) {
        const result = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        error = result.error;
      } else {
        error = new Error('This password reset link is invalid or has expired. Request a new link and try again.');
      }
      if (!active) return;
      if (error) {
        setMessage(error.message);
        setSessionState('invalid');
        return;
      }
      window.history.replaceState({}, document.title, '/epcr-account/setup-password');
      setSessionState('ready');
    }
    void establishSession();
    return () => { active = false; };
  }, []);

  async function save(event: FormEvent) {
    event.preventDefault();
    if (sessionState !== 'ready') return;
    if (password.length < 12) {
      setMessage('Use at least 12 characters.');
      return;
    }
    if (password !== confirm) {
      setMessage('Passwords do not match.');
      return;
    }
    setWorking(true);
    setMessage('Saving password...');
    const { error } = await supabase.auth.updateUser({ password });
    if (error) {
      setMessage(error.message);
      setWorking(false);
      return;
    }
    await fetch('/api/epcr/session?full=1', { method: 'DELETE' }).catch(() => undefined);
    await supabase.auth.signOut({ scope: 'local' });
    setPassword('');
    setConfirm('');
    setMessage('Your password was updated successfully. Sign in with your new password.');
    setSessionState('complete');
    setWorking(false);
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#071632] via-[#0b3f78] to-[#0795e6] px-4 py-10 text-slate-900">
      <form onSubmit={save} className="w-full max-w-md rounded-3xl border border-white/60 bg-white p-8 shadow-2xl sm:p-10">
        <Image src="/apollo-logo.png" alt="Apollo EMS Management" width={190} height={190} priority className="mx-auto h-auto w-full max-w-[165px]" />
        <p className="mt-5 text-center text-xs font-black uppercase tracking-[0.22em] text-blue-700">Secure account setup</p>
        <h1 className="mt-2 text-center text-3xl font-black tracking-tight text-slate-950">Create your password</h1>
        <p className="mt-3 text-center text-sm leading-6 text-slate-600">Choose a private password for your ePCR account. Apollo administrators cannot view it.</p>

        {sessionState === 'checking' && <p className="mt-6 rounded-xl border border-blue-100 bg-blue-50 p-4 text-center font-bold text-blue-950">Verifying your secure link...</p>}
        {sessionState === 'ready' && <>
          <label className="mt-7 block text-sm font-bold text-slate-800">
            New password
            <input required autoComplete="new-password" type="password" placeholder="At least 12 characters" className={inputClasses} value={password} onChange={(event) => setPassword(event.target.value)} />
          </label>
          <label className="mt-4 block text-sm font-bold text-slate-800">
            Confirm password
            <input required autoComplete="new-password" type="password" placeholder="Re-enter your password" className={inputClasses} value={confirm} onChange={(event) => setConfirm(event.target.value)} />
          </label>
          <button disabled={working} className="mt-6 w-full rounded-xl bg-gradient-to-r from-[#0b1f4d] to-[#0878d1] px-4 py-3.5 font-black text-white shadow-lg shadow-blue-900/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60">
            {working ? 'Saving...' : 'Save password'}
          </button>
        </>}
        {sessionState === 'invalid' && <a href="/epcr/login" className="mt-6 block rounded-xl bg-gradient-to-r from-[#0b1f4d] to-[#0878d1] p-3.5 text-center font-black text-white">Return to ePCR sign in</a>}
        {sessionState === 'complete' && <a href="/epcr-account/login" className="mt-6 block rounded-xl bg-gradient-to-r from-[#0b1f4d] to-[#0878d1] p-3.5 text-center font-black text-white">Sign in with new password</a>}
        {message && <p role="status" className={`mt-4 rounded-xl border p-3 text-sm font-bold ${sessionState === 'invalid' ? 'border-red-200 bg-red-50 text-red-800' : 'border-blue-100 bg-blue-50 text-blue-950'}`}>{message}</p>}
      </form>
    </main>
  );
}
