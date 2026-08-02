import { redirect } from 'next/navigation';
import { currentEpcrMembership } from '@/lib/epcrServer';
import EPCRClient from './components/EPCRClient';

export default async function EPCRPage() {
  const access = await currentEpcrMembership();
  if (!access) redirect('/epcr-account/login');

  const agency = Array.isArray(access.membership.apollo_agencies)
    ? access.membership.apollo_agencies[0]
    : access.membership.apollo_agencies;

  const hasActiveMembership = access.membership.status === 'ACTIVE';
  const hasEpcrModule = agency?.enabled_modules?.includes('ePCR Beta') === true;

  if (!hasActiveMembership || !hasEpcrModule) redirect('/epcr-dashboard');

  return <EPCRClient />;
}
