'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function MyReportActions({ reportId, reportNumber, status }: { reportId: string; reportNumber: string; status: string }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  async function deleteReport() {
    const completedWarning = status === 'COMPLETED'
      ? '\n\nIf you have not downloaded the completed PDF, cancel and download it first.'
      : '';
    if (!window.confirm(`Permanently delete report ${reportNumber}? This cannot be undone.${completedWarning}`)) return;
    setDeleting(true);
    setError('');
    try {
      const response = await fetch(`/api/epcr/reports?id=${encodeURIComponent(reportId)}`, { method: 'DELETE' });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? 'Unable to delete report.');
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete report.');
      setDeleting(false);
    }
  }

  return <div className="mt-5 flex flex-wrap items-center gap-3">
    {['DRAFT', 'REJECTED'].includes(status) && <a href={`/ePCR?report=${reportId}`} className={`inline-flex rounded-xl px-4 py-2 text-sm font-black text-white ${status === 'REJECTED' ? 'bg-red-700 hover:bg-red-800' : 'bg-blue-700 hover:bg-blue-800'}`}>{status === 'REJECTED' ? 'Open & Correct' : 'Continue Draft'}</a>}
    {status === 'COMPLETED' && <a href={`/api/epcr/reports/${reportId}/pdf`} download className="inline-flex rounded-xl bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-800">Download Report</a>}
    <button type="button" disabled={deleting} onClick={() => void deleteReport()} className="rounded-xl border border-red-300 bg-white px-4 py-2 text-sm font-black text-red-700 hover:bg-red-50 disabled:cursor-wait disabled:opacity-60">{deleting ? 'Deleting…' : 'Delete Report'}</button>
    {error && <p className="w-full text-sm font-semibold text-red-700">{error}</p>}
  </div>;
}
