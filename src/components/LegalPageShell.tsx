import Image from 'next/image';
import Link from 'next/link';
import type { ReactNode } from 'react';

type LegalPageShellProps = {
  eyebrow: string;
  title: string;
  description: string;
  children: ReactNode;
};

export default function LegalPageShell({
  eyebrow,
  title,
  description,
  children,
}: LegalPageShellProps) {
  return (
    <main className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <Link
            href="/"
            className="flex items-center gap-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-offset-2"
          >
            <Image
              src="/apollo-logo.png"
              alt="ApolloEMS"
              width={42}
              height={42}
              className="rounded-lg"
              priority
            />
            <div>
              <p className="text-lg font-bold tracking-tight text-slate-950">
                ApolloEMS
              </p>
              <p className="text-xs text-slate-500">
                EMS workforce management
              </p>
            </div>
          </Link>

          <Link
            href="/login"
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-blue-500 hover:text-blue-700"
          >
            Sign in
          </Link>
        </div>
      </header>

      <section className="border-b border-blue-900 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white">
        <div className="mx-auto w-full max-w-5xl px-5 py-12 sm:px-8 sm:py-16">
          <p className="mb-3 text-sm font-bold uppercase tracking-[0.18em] text-blue-300">
            {eyebrow}
          </p>
          <h1 className="max-w-3xl text-3xl font-bold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-slate-200 sm:text-lg">
            {description}
          </p>
        </div>
      </section>

      <div className="mx-auto grid w-full max-w-5xl gap-8 px-5 py-10 sm:px-8 lg:grid-cols-[minmax(0,1fr)_240px]">
        <article className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
          <div className="legal-content">{children}</div>
        </article>

        <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm font-bold uppercase tracking-wide text-slate-500">
            ApolloEMS policies
          </p>
          <nav className="mt-4 space-y-2" aria-label="Policy pages">
            <Link
              href="/privacy"
              className="block rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-800"
            >
              Privacy Policy
            </Link>
            <Link
              href="/sms-terms"
              className="block rounded-lg border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-800"
            >
              SMS Terms
            </Link>
          </nav>

          <div className="mt-6 border-t border-slate-200 pt-5">
            <p className="text-sm font-semibold text-slate-900">
              Questions or support
            </p>
            <a
              href="mailto:support@apolloems.org"
              className="mt-2 block break-all text-sm font-medium text-blue-700 hover:underline"
            >
              support@apolloems.org
            </a>
          </div>
        </aside>
      </div>

      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 px-5 py-6 text-sm text-slate-500 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© 2026 ApolloEMS. All rights reserved.</p>
          <div className="flex gap-5">
            <Link href="/privacy" className="hover:text-blue-700 hover:underline">
              Privacy
            </Link>
            <Link href="/sms-terms" className="hover:text-blue-700 hover:underline">
              SMS Terms
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
