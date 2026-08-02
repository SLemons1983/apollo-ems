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
  return <button type="button" disabled={working} onClick={() => void signOut()} className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2 font-black text-blue-800 shadow-sm transition hover:bg-blue-100 disabled:opacity-50">{working ? 'Signing out...' : 'Sign out'}</button>;
}
