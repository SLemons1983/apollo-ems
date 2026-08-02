import { notFound, redirect } from 'next/navigation';
import EPCRClient from '@/app/ePCR/components/EPCRClient';
import { currentEpcrMembership, epcrAdminClient } from '@/lib/epcrServer';

export default async function ReportReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const access = await currentEpcrMembership(true);
  if (!access) redirect('/epcr-account/login');
  if (!['PRIMARY_ADMIN', 'ADMIN', 'REVIEWER'].includes(access.membership.role)) redirect('/epcr-dashboard');
  const { id } = await params;
  const db = epcrAdminClient();
  const { data: report } = await db.from('epcr_reports').select('*').eq('id', id).eq('agency_id', access.membership.agency_id).maybeSingle();
  if (!report) notFound();

  return <EPCRClient initialReport={{ id: report.id, status: report.status, chart: report.chart as Record<string, unknown> }} reviewMode reviewStatus={report.status} />;
}
