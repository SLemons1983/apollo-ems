import { redirect } from 'next/navigation';
import AgencyUserManager from '@/components/epcr/AgencyUserManager';
import { currentEpcrMembership } from '@/lib/epcrServer';

export default async function AgencyUsersPage() {
  const access = await currentEpcrMembership();
  if (!access) redirect('/epcr/login');
  if (!['PRIMARY_ADMIN', 'ADMIN'].includes(access.membership.role)) redirect('/epcr-dashboard');
  return <AgencyUserManager/>;
}
