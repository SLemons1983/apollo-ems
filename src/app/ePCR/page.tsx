import { redirect } from 'next/navigation';
import { currentEpcrMembership, epcrAdminClient } from '@/lib/epcrServer';
import EPCRClient from './components/EPCRClient';

export default async function EPCRPage({ searchParams }: { searchParams: Promise<{ report?: string }> }) {
  const access = await currentEpcrMembership(true);
  if (!access) redirect('/epcr-account/login');

  const agency = Array.isArray(access.membership.apollo_agencies)
    ? access.membership.apollo_agencies[0]
    : access.membership.apollo_agencies;

  const hasActiveMembership = access.membership.status === 'ACTIVE';
  const hasEpcrModule = agency?.enabled_modules?.includes('ePCR Beta') === true;

  if (!hasActiveMembership || !hasEpcrModule) redirect('/epcr-dashboard');

  const { report: reportId } = await searchParams;
  type InitialReport = { id: string; status: 'DRAFT' | 'REJECTED'; chart: Record<string, unknown> };
  let initialReport: InitialReport | null = null;
  if (reportId) {
    const { data } = await epcrAdminClient().from('epcr_reports')
      .select('id,status,chart')
      .eq('id', reportId)
      .eq('agency_id', access.membership.agency_id)
      .eq('submitted_by_membership_id', access.membership.id)
      .in('status', ['DRAFT', 'REJECTED'])
      .maybeSingle();
    if (data) initialReport = data as InitialReport;
  }

  return <EPCRClient initialReport={initialReport} />;
}
