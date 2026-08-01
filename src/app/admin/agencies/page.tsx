import Link from 'next/link';

export default function AgenciesPage() {
  return (
    <div className="space-y-8">
      <header className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div><p className="text-sm font-bold uppercase tracking-widest text-blue-700">Platform organizations</p><h1 className="mt-2 text-4xl font-black tracking-tight">Agencies</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">A read-only foundation for tenant onboarding and lifecycle management. Agency creation and database changes are intentionally not enabled yet.</p></div>
        <span className="w-fit rounded-full bg-amber-100 px-4 py-2 text-sm font-bold text-amber-900">Read-only foundation</span>
      </header>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-6 py-5"><h2 className="text-xl font-black">Current organizations</h2></div>
        <div className="p-6">
          <div className="grid gap-5 rounded-2xl border border-slate-200 bg-slate-50 p-5 md:grid-cols-[1.5fr_1fr_1fr_auto] md:items-center">
            <div><p className="text-lg font-black">Sequoia Safety Council</p><p className="mt-1 text-sm text-slate-600">Existing operational environment</p></div>
            <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Organization type</p><p className="mt-1 font-semibold">EMS Agency</p></div>
            <div><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Status</p><p className="mt-1 font-semibold text-emerald-700">Operational</p></div>
            <Link href="/dashboard" className="rounded-xl border border-slate-300 bg-white px-4 py-2 text-center text-sm font-bold text-slate-800 hover:bg-slate-100">Open SSC</Link>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-dashed border-blue-300 bg-blue-50 p-6"><h2 className="text-xl font-black text-blue-950">Next agency-management release</h2><p className="mt-3 max-w-4xl leading-7 text-blue-900">We will define the multi-tenant data model and onboarding workflow before enabling Create Agency. Planned records include organization identity, type, lifecycle status, contacts, access domains, enabled modules, beta participation, protocol configuration, and readiness milestones.</p></section>
    </div>
  );
}
