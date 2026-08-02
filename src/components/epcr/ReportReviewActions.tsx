'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function ReportReviewActions({ reportId }: { reportId: string }) {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function review(action: 'COMPLETE' | 'REJECT') {
    if (action === 'REJECT' && !message.trim()) {
      setError('Enter the corrections required before rejecting this report.');
      return;
    }
    setBusy(true); setError('');
    const response = await fetch('/api/epcr/reports', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ report_id: reportId, action, message }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) { setError(result.error ?? 'Unable to update report.'); setBusy(false); return; }
    router.push('/epcr-dashboard/reports');
    router.refresh();
  }

  return <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl">
    <h2 className="text-xl font-black text-slate-950">Review decision</h2>
    <p className="mt-2 text-sm leading-6 text-slate-600">A completion message is optional. A rejection message is required and will tell the clinician what must be corrected.</p>
    <label className="mt-5 block text-sm font-bold text-slate-800">Message to submitting clinician</label>
    <textarea value={message} onChange={(event) => setMessage(event.target.value)} rows={5} maxLength={2000} disabled={busy}
      className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-950 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
      placeholder="Optional for completion; required for rejection" />
    {error && <p className="mt-3 rounded-xl bg-red-50 p-3 text-sm font-bold text-red-700">{error}</p>}
    <div className="mt-5 flex flex-wrap gap-3">
      <button type="button" disabled={busy} onClick={() => review('COMPLETE')} className="rounded-xl bg-emerald-600 px-5 py-3 font-black text-white hover:bg-emerald-700 disabled:opacity-50">Mark Completed</button>
      <button type="button" disabled={busy} onClick={() => review('REJECT')} className="rounded-xl bg-red-600 px-5 py-3 font-black text-white hover:bg-red-700 disabled:opacity-50">Reject</button>
    </div>
  </div>;
}
