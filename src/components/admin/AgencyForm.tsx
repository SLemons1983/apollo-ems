'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AGENCY_STATUSES, AGENCY_TYPES, APOLLO_MODULES, AgencyRecord, SERVICE_LEVELS, SUBSCRIPTION_STATUSES, normalizeSlug } from '@/lib/adminAgencies';

const defaults = { name: '', legal_name: '', slug: '', status: 'ONBOARDING', agency_type: 'AMBULANCE', service_level: 'BLS_ALS', primary_contact_name: '', primary_contact_email: '', primary_contact_phone: '', website: '', enabled_modules: [] as string[], subscription_status: 'TRIAL', is_beta: false, internal_notes: '' };

export default function AgencyForm({ agency }: { agency?: AgencyRecord }) {
  const router = useRouter();
  const [form, setForm] = useState({ ...defaults, ...agency });
  const [saving, setSaving] = useState(false), [message, setMessage] = useState('');
  const update = (key: string, value: unknown) => setForm((current) => ({ ...current, [key]: value }));
  const field = 'mt-2 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100';

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage('');
    const response = await fetch(agency ? `/api/admin/agencies/${agency.id}` : '/api/admin/agencies', { method: agency ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const result = await response.json(); setSaving(false);
    if (!response.ok) { setMessage(result.error ?? 'Unable to save agency.'); return; }
    router.push(`/admin/agencies/${result.agency.id}`); router.refresh();
  }

  return <form onSubmit={submit} className="space-y-7">
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">Organization identity</h2>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <label className="font-bold text-slate-700">Display name<input required className={field} value={form.name} onChange={(e) => { update('name', e.target.value); if (!agency) update('slug', normalizeSlug(e.target.value)); }} /></label>
        <label className="font-bold text-slate-700">Legal name<input className={field} value={form.legal_name ?? ''} onChange={(e) => update('legal_name', e.target.value)} /></label>
        <label className="font-bold text-slate-700">Agency slug<input required className={field} value={form.slug} onChange={(e) => update('slug', normalizeSlug(e.target.value))} /><span className="mt-2 block text-xs font-normal text-slate-500">Stable platform identifier; lowercase letters, numbers, and hyphens.</span></label>
        <label className="font-bold text-slate-700">Website<input type="url" className={field} value={form.website ?? ''} onChange={(e) => update('website', e.target.value)} placeholder="https://" /></label>
        <Select label="Agency type" value={form.agency_type} values={AGENCY_TYPES} onChange={(v) => update('agency_type', v)} field={field} />
        <Select label="Service level" value={form.service_level} values={SERVICE_LEVELS} onChange={(v) => update('service_level', v)} field={field} />
      </div>
    </section>
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-xl font-black">Lifecycle and subscription</h2><div className="mt-5 grid gap-5 md:grid-cols-2">
        <Select label="Agency status" value={form.status} values={AGENCY_STATUSES} onChange={(v) => update('status', v)} field={field} />
        <Select label="Subscription status" value={form.subscription_status} values={SUBSCRIPTION_STATUSES} onChange={(v) => update('subscription_status', v)} field={field} />
        <label className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 font-bold"><input type="checkbox" checked={form.is_beta} onChange={(e) => update('is_beta', e.target.checked)} className="h-5 w-5" /> Beta participant</label>
      </div>
    </section>
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Primary contact</h2><div className="mt-5 grid gap-5 md:grid-cols-2">
      <label className="font-bold text-slate-700">Name<input required className={field} value={form.primary_contact_name} onChange={(e) => update('primary_contact_name', e.target.value)} /></label>
      <label className="font-bold text-slate-700">Email<input required type="email" className={field} value={form.primary_contact_email} onChange={(e) => update('primary_contact_email', e.target.value)} /></label>
      <label className="font-bold text-slate-700">Phone<input className={field} value={form.primary_contact_phone ?? ''} onChange={(e) => update('primary_contact_phone', e.target.value)} /></label>
    </div></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><h2 className="text-xl font-black">Enabled modules</h2><div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{APOLLO_MODULES.map((module) => <label key={module} className="flex items-center gap-3 rounded-xl border border-slate-200 p-4 font-semibold"><input type="checkbox" className="h-5 w-5" checked={form.enabled_modules.includes(module)} onChange={(e) => update('enabled_modules', e.target.checked ? [...form.enabled_modules, module] : form.enabled_modules.filter((item) => item !== module))} />{module}</label>)}</div></section>
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"><label className="font-bold text-slate-700">Internal owner notes<textarea rows={6} className={field} value={form.internal_notes ?? ''} onChange={(e) => update('internal_notes', e.target.value)} /><span className="mt-2 block text-xs font-normal text-slate-500">Visible only in Apollo owner administration.</span></label></section>
    {message && <p role="alert" className="rounded-xl bg-red-50 p-4 font-bold text-red-800">{message}</p>}
    <div className="flex justify-end"><button disabled={saving} className="rounded-xl bg-blue-700 px-6 py-3 font-black text-white disabled:opacity-50">{saving ? 'Saving…' : agency ? 'Save agency' : 'Create agency'}</button></div>
  </form>;
}

function Select({ label, value, values, onChange, field }: { label: string; value: string; values: readonly string[]; onChange: (value: string) => void; field: string }) {
  return <label className="font-bold text-slate-700">{label}<select className={field} value={value} onChange={(e) => onChange(e.target.value)}>{values.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}</select></label>;
}
