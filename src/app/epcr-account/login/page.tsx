'use client';

import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function EpcrLogin() {
  const [email,setEmail]=useState(''),[password,setPassword]=useState(''),[message,setMessage]=useState('');
  async function submit(e:FormEvent){e.preventDefault();setMessage('Signing in…');const {error}=await supabase.auth.signInWithPassword({email,password});if(error){setMessage(error.message);return;}window.location.href='/epcr/dashboard';}
  async function reset(){if(!email){setMessage('Enter your email first.');return;}const {error}=await supabase.auth.resetPasswordForEmail(email,{redirectTo:`${window.location.origin}/epcr/setup-password`});setMessage(error?.message ?? 'Password reset link sent.');}
  return <main className="min-h-screen bg-slate-950 p-6 text-slate-900"><form onSubmit={submit} className="mx-auto mt-20 max-w-md rounded-3xl bg-white p-8 shadow-2xl"><h1 className="text-3xl font-black">Apollo ePCR</h1><p className="mt-2 text-slate-600">Agency administrator, instructor, and clinician access</p><input required type="email" placeholder="Email" className="mt-6 w-full rounded-xl border p-3" value={email} onChange={(e)=>setEmail(e.target.value)}/><input required type="password" placeholder="Password" className="mt-3 w-full rounded-xl border p-3" value={password} onChange={(e)=>setPassword(e.target.value)}/><button className="mt-5 w-full rounded-xl bg-blue-700 p-3 font-black text-white">Sign in</button><button type="button" onClick={reset} className="mt-4 w-full font-bold text-blue-700">Send password reset link</button>{message&&<p className="mt-4 rounded-xl bg-slate-100 p-3 text-sm font-bold">{message}</p>}</form></main>;
}
