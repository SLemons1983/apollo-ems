import Link from 'next/link';
import PublicSiteShell from '@/components/PublicSiteShell';

const areas = [
  ['01','Workforce','People, schedules, time and compliance.',['Scheduling & staffing','Open shifts & vacation requests','Timecards & payroll review','Employee profiles','Certification tracking','Continuing education'],''],
  ['02','Operations','Administrative work that keeps an agency ready.',['Fleet management','Daily unit inspections','Inventory control','Incident reporting','Announcements & messaging','Operational oversight'],''],
  ['03','Dispatch','A connected view of units, crews and calls.',['CAD operations','Unit & crew management','Resource status','Call assignment','Status history','Post assignments'],'In active development'],
  ['04','Field Operations','Connected operational information in the ambulance.',['MDT workflow','Mapping & navigation','Unit status controls','Destination workflow','Posting','Crew connectivity'],'In active development'],
  ['05','Clinical','Clinical documentation across the EMS lifecycle.',['ePCR','Structured documentation','Clinical workflows','Education environment','Protocol-informed tools','Reporting foundation'],'Private beta'],
] as const;

const connections = [
  ['Employee','Schedule','Timekeeping','Compliance'],
  ['Vehicle','Inspection','Fleet','Unit'],
  ['Crew','CAD','MDT','Patient care'],
];

export default function Home() {
  return <PublicSiteShell><main>
    <section className="relative overflow-hidden bg-[#06142d] px-5 pb-20 pt-20 text-white lg:pb-24 lg:pt-20">
      <div className="apollo-grid absolute inset-0 opacity-30" />
      <div className="absolute -right-24 top-20 h-96 w-96 rounded-full bg-sky-500/20 blur-3xl" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[.98fr_1.02fr]">
        <div>
          <div className="mb-5 flex">
            <div className="flex h-44 w-44 items-center justify-center overflow-hidden rounded-[2.1rem] bg-white p-2 shadow-2xl ring-1 ring-white/20 sm:h-48 sm:w-48 lg:h-52 lg:w-52">
              <img src="/apollo-logo.png" alt="ApolloEMS" className="h-full w-full object-contain" />
            </div>
          </div>
          <h1 className="mt-7 text-5xl font-black leading-[.98] tracking-[-0.045em] sm:text-6xl lg:text-7xl">One platform.<br/><span className="text-sky-300">Your entire EMS operation.</span></h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-slate-200 sm:text-xl">ApolloEMS connects workforce, operations, dispatch, field crews, and clinical documentation in one integrated system built around the way EMS actually works.</p>
          <div className="mt-9 flex flex-wrap gap-3"><Link href="/contact" className="rounded-2xl bg-sky-400 px-6 py-4 font-bold text-[#06142d] hover:bg-sky-300">Request a Demo</Link><Link href="/features" className="rounded-2xl border border-white/25 bg-white/5 px-6 py-4 font-bold hover:bg-white/10">Explore the Platform</Link></div>
          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-sm font-semibold text-slate-300"><span>Purpose-built for EMS</span><span>Connected workflows</span><span>Role-based operations</span></div>
        </div>
        <div className="relative rounded-[2rem] border border-white/15 bg-white/[.07] p-4 shadow-2xl backdrop-blur">
          <div className="rounded-[1.5rem] border border-white/10 bg-[#0a1d3d] p-6">
            <div className="border-b border-white/10 pb-5">
              <div className="flex items-center gap-4 rounded-2xl border border-sky-300/25 bg-gradient-to-r from-sky-400/10 to-blue-500/5 px-4 py-3 shadow-inner">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-white p-1.5 shadow-lg sm:h-16 sm:w-16">
                  <img src="/apollo-logo.png" alt="ApolloEMS logo" className="h-full w-full object-contain" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black uppercase tracking-[.2em] text-sky-300">ApolloEMS</p>
                  <p className="mt-1 text-sm font-black uppercase leading-tight tracking-[.06em] text-white sm:text-base">Comprehensive EMS Operations Platform</p>
                </div>
              </div>
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {areas.map(([,title,summary,features,badge]) => <details key={title} className={`group rounded-2xl border border-white/10 bg-white/[.055] transition open:border-sky-300/30 open:bg-sky-300/[.08] hover:border-sky-300/25 ${title==='Clinical'?'sm:col-span-2':''}`}>
                <summary className="cursor-pointer list-none p-4 [&::-webkit-details-marker]:hidden"><div className="flex justify-between gap-3"><p className="font-bold">{title}</p><span className="flex h-8 w-8 items-center justify-center rounded-full border border-sky-300/30 bg-sky-300/10 text-lg font-bold text-sky-300 transition group-open:rotate-45">+</span></div><p className="mt-2 text-xs leading-5 text-slate-400">{summary}</p></summary>
                <div className="border-t border-white/10 px-4 pb-4 pt-3">{badge&&<span className="mb-3 inline-flex rounded-full bg-sky-300/10 px-2.5 py-1 text-[9px] font-black uppercase text-sky-200">{badge}</span>}<div className="grid gap-2 text-xs text-slate-300 sm:grid-cols-2">{features.map(f=><span key={f} className="flex gap-2"><span className="text-sky-300">✓</span>{f}</span>)}</div></div>
              </details>)}
            </div>

            <div className="mt-3 rounded-2xl bg-sky-400 px-5 py-4 text-center font-black text-[#06142d]">One connected operational environment</div>
          </div>
        </div>
      </div>
    </section>

    <section className="border-b border-slate-200 bg-white px-5 py-7"><div className="mx-auto flex max-w-7xl flex-wrap justify-center gap-x-8 gap-y-3 text-sm font-bold text-slate-500">{['Scheduling','Timekeeping','Compliance','Fleet','Inventory','CAD','MDT','ePCR'].map(x=><span key={x}>{x}</span>)}</div></section>

    <section className="bg-[#071a36] px-5 py-20 text-white sm:py-24"><div className="mx-auto grid max-w-7xl items-center gap-14 lg:grid-cols-[.9fr_1.1fr]">
      <div><p className="text-sm font-bold uppercase tracking-[.2em] text-sky-300">Management efficiency</p><h2 className="mt-4 text-4xl font-black tracking-[-0.035em] sm:text-5xl">Do more with the team you already have.</h2><p className="mt-6 text-lg leading-8 text-slate-300">Your management team&apos;s time is one of your agency&apos;s most valuable resources. Administrative work often spans multiple managers and supervisors—even when the agency does not have the staff to dedicate a person to every function.</p><p className="mt-5 text-lg leading-8 text-slate-300">ApolloEMS centralizes those workflows in one management environment, reducing duplicate work, handoffs, spreadsheets, and the need to jump between disconnected systems.</p><div className="mt-8 rounded-2xl border border-sky-300/20 bg-sky-300/10 p-5"><p className="text-xl font-black text-sky-200">Less administrative overhead. More operational control.</p></div></div>
      <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-stretch"><div className="rounded-3xl border border-white/10 bg-white/[.06] p-6"><p className="text-xs font-black uppercase tracking-[.18em] text-slate-400">Fragmented operation</p><div className="mt-5 space-y-3">{['Scheduling system','Certification spreadsheet','Fleet records','Inventory tracking','CE records','Incident forms','Dispatch tools'].map(x=><div key={x} className="rounded-xl border border-white/10 bg-white/[.05] px-4 py-3 text-sm font-semibold text-slate-300">{x}</div>)}</div></div><div className="hidden items-center text-3xl font-black text-sky-300 sm:flex">→</div><div className="flex rounded-3xl border border-sky-300/25 bg-gradient-to-br from-sky-400/20 to-blue-600/20 p-6"><div className="my-auto text-center"><div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white p-1.5"><img src="/apollo-logo.png" alt="" className="h-full w-full object-contain"/></div><p className="mt-5 text-2xl font-black">ApolloEMS</p><p className="mt-3 text-sm leading-6 text-slate-300">One connected environment for agency management and operations.</p><div className="mt-6 rounded-xl bg-white/10 px-4 py-3 text-sm font-bold text-sky-200">One platform • Shared information • Fewer handoffs</div></div></div></div>
    </div></section>

    <section className="bg-white px-5 py-20 sm:py-24"><div className="mx-auto max-w-7xl"><div className="max-w-3xl"><p className="apollo-kicker">Connected by design</p><h2 className="mt-4 text-4xl font-black tracking-[-0.035em] sm:text-5xl">The value is not just what ApolloEMS does. It&apos;s how the work connects.</h2><p className="mt-6 text-lg leading-8 text-slate-600">The same operational information can move through the agency instead of being recreated in separate tools.</p></div><div className="mt-12 grid gap-5 lg:grid-cols-3">{connections.map(flow=><div key={flow[0]} className="rounded-3xl border border-slate-200 bg-slate-50 p-7"><div className="flex flex-wrap items-center gap-2">{flow.map((item,i)=><div key={item} className="contents"><span className={`rounded-xl px-3 py-2 text-sm font-bold ${i===0?'bg-[#071a36] text-white':'bg-white text-slate-700 shadow-sm ring-1 ring-slate-200'}`}>{item}</span>{i<flow.length-1&&<span className="font-black text-sky-500">→</span>}</div>)}</div></div>)}</div></div></section>

    <section className="bg-slate-100 px-5 py-20 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm lg:grid-cols-[.85fr_1.15fr] lg:p-12">
          <div>
            <p className="apollo-kicker">Built in EMS • Used in EMS</p>
            <h2 className="mt-4 text-4xl font-black tracking-[-0.035em]">Supporting real daily ambulance operations.</h2>
            <p className="mt-6 text-lg leading-8 text-slate-600">ApolloEMS is used by Sequoia Safety Council, a California ambulance service, as part of its daily operations. That real-world use keeps the platform grounded in the demands of an active EMS organization.</p>
          </div>
          <div className="rounded-3xl bg-[#071a36] p-7 text-white sm:p-9">
            <p className="text-sm font-black uppercase tracking-[.18em] text-sky-300">Operational use</p>
            <h3 className="mt-3 text-2xl font-black">Sequoia Safety Council</h3>
            <p className="mt-4 leading-7 text-slate-300">Current operational workflows supported by ApolloEMS include scheduling and staffing, timekeeping, employee and certification management, fleet and unit inspections, inventory, continuing education, incident reporting, and agency communications.</p>
            <p className="mt-5 text-sm leading-6 text-slate-400">ApolloEMS continues to evolve alongside real EMS operations while newer platform components are developed and validated for broader deployment.</p>
          </div>
        </div>
      </div>
    </section>

    <section className="px-5 py-20 sm:py-24"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.05fr_.95fr]">
      <div className="rounded-[2rem] border border-slate-200 bg-white p-8 shadow-sm sm:p-10"><p className="apollo-kicker">Built from inside EMS</p><h2 className="mt-4 text-4xl font-black tracking-[-0.035em]">Software shaped around the operation—not the other way around.</h2><p className="mt-6 text-lg leading-8 text-slate-600">ApolloEMS was conceived, designed, and built by a working EMS professional with nearly two decades of field and operational experience. That perspective is embedded throughout the platform—from staffing and compliance to unit readiness, dispatch, field operations, and documentation.</p><Link href="/about" className="mt-7 inline-flex font-bold text-blue-700">Read the ApolloEMS story →</Link></div>
      <div className="rounded-[2rem] bg-gradient-to-br from-[#0a2c59] to-[#087bc1] p-8 text-white shadow-xl sm:p-10"><p className="text-sm font-bold uppercase tracking-[.2em] text-sky-200">Apollo ePCR</p><h2 className="mt-4 text-3xl font-black">Clinical documentation is coming to the platform.</h2><p className="mt-5 leading-7 text-blue-100">Apollo ePCR is currently in private beta and actively being developed as the clinical documentation component of ApolloEMS. Its current external beta environment supports EMS education and simulated patient care documentation.</p><div className="mt-6 inline-flex rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold uppercase text-sky-100">Private beta • Coming soon</div><div><Link href="/epcr-beta" className="mt-7 inline-flex rounded-xl bg-white px-5 py-3 font-bold text-blue-800">Explore Apollo ePCR</Link></div></div>
    </div></section>

    <section className="px-5 pb-24 pt-4"><div className="mx-auto max-w-6xl rounded-[2.25rem] bg-[#06142d] p-10 text-center text-white shadow-2xl sm:p-16"><p className="text-sm font-bold uppercase tracking-[.2em] text-sky-300">Bring the operation together</p><h2 className="mx-auto mt-5 max-w-4xl text-4xl font-black tracking-[-0.04em] sm:text-5xl">Your crews shouldn&apos;t need a collection of disconnected systems to run one EMS agency.</h2><p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-300">See how ApolloEMS can consolidate administrative work, improve visibility, and give your team one place to manage the operation.</p><div className="mt-9 flex flex-wrap justify-center gap-3"><Link href="/contact" className="rounded-2xl bg-sky-400 px-6 py-4 font-bold text-[#06142d]">Request a Demo</Link><Link href="/features" className="rounded-2xl border border-white/20 px-6 py-4 font-bold">See All Features</Link></div></div></section>
  </main></PublicSiteShell>;
}
