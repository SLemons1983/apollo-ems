import Link from 'next/link';

const modules = [
  { title: 'Agency Management', detail: 'View organizations, onboarding status, and enabled platform modules.', href: '/admin/agencies', status: 'Foundation ready' },
  { title: 'Platform Access', detail: 'Owner identities and future Apollo support-administrator access.', status: 'Owner-only' },
  { title: 'Subscriptions', detail: 'Future plans, billing state, trials, and contract milestones.', status: 'Planned' },
  { title: 'Platform Health', detail: 'Future deployment, integration, notification, and service visibility.', status: 'Planned' },
];

export default function AdminPage() {
  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[2rem] bg-gradient-to-br from-[#071632] via-[#0b3f78] to-[#0795e6] p-8 text-white shadow-xl sm:p-12">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-sky-200">Apollo owner dashboard</p>
        <h1 className="mt-4 max-w-3xl text-4xl font-black tracking-tight sm:text-5xl">Manage the platform without entering an agency workspace.</h1>
        <p className="mt-5 max-w-3xl text-lg leading-8 text-blue-100">This is ApolloEMS&apos;s separate control plane for organizations, access, commercialization, and platform oversight. Sequoia&apos;s operational tools remain isolated and unchanged.</p>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        {[['Organizations','1','Current operational tenant'],['External beta organizations','0','None publicly onboarded'],['Platform status','Foundation','Read-only administration']].map(([label,value,detail]) => (
          <div key={label} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><p className="text-sm font-bold text-slate-500">{label}</p><p className="mt-2 text-3xl font-black text-slate-950">{value}</p><p className="mt-2 text-sm text-slate-600">{detail}</p></div>
        ))}
      </section>

      <section>
        <div className="mb-5"><p className="text-sm font-bold uppercase tracking-widest text-blue-700">Platform controls</p><h2 className="mt-2 text-3xl font-black">Owner workspace</h2></div>
        <div className="grid gap-5 md:grid-cols-2">
          {modules.map((module) => {
            const content = <><div className="flex items-start justify-between gap-4"><h3 className="text-xl font-black">{module.title}</h3><span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-800">{module.status}</span></div><p className="mt-3 leading-7 text-slate-600">{module.detail}</p>{module.href && <p className="mt-5 font-bold text-blue-700">Open module →</p>}</>;
            return module.href ? <Link key={module.title} href={module.href} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">{content}</Link> : <div key={module.title} className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">{content}</div>;
          })}
        </div>
      </section>
    </div>
  );
}
