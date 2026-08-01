import Image from 'next/image';
import Link from 'next/link';

const nav = [
  ['Features', '/features'],
  ['ePCR Beta', '/epcr-beta'],
  ['Pricing', '/pricing'],
  ['About', '/about'],
  ['FAQ', '/faq'],
];

export default function PublicSiteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[#f5f8fc] text-slate-950">
      <header className="sticky top-0 z-50 border-b border-white/15 bg-[#071632]/95 text-white backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-5 px-5 py-3 lg:px-8">
          <Link href="/" className="flex items-center gap-3 font-bold">
            <Image src="/apollo-logo.png" alt="ApolloEMS" width={56} height={56} className="h-11 w-11 rounded-xl bg-white object-contain p-1" />
            <span className="text-xl tracking-tight">ApolloEMS</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-semibold lg:flex">
            {nav.map(([label, href]) => <Link key={href} href={href} className="text-slate-200 hover:text-white">{label}</Link>)}
          </nav>
          <div className="flex items-center gap-2">
            <Link href="/login" className="rounded-xl border border-white/30 px-4 py-2 text-sm font-semibold hover:bg-white/10">Agency Login</Link>
            <Link href="/contact" className="hidden rounded-xl bg-sky-500 px-4 py-2 text-sm font-semibold hover:bg-sky-400 sm:block">Request a Demo</Link>
          </div>
        </div>
      </header>
      {children}
      <footer className="bg-[#061229] text-slate-300">
        <div className="mx-auto grid max-w-7xl gap-8 px-5 py-12 md:grid-cols-3 lg:px-8">
          <div><p className="text-lg font-bold text-white">ApolloEMS</p><p className="mt-3 max-w-sm text-sm leading-6">Modern workforce and operations software built by EMS professionals for EMS professionals.</p></div>
          <div className="text-sm"><p className="font-bold text-white">Explore</p><div className="mt-3 flex flex-col gap-2"><Link href="/features">Features</Link><Link href="/epcr-beta">ePCR Private Beta</Link><Link href="/contact">Contact</Link></div></div>
          <div className="text-sm"><p className="font-bold text-white">Policies</p><div className="mt-3 flex flex-col gap-2"><Link href="/privacy">Privacy Policy</Link><Link href="/sms-privacy">SMS Privacy</Link><Link href="/sms-terms">SMS Terms</Link><Link href="/sms-opt-in-process">SMS Opt-In Process</Link></div></div>
        </div>
        <div className="border-t border-white/10 px-5 py-5 text-center text-xs text-slate-400">© 2026 ApolloEMS. All rights reserved.</div>
      </footer>
    </div>
  );
}

export function PublicHero({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return <section className="bg-gradient-to-br from-[#071632] via-[#0b3f78] to-[#0795e6] px-5 py-20 text-white"><div className="mx-auto max-w-5xl text-center"><p className="text-sm font-bold uppercase tracking-[0.24em] text-sky-200">{eyebrow}</p><h1 className="mt-5 text-4xl font-black tracking-tight sm:text-6xl">{title}</h1><p className="mx-auto mt-6 max-w-3xl text-lg leading-8 text-blue-100">{description}</p></div></section>;
}
