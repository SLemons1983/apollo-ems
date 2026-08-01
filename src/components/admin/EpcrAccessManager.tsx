'use client';
import { FormEvent, useCallback, useEffect, useState } from 'react';
import type { EpcrMembership, EpcrRole } from '@/lib/epcrAccess';

export default function EpcrAccessManager({ agencyId, enabled }: { agencyId: string; enabled: boolean }) {
  const [members, setMembers] = useState<EpcrMembership[]>([]);
  const [message, setMessage] = useState('');
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', role: 'PRIMARY_ADMIN' as EpcrRole });
  const load = useCallback(() => fetch(`/api/admin/agencies/${agencyId}/epcr-members`).then((r) => r.json()).then((r) => setMembers(r.members ?? [])), [agencyId]);
  useEffect(() => { void load(); }, [load]);

  async function invite(event: FormEvent) {
    event.preventDefault(); setMessage('Sending invitation…');
    const response = await fetch(`/api/admin/agencies/${agencyId}/epcr-members`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const result = await response.json();
    setMessage(response.ok ? `Invitation sent to ${result.member.email}. Username: ${result.member.username}` : result.error);
    if (response.ok) { setForm({ first_name: '', last_name: '', email: '', role: 'ADMIN' }); void load(); }
  }

  async function changeAccess(member: EpcrMembership, action: 'REINVITE' | 'REVOKE') {
    const isPending = member.status === 'INVITED';
    if (action === 'REVOKE') {
      const label = isPending ? 'cancel this invitation' : 'remove this user’s access';
      if (!window.confirm(`Are you sure you want to ${label}? This affects only this agency and preserves the audit record.`)) return;
    }
    setWorkingId(member.id);
    setMessage(action === 'REINVITE' ? `Sending a fresh invitation to ${member.email}…` : isPending ? `Canceling invitation for ${member.email}…` : `Removing access for ${member.email}…`);
    const response = await fetch(`/api/admin/agencies/${agencyId}/epcr-members`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ membership_id: member.id, action }) });
    const result = await response.json();
    if (response.ok) {
      setMessage(action === 'REINVITE' ? `A new secure password link was sent to ${member.email}.` : isPending ? `Invitation canceled for ${member.email}.` : `Access removed for ${member.email}.`);
      await load();
    } else setMessage(result.error);
    setWorkingId(null);
  }

  return <section className="mt-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
    <h2 className="text-xl font-black">ePCR access</h2>
    <p className="mt-2 text-sm text-slate-600">Invite users and manage agency-scoped access. Revoked memberships remain visible for audit history.</p>
    {!enabled && <p className="mt-4 rounded-xl bg-amber-50 p-4 font-bold text-amber-900">Enable ePCR Beta above and save the agency before sending invitations.</p>}
    <form onSubmit={invite} className="mt-5 grid gap-3 md:grid-cols-4"><input required placeholder="First name" className="rounded-xl border p-3" value={form.first_name} onChange={(e) => setForm({...form,first_name:e.target.value})}/><input required placeholder="Last name" className="rounded-xl border p-3" value={form.last_name} onChange={(e) => setForm({...form,last_name:e.target.value})}/><input required type="email" placeholder="Email" className="rounded-xl border p-3" value={form.email} onChange={(e) => setForm({...form,email:e.target.value})}/><select className="rounded-xl border p-3" value={form.role} onChange={(e) => setForm({...form,role:e.target.value as EpcrRole})}><option value="PRIMARY_ADMIN">Primary admin</option><option value="ADMIN">Admin / instructor</option><option value="REVIEWER">Reviewer</option><option value="CLINICIAN">Clinician / student</option></select><button disabled={!enabled} className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white disabled:opacity-40">Send secure invitation</button></form>
    {message && <p className="mt-4 rounded-xl bg-slate-100 p-4 font-bold">{message}</p>}
    <div className="mt-6 space-y-2">{members.map((m) => <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4"><span><b>{m.first_name} {m.last_name}</b><br/><span className="text-sm text-slate-600">{m.email} · {m.username}</span>{m.status === 'REVOKED' && m.revoked_at && <><br/><span className="text-xs text-slate-500">Revoked {new Date(m.revoked_at).toLocaleString()}{m.revoked_by ? ` by ${m.revoked_by}` : ''}</span></>}</span><span className="flex flex-wrap items-center gap-2"><b>{m.role.replaceAll('_',' ')} · {m.status}</b>{m.status === 'INVITED' && <><button type="button" disabled={workingId === m.id} onClick={() => void changeAccess(m, 'REINVITE')} className="rounded-lg border border-blue-700 px-3 py-2 text-sm font-black text-blue-700 disabled:opacity-40">Replace invitation</button><button type="button" disabled={workingId === m.id} onClick={() => void changeAccess(m, 'REVOKE')} className="rounded-lg border border-red-700 px-3 py-2 text-sm font-black text-red-700 disabled:opacity-40">Cancel invitation</button></>}{m.status === 'ACTIVE' && <button type="button" disabled={workingId === m.id} onClick={() => void changeAccess(m, 'REVOKE')} className="rounded-lg border border-red-700 px-3 py-2 text-sm font-black text-red-700 disabled:opacity-40">Remove access</button>}{m.status === 'REVOKED' && <button type="button" disabled={workingId === m.id} onClick={() => void changeAccess(m, 'REINVITE')} className="rounded-lg border border-blue-700 px-3 py-2 text-sm font-black text-blue-700 disabled:opacity-40">Send new invitation</button>}</span></div>)}</div>
  </section>;
}
