'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function EpcrSignOutButton() {
  const [working, setWorking] = useState(false);
  async function signOut() {
    setWorking(true);
    await supabase.auth.signOut({ scope: 'local' });
    window.location.replace('/epcr/login');
  }
  return <button type="button" disabled={working} onClick={() => void signOut()} className="rounded-xl border border-slate-300 bg-white px-4 py-2 font-black text-slate-700 shadow-sm disabled:opacity-50">{working ? 'Signing out…' : 'Sign out'}</button>;
}
