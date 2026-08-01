import Link from 'next/link';
import AgencyForm from '@/components/admin/AgencyForm';

export default function NewAgencyPage() {
  return <div><Link href="/admin/agencies" className="font-bold text-blue-700">← Agencies</Link><h1 className="mt-4 text-4xl font-black">Create agency</h1><p className="mt-3 text-slate-600">Create a platform registry record. This does not create employees, users, or operational data.</p><div className="mt-8"><AgencyForm /></div></div>;
}
