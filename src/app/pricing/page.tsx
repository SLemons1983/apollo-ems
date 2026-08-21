import Link from 'next/link';
import PublicSiteShell, { PublicHero } from '@/components/PublicSiteShell';

const factors = [
  ['Operational size', 'Pricing can reflect the size and scope of the EMS organization rather than forcing every agency into the same package.'],
  ['Selected capabilities', 'Agencies can focus on the ApolloEMS modules and workflows that fit their operation.'],
  ['Implementation needs', 'Configuration and onboarding can be matched to the complexity of the agency and its deployment.'],
];

export default function PricingPage() {
  return <PublicSiteShell>
    <PublicHero eyebrow="Agency Pricing" title="Pricing designed around your operation." description="ApolloEMS is reasonably priced to suit your operational size, selected capabilities, and implementation needs." />
    <main className="px-5 py-16 sm:py-20"><div className="mx-auto max-w-6xl">
      <section className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm sm:p-12">
        <p className="apollo-kicker">Flexible agency pricing</p>
        <h2 className="mx-auto mt-4 max-w-4xl text-4xl font-black tracking-[-0.035em] sm:text-5xl">A comprehensive platform without one-size-fits-all pricing.</h2>
        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-600">EMS agencies vary widely in staffing, resources, call volume, operational structure, and technology needs. ApolloEMS pricing is tailored around the organization so agencies can build an implementation that makes operational and financial sense.</p>
        <Link href="/contact" className="mt-8 inline-flex rounded-2xl bg-sky-500 px-6 py-4 font-bold text-white shadow-lg hover:bg-sky-400">Request Agency Pricing</Link>
      </section>
      <section className="mt-8 grid gap-5 md:grid-cols-3">
        {factors.map(([title,description]) => <div key={title} className="rounded-3xl border border-slate-200 bg-white p-7"><div className="mb-5 h-1 w-12 rounded-full bg-sky-500" /><h3 className="text-2xl font-black">{title}</h3><p className="mt-4 leading-7 text-slate-600">{description}</p></div>)}
      </section>
      <section className="mt-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-[2rem] bg-[#071a36] p-8 text-white sm:p-10"><p className="text-sm font-black uppercase tracking-[.18em] text-sky-300">Start with what you need</p><h2 className="mt-4 text-3xl font-black">A modular platform built to grow with the agency.</h2><p className="mt-5 leading-7 text-slate-300">ApolloEMS can be configured around the operational capabilities an agency needs today, while preserving a connected platform for additional workflows as needs expand.</p></div>
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 sm:p-10"><p className="apollo-kicker">Talk with ApolloEMS</p><h2 className="mt-4 text-3xl font-black">Get pricing for your organization.</h2><p className="mt-5 leading-7 text-slate-600">Tell us about your agency, operational size, current systems, and the areas you want to improve. We can discuss the right ApolloEMS configuration and pricing approach.</p><Link href="/contact" className="mt-7 inline-flex font-bold text-blue-700 hover:text-blue-900">Request a demo and pricing →</Link></div>
      </section>
    </div></main>
  </PublicSiteShell>;
}
