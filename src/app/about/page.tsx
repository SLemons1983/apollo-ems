import PublicSiteShell, { PublicHero } from '@/components/PublicSiteShell';

export default function AboutPage() {
  return <PublicSiteShell>
    <PublicHero eyebrow="About ApolloEMS" title="Built from inside EMS." description="ApolloEMS was conceived, designed, and built by a working EMS professional with nearly two decades of experience in emergency medical services." />
    <main className="px-5 py-16 sm:py-20"><div className="mx-auto max-w-5xl">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-12">
        <p className="apollo-kicker">The story behind the platform</p>
        <h2 className="mt-4 text-3xl font-black tracking-[-0.03em] sm:text-4xl">Built by someone who understands the operation because he still works in it.</h2>
        <div className="mt-7 space-y-5 text-lg leading-8 text-slate-600">
          <p>ApolloEMS was created by a working EMS professional with nearly two decades of experience in emergency medical services. The platform grew from firsthand experience with the realities of field operations and agency management: staffing an ambulance service, maintaining readiness, tracking credentials, managing vehicles and equipment, coordinating supervisors, documenting work, and keeping an operation moving around the clock.</p>
          <p>That experience shaped a simple idea: EMS agencies should not have to assemble their operation from disconnected software, spreadsheets, paper processes, and systems designed for other industries.</p>
          <p>ApolloEMS was designed as a comprehensive EMS operations platform—one environment where workforce management, administrative operations, dispatch, field workflows, and clinical documentation can work together around the same agency.</p>
        </div>
      </section>
      <section className="mt-8 grid gap-6 md:grid-cols-3">
        {[['EMS experience','Nearly two decades in EMS.','ApolloEMS is informed by years of field, supervisory, and operational experience—not assumptions about how an EMS agency should work.'],['Operational perspective','Designed around real workflows.','The platform reflects the connections between people, schedules, credentials, vehicles, equipment, supervisors, dispatch, crews, and documentation.'],['Still connected','Built by a working EMS professional.','ApolloEMS continues to be shaped by current EMS operations, keeping product decisions grounded in the environment the software is built to serve.']].map(([k,h,p])=><div key={k} className="rounded-3xl border border-slate-200 bg-white p-7"><p className="text-sm font-black uppercase tracking-[.16em] text-blue-700">{k}</p><h3 className="mt-4 text-2xl font-black">{h}</h3><p className="mt-4 leading-7 text-slate-600">{p}</p></div>)}
      </section>
      <section className="mt-8 rounded-[2rem] bg-[#071a36] p-8 text-white sm:p-12"><p className="text-sm font-black uppercase tracking-[.18em] text-sky-300">The ApolloEMS philosophy</p><h2 className="mt-4 max-w-3xl text-3xl font-black tracking-[-0.03em] sm:text-4xl">Give EMS leaders one place to see the operation and the tools to manage it.</h2><p className="mt-6 max-w-3xl text-lg leading-8 text-slate-300">Management time is valuable. ApolloEMS is built to reduce fragmented administrative work, eliminate unnecessary handoffs, improve operational visibility, and allow agencies to accomplish more with the people they already have.</p></section>
    </div></main>
  </PublicSiteShell>;
}
