import Link from 'next/link';
import AgencyEditor from '@/components/admin/AgencyEditor';

export default async function AgencyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <div><Link href="/admin/agencies" className="font-bold text-blue-700">← Agencies</Link><h1 className="mt-4 text-4xl font-black">Agency details</h1><p className="mt-3 text-slate-600">Update the registry record. Agency deletion and operational-data changes are not available.</p><div className="mt-8"><AgencyEditor id={id} /></div></div>;
}
