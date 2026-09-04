import Image from 'next/image';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import EpcrSignOutButton from '@/components/epcr/EpcrSignOutButton';
import EpcrAgencySwitcher from '@/components/epcr/EpcrAgencySwitcher';
import { currentEpcrMembership, epcrAdminClient } from '@/lib/epcrServer';

export default async function EpcrDashboard() {
  const access = await currentEpcrMembership();
  if (!access) redirect('/epcr/login');
  const membership = access.membership;
  const agency = Array.isArray(membership.apollo_agencies) ? membership.apollo_agencies[0] : membership.apollo_agencies;
  const agencyOptions = access.memberships.map((item) => {
    const itemAgency = Array.isArray(item.apollo_agencies) ? item.apollo_agencies[0] : item.apollo_agencies;
    return { agencyId: item.agency_id, name: itemAgency?.name ?? 'Agency ePCR', role: item.role };
  });
  const db = epcrAdminClient();
  const [{ count: myReportCount }, { count: submittedCount }] = await Promise.all([
    db.from('epcr_reports').select('id', { count: 'exact', head: true }).eq('agency_id', membership.agency_id).eq('submitted_by_membership_id', membership.id),
    db.from('epcr_reports').select('id', { count: 'exact', head: true }).eq('agency_id', membership.agency_id).eq('status', 'SUBMITTED'),
  ]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#071632] via-[#0b3f78] to-[#0795e6] px-4 py-8 text-slate-900 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <header className="rounded-3xl border border-white/50 bg-white p-6 shadow-2xl sm:p-8">
          <div className="flex flex-wrap items-start justify-between gap-5">
            <div className="flex items-center gap-4">
              <Image src="/apollo-logo.png" alt="Apollo EMS Management" width={92} height={92} priority className="h-20 w-20 object-contain" />
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-blue-700">{agency?.name ?? 'Agency ePCR'}</p>
                <h1 className="mt-1 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Welcome, {membership.first_name}</h1>
                <p className="mt-2 text-sm font-semibold text-slate-600">{membership.role.replaceAll('_', ' ')} &middot; @{membership.username}</p>
              </div>
            </div>
            <div className="flex flex-wrap items-end gap-3">
              <EpcrAgencySwitcher currentAgencyId={membership.agency_id} agencies={agencyOptions} />
              <EpcrSignOutButton />
            </div>
          </div>
        </header>

        <section className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <a href="/ePCR" className="rounded-3xl border border-blue-300/30 bg-gradient-to-br from-[#0b1f4d] to-[#0878d1] p-7 text-white shadow-xl transition hover:-translate-y-0.5 hover:brightness-110">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-100">Patient care report</p>
            <h2 className="mt-3 text-xl font-black text-white">Start new ePCR</h2>
            <p className="mt-2 leading-6 text-blue-100">Open the current Apollo report editor.</p>
          </a>
          <Link href="/epcr-dashboard/my-reports" className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">{myReportCount ?? 0} total</p>
            <h2 className="mt-3 text-xl font-black text-slate-950">My reports</h2>
            <p className="mt-2 leading-6 text-slate-600">Track report status and reviewer messages.</p>
          </Link>
          {membership.role !== 'CLINICIAN' && <Link href="/epcr-dashboard/reports" className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">{submittedCount ?? 0} awaiting review</p>
            <h2 className="mt-3 text-xl font-black text-slate-950">Submitted Reports</h2>
            <p className="mt-2 leading-6 text-slate-600">Open reports, mark them completed, or return them for corrections.</p>
          </Link>}
          {['PRIMARY_ADMIN', 'ADMIN'].includes(membership.role) && <a href="/epcr-dashboard/users" className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl transition hover:-translate-y-0.5 hover:border-blue-300 hover:shadow-2xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Agency administration</p>
            <h2 className="mt-3 text-xl font-black text-slate-950">Manage users</h2>
            <p className="mt-2 leading-6 text-slate-600">Add administrators, instructors, reviewers, clinicians, and students.</p>
          </a>}
        </section>
      </div>
    </main>
  );
}
