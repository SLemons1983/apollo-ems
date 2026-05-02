import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 md:px-6">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="inline-flex rounded-full bg-slate-900 px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white">
              Apollo EMS
            </div>

            <h1 className="mt-6 text-3xl font-bold tracking-tight text-slate-900 md:text-5xl">
              EMS workforce management for Sequoia Safety Council.
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              ApolloEMS is the secure home for employee dashboards, schedules, timecards, messaging, announcements, and supervisor tools.
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold text-slate-900">Employees</div>
                <div className="mt-1 text-xs text-slate-600">View assigned shifts, messages, links, and timecards.</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold text-slate-900">Supervisors</div>
                <div className="mt-1 text-xs text-slate-600">Review timecards, open schedule tools, and manage operations.</div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-sm font-bold text-slate-900">Scheduling</div>
                <div className="mt-1 text-xs text-slate-600">Manage pay-period schedules and employee assignments.</div>
              </div>
            </div>
          </section>

          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm md:p-8">
            <div className="text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-900 text-xl font-black text-white">
                A
              </div>

              <h2 className="mt-5 text-2xl font-bold tracking-tight text-slate-900">Sign in to ApolloEMS</h2>

              <p className="mt-2 text-sm leading-6 text-slate-600">
                Use your company-issued Google Workspace email to access your dashboard.
              </p>
            </div>

            <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
              Google Workspace login will be connected through Supabase Auth. For this deployment test, continue directly to the employee dashboard.
            </div>

            <div className="mt-6 space-y-3">
              <Link
                href="/dashboard"
                className="flex w-full items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
              >
                Continue to Dashboard
              </Link>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600">
                After Google login is enabled, all users will land on <span className="font-bold text-slate-800">/dashboard</span>. Employees with Supervisor, Admin, or GM access will see an <span className="font-bold text-slate-800">Open Supervisor Dashboard</span> button that links to <span className="font-bold text-slate-800">/supervisor</span>.
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
