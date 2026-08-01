'use client';

import { useEffect } from 'react';

export default function LegacySetupPassword() {
  useEffect(() => {
    window.location.replace(`/epcr/setup-password${window.location.search}${window.location.hash}`);
  }, []);

  return <main className="min-h-screen bg-slate-950 p-6 text-center text-white">Opening secure password setup…</main>;
}
