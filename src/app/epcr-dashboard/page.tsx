import Image from 'next/image';
import { redirect } from 'next/navigation';
import EpcrSignOutButton from '@/components/epcr/EpcrSignOutButton';
import { currentEpcrMembership } from '@/lib/epcrServer';

export default async function EpcrDashboard() {
  const access = await currentEpcrMembership();
  if (!access) redirect('/epcr/login');
  const membership = access.membership;
  const agency = Array.isArray(membership.apollo_agencies) ? membership.apollo_agencies[0] : membership.apollo_agencies;

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
            <EpcrSignOutButton />
          </div>
        </header>

        <section className="mt-6 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          <a href="/ePCR" className="rounded-3xl border border-blue-300/30 bg-gradient-to-br from-[#0b1f4d] to-[#0878d1] p-7 text-white shadow-xl transition hover:-translate-y-0.5 hover:brightness-110">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-100">Patient care report</p>
            <h2 className="mt-3 text-xl font-black text-white">Start new ePCR</h2>
            <p className="mt-2 leading-6 text-blue-100">Open the current Apollo report editor.</p>
          </a>
          <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Coming next</p>
            <h2 className="mt-3 text-xl font-black text-slate-950">My reports</h2>
            <p className="mt-2 leading-6 text-slate-600">Report saving and submission arrive in the next controlled release.</p>
          </div>
          {membership.role !== 'CLINICIAN' && <div className="rounded-3xl border border-slate-200 bg-white p-7 shadow-xl">
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Clinical oversight</p>
            <h2 className="mt-3 text-xl font-black text-slate-950">Review queue</h2>
            <p className="mt-2 leading-6 text-slate-600">Correction, completion, and feedback workflow arrives after secure report storage.</p>
          </div>}
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
