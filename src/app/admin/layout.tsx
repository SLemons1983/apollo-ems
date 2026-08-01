import { createServerClient } from '@supabase/ssr';
import Image from 'next/image';
import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { isPlatformOwner } from '@/lib/platformOwner';

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    'https://xyrusrspvyuwpplhhett.supabase.co',
    'sb_publishable_Pprc1W8EQ4tFMo_hvIX60A_t9zBIFaU',
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll() {
          // Session refresh is handled by middleware. Server layouts cannot set cookies.
        },
      },
    },
  );
  const { data: { user } } = await supabase.auth.getUser();

  if (!user?.email) redirect('/login?next=/admin');
  if (!isPlatformOwner(user.email)) redirect('/dashboard');

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <header className="border-b border-white/10 bg-[#071632] text-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-4 lg:px-8">
          <Link href="/admin" className="flex items-center gap-3">
            <Image src="/apollo-logo.png" alt="ApolloEMS" width={48} height={48} className="h-11 w-11 rounded-xl bg-white object-contain p-1" />
            <div><p className="text-lg font-black">ApolloEMS</p><p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-200">Owner Administration</p></div>
          </Link>
          <nav className="flex items-center gap-2 text-sm font-bold">
            <Link href="/admin" className="rounded-xl px-4 py-2 hover:bg-white/10">Overview</Link>
            <Link href="/admin/agencies" className="rounded-xl px-4 py-2 hover:bg-white/10">Agencies</Link>
            <Link href="/dashboard" className="rounded-xl border border-white/25 px-4 py-2 hover:bg-white/10">SSC Dashboard</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-5 py-10 lg:px-8">{children}</main>
    </div>
  );
}
