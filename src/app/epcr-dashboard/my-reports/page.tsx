import { redirect } from 'next/navigation';
import { currentEpcrMembership, epcrAdminClient } from '@/lib/epcrServer';

const styles: Record<string, string> = { SUBMITTED: 'bg-blue-100 text-blue-800', COMPLETED: 'bg-emerald-100 text-emerald-800', REJECTED: 'bg-red-100 text-red-800' };

export default async function MyReportsPage() {
  const access = await currentEpcrMembership();
  if (!access) redirect('/epcr-account/login');
  const db = epcrAdminClient();
  const { data: reports } = await db.from('epcr_reports').select('id,report_number,incident_number,patient_display,status,submitted_at,reviewer_message,revision')
    .eq('agency_id', access.membership.agency_id).eq('submitted_by_membership_id', access.membership.id).order('submitted_at', { ascending: false });

  return <main className="min-h-screen bg-gradient-to-br from-[#071632] via-[#0b3f78] to-[#0795e6] px-4 py-8 text-slate-900 sm:px-6"><div className="mx-auto max-w-5xl">
    <header className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8"><a href="/epcr-dashboard" className="font-black text-blue-700">&larr; ePCR Dashboard</a><h1 className="mt-4 text-3xl font-black text-slate-950">My Reports</h1><p className="mt-2 text-slate-600">Track submitted reports and reviewer feedback.</p></header>
    <section className="mt-6 space-y-4">
      {!reports?.length && <div className="rounded-3xl bg-white p-8 text-center text-slate-600 shadow-xl">You have not submitted any reports.</div>}
      {reports?.map((report) => <article key={report.id} className="rounded-3xl bg-white p-6 shadow-xl"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-black uppercase text-blue-700">Report {report.report_number} &middot; Revision {report.revision}</p><h2 className="mt-1 text-xl font-black text-slate-950">{report.patient_display}</h2><p className="mt-1 text-sm text-slate-600">Submitted {new Date(report.submitted_at).toLocaleString()}</p></div><span className={`rounded-full px-3 py-1 text-xs font-black ${styles[report.status]}`}>{report.status === 'SUBMITTED' ? 'AWAITING REVIEW' : report.status}</span></div>{report.reviewer_message && <div className={`mt-5 rounded-2xl p-4 ${report.status === 'REJECTED' ? 'bg-red-50 text-red-900' : 'bg-blue-50 text-blue-900'}`}><p className="text-xs font-black uppercase">Reviewer message</p><p className="mt-1 whitespace-pre-wrap text-sm">{report.reviewer_message}</p></div>}{report.status === 'REJECTED' && <p className="mt-4 text-sm font-bold text-red-700">Corrections are required. Open your saved local ePCR file, make the corrections, and resubmit using the same report number.</p>}</article>)}
    </section>
  </div></main>;
}
