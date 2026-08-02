import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import ReportChartViewer from '@/components/epcr/ReportChartViewer';
import ReportReviewActions from '@/components/epcr/ReportReviewActions';
import { currentEpcrMembership, epcrAdminClient } from '@/lib/epcrServer';

export default async function ReportReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await currentEpcrMembership();
  if (!access) redirect('/epcr-account/login');
  if (!['PRIMARY_ADMIN', 'ADMIN', 'REVIEWER'].includes(access.membership.role)) redirect('/epcr-dashboard');
  const { id } = await params;
  const db = epcrAdminClient();
  const { data: report } = await db.from('epcr_reports').select('*').eq('id', id).eq('agency_id', access.membership.agency_id).maybeSingle();
  if (!report) notFound();

  return <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-900 sm:px-6">
    <div className="mx-auto max-w-7xl">
      <header className="rounded-3xl bg-gradient-to-r from-[#071632] to-[#0878d1] p-6 text-white shadow-2xl sm:p-8">
        <Link href="/epcr-dashboard/reports" className="font-black text-blue-100 hover:text-white">&larr; Submitted Reports</Link>
        <p className="mt-5 text-xs font-black uppercase tracking-[0.18em] text-blue-100">Read-only agency review</p>
        <h1 className="mt-2 text-3xl font-black">Report {report.report_number}</h1>
        <p className="mt-2 text-blue-100">{report.patient_display} &middot; Revision {report.revision} &middot; Submitted {new Date(report.submitted_at).toLocaleString()}</p>
      </header>
      <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <ReportChartViewer chart={report.chart as Record<string, unknown>} />
        <aside className="xl:sticky xl:top-6 xl:self-start">{report.status === 'SUBMITTED' ? <ReportReviewActions reportId={report.id} /> : <div className="rounded-3xl bg-white p-6 shadow-xl"><h2 className="text-xl font-black">Review complete</h2><p className="mt-2 text-slate-600">This report is {String(report.status).toLowerCase()}.</p></div>}</aside>
      </div>
    </div>
  </main>;
}
