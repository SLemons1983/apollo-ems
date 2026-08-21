import Image from 'next/image';
import Link from 'next/link';

const nav = [
  ['Platform', '/features'],
  ['ePCR Beta', '/epcr-beta'],
  ['Pricing', '/pricing'],
  ['About', '/about'],
  ['FAQ', '/faq'],
];

export default function PublicSiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f8fc] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-white/10 bg-[#06142d]/95 text-white shadow-sm backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-3 lg:px-8">
          <Link href="/" className="flex items-center gap-3 font-bold">
            <Image src="/apollo-logo.png" alt="ApolloEMS" width={56} height={56} className="h-11 w-11 rounded-xl bg-white object-contain p-1" priority />
            <div>
              <span className="block text-xl font-black tracking-tight">ApolloEMS</span>
              <span className="hidden text-[10px] font-bold uppercase tracking-[.16em] text-sky-300 sm:block">EMS Operations Platform</span>
            </div>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold lg:flex">
            {nav.map(([label, href]) => <Link key={href} href={href} className="text-slate-300 transition hover:text-white">{label}</Link>)}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-xl border border-white/25 px-4 py-2 text-sm font-semibold transition hover:bg-white/10">Agency Login</Link>
            <Link href="/contact" className="hidden rounded-xl bg-sky-400 px-4 py-2 text-sm font-bold text-[#06142d] transition hover:bg-sky-300 sm:block">Request a Demo</Link>
          </div>
        </div>
      </header>
      {children}
      <footer className="bg-[#041022] text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_.8fr_.8fr] lg:px-8">
          <div>
            <div className="flex items-center gap-3">
              <Image src="/apollo-logo.png" alt="ApolloEMS" width={44} height={44} className="h-10 w-10 rounded-lg bg-white object-contain p-1" />
              <p className="text-lg font-black text-white">ApolloEMS</p>
            </div>
            <p className="mt-4 max-w-md text-sm leading-6">A comprehensive EMS operations platform connecting workforce, operations, dispatch, field crews, and clinical documentation.</p>
            <Link href="/contact" className="mt-5 inline-flex text-sm font-bold text-sky-300 hover:text-sky-200">Request a Demo →</Link>
          </div>
          <div className="text-sm">
            <p className="font-bold text-white">Explore</p>
            <div className="mt-4 flex flex-col gap-2.5">
              <Link href="/features">Platform</Link><Link href="/epcr-beta">ePCR Private Beta</Link><Link href="/pricing">Pricing</Link><Link href="/about">About</Link><Link href="/faq">FAQ</Link><Link href="/contact">Contact</Link>
            </div>
          </div>
          <div className="text-sm">
            <p className="font-bold text-white">Policies</p>
            <div className="mt-4 flex flex-col gap-2.5">
              <Link href="/privacy">Privacy Policy</Link><Link href="/sms-privacy">SMS Privacy</Link><Link href="/sms-terms">SMS Terms</Link><Link href="/sms-opt-in-process">SMS Opt-In Process</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-slate-500">© 2026 ApolloEMS. All rights reserved.</div>
      </footer>
    </div>
  );
}

export function PublicHero({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <section className="relative overflow-hidden bg-[#06142d] px-5 py-20 text-white">
      <div className="apollo-grid absolute inset-0 opacity-25" />
      <div className="relative mx-auto max-w-5xl text-center">
        <p className="text-sm font-bold uppercase tracking-[0.22em] text-sky-300">{eyebrow}</p>
        <h1 className="mt-5 text-4xl font-black tracking-[-0.035em] sm:text-6xl">{title}</h1>
        <p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-slate-300">{description}</p>
      </div>
    </section>
  );
}
