'use client';

import { useEffect, useState } from 'react';
import type { AgencyRecord } from '@/lib/adminAgencies';
import AgencyForm from './AgencyForm';
import EpcrAccessManager from './EpcrAccessManager';

export default function AgencyEditor({ id }: { id: string }) {
  const [agency, setAgency] = useState<AgencyRecord | null>(null), [error, setError] = useState('');
  useEffect(() => { fetch(`/api/admin/agencies/${id}`).then(async (response) => { const result = await response.json(); if (!response.ok) throw new Error(result.error); setAgency(result.agency); }).catch((reason) => setError(reason.message)); }, [id]);
  if (error) return <div className="rounded-3xl bg-red-50 p-6 font-bold text-red-800">{error}</div>;
  if (!agency) return <div className="rounded-3xl bg-white p-8 shadow-sm">Loading agency…</div>;
  return <><AgencyForm agency={agency} /><EpcrAccessManager agencyId={agency.id} enabled={agency.enabled_modules.includes('ePCR Beta')} /></>;
}
