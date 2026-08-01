import Link from 'next/link';
import AgencyList from '@/components/admin/AgencyList';

export default function AgenciesPage() {
  return <div>
    <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="text-sm font-bold uppercase tracking-widest text-blue-700">Platform organizations</p><h1 className="mt-2 text-4xl font-black tracking-tight">Agencies</h1><p className="mt-3 max-w-3xl leading-7 text-slate-600">Manage organization identity, lifecycle, contacts, subscriptions, and enabled Apollo modules. This registry remains separate from agency operational data.</p></div><Link href="/admin/agencies/new" className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white shadow-sm">Create agency</Link></div>
    <div className="mt-8"><AgencyList /></div>
  </div>;
}
