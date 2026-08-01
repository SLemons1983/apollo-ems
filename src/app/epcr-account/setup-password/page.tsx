'use client';

import { FormEvent, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

type SessionState = 'checking' | 'ready' | 'invalid';

export default function SetupPassword() {
  const [password,setPassword]=useState(''),[confirm,setConfirm]=useState(''),[message,setMessage]=useState('');
  const [sessionState,setSessionState]=useState<SessionState>('checking');

  useEffect(() => {
    let active = true;
    async function establishSession() {
      const hash = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hash.get('access_token');
      const refreshToken = hash.get('refresh_token');
      let error: Error | null = null;
      if (accessToken && refreshToken) {
        const result = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
        error = result.error;
      } else {
        const result = await supabase.auth.getSession();
        error = result.error ?? (result.data.session ? null : new Error('This password link is invalid or has expired.'));
      }
      if (!active) return;
      if (error) { setMessage(error.message); setSessionState('invalid'); return; }
      window.history.replaceState({}, document.title, '/epcr/setup-password');
      setSessionState('ready');
    }
    void establishSession();
    return () => { active = false; };
  }, []);

  async function save(e:FormEvent){e.preventDefault();if(sessionState!=='ready')return;if(password.length<12){setMessage('Use at least 12 characters.');return;}if(password!==confirm){setMessage('Passwords do not match.');return;}setMessage('Saving password…');const {error}=await supabase.auth.updateUser({password});if(error){setMessage(error.message);return;}window.location.href='/epcr/dashboard';}
  return <main className="min-h-screen bg-slate-950 p-6"><form onSubmit={save} className="mx-auto mt-20 max-w-md rounded-3xl bg-white p-8"><h1 className="text-3xl font-black">Create your password</h1><p className="mt-2 text-slate-600">Choose a private password for your ePCR account. Apollo administrators cannot view it.</p>{sessionState==='checking'&&<p className="mt-6 rounded-xl bg-slate-100 p-4 font-bold">Verifying your secure link…</p>}{sessionState==='ready'&&<><input required type="password" placeholder="New password" className="mt-6 w-full rounded-xl border p-3" value={password} onChange={(e)=>setPassword(e.target.value)}/><input required type="password" placeholder="Confirm password" className="mt-3 w-full rounded-xl border p-3" value={confirm} onChange={(e)=>setConfirm(e.target.value)}/><button className="mt-5 w-full rounded-xl bg-blue-700 p-3 font-black text-white">Save password</button></>}{sessionState==='invalid'&&<a href="/epcr/login" className="mt-6 block rounded-xl bg-blue-700 p-3 text-center font-black text-white">Return to ePCR sign in</a>}{message&&<p className="mt-4 text-sm font-bold text-red-700">{message}</p>}</form></main>;
}
