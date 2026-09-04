'use client';

import { useState } from 'react';

type AgencyOption = { agencyId: string; name: string; role: string };

export default function EpcrAgencySwitcher({ currentAgencyId, agencies }: { currentAgencyId: string; agencies: AgencyOption[] }) {
  const [working, setWorking] = useState(false);
  if (agencies.length <= 1) return null;

  async function changeAgency(agencyId: string) {
    if (agencyId === currentAgencyId) return;
    setWorking(true);
    const response = await fetch('/api/epcr/session', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agency_id: agencyId }) });
    if (response.ok) window.location.href = '/epcr-dashboard';
    else setWorking(false);
  }

  return (
    <label className="block min-w-[220px] text-xs font-black uppercase tracking-[0.12em] text-slate-500">
      Active agency
      <select disabled={working} value={currentAgencyId} onChange={(event) => void changeAgency(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-bold normal-case tracking-normal text-slate-900 disabled:opacity-60">
        {agencies.map((agency) => <option key={agency.agencyId} value={agency.agencyId}>{agency.name} — {agency.role.replaceAll('_', ' ')}</option>)}
      </select>
    </label>
  );
}
