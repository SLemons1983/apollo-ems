import { redirect } from 'next/navigation';
import { currentEpcrMembership, epcrAdminClient } from '@/lib/epcrServer';

export default async function SubmittedReportsPage() {
  const access = await currentEpcrMembership();
  if (!access) redirect('/epcr-account/login');
  if (!['PRIMARY_ADMIN', 'ADMIN', 'REVIEWER'].includes(access.membership.role)) redirect('/epcr-dashboard');
  const db = epcrAdminClient();
  const { data: reports } = await db.from('epcr_reports')
    .select('id,report_number,incident_number,patient_display,status,submitted_at,revision,epcr_memberships!epcr_reports_submitted_by_membership_id_fkey(first_name,last_name,username)')
    .eq('agency_id', access.membership.agency_id).eq('status', 'SUBMITTED').order('submitted_at', { ascending: true });

  return <main className="min-h-screen bg-gradient-to-br from-[#071632] via-[#0b3f78] to-[#0795e6] px-4 py-8 text-slate-900 sm:px-6">
    <div className="mx-auto max-w-6xl">
      <header className="rounded-3xl bg-white p-6 shadow-2xl sm:p-8">
        <a href="/epcr-dashboard" className="font-black text-blue-700 hover:text-blue-900">&larr; ePCR Dashboard</a>
        <h1 className="mt-4 text-3xl font-black text-slate-950">Submitted Reports</h1>
        <p className="mt-2 text-slate-600">Reports awaiting agency review. Open a report to review the clinician&apos;s documentation.</p>
      </header>
      <section className="mt-6 space-y-4">
        {!reports?.length && <div className="rounded-3xl bg-white p-8 text-center font-semibold text-slate-600 shadow-xl">No reports are awaiting review.</div>}
        {reports?.map((report) => {
          const memberRaw = report.epcr_memberships as unknown;
          const member = (Array.isArray(memberRaw) ? memberRaw[0] : memberRaw) as { first_name?: string; last_name?: string; username?: string } | null;
          return <a key={report.id} href={`/epcr-dashboard/reports/${report.id}`} className="grid gap-4 rounded-3xl border border-white/60 bg-white p-6 shadow-xl transition hover:-translate-y-0.5 hover:border-blue-300 md:grid-cols-[1.2fr_1fr_auto] md:items-center">
            <div><p className="text-xs font-black uppercase tracking-wide text-blue-700">Report {report.report_number} &middot; Revision {report.revision}</p><h2 className="mt-1 text-xl font-black text-slate-950">{report.patient_display}</h2><p className="mt-1 text-sm text-slate-600">Incident {report.incident_number || 'not entered'}</p></div>
            <div><p className="font-bold text-slate-900">{member ? `${member.first_name} ${member.last_name}` : 'Submitting clinician'}</p><p className="text-sm text-slate-600">{new Date(report.submitted_at).toLocaleString()}</p></div>
            <span className="rounded-xl bg-blue-700 px-4 py-2 text-center font-black text-white">Open Report</span>
          </a>;
        })}
      </section>
    </div>
  </main>;
}
