'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import type { EpcrMembership, EpcrRole } from '@/lib/epcrAccess';

type Actor = { id: string; role: EpcrRole };

export default function AgencyUserManager() {
  const [members, setMembers] = useState<EpcrMembership[]>([]);
  const [actor, setActor] = useState<Actor | null>(null);
  const [message, setMessage] = useState('');
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', role: 'CLINICIAN' as EpcrRole });
  const load = useCallback(async () => {
    const response = await fetch('/api/epcr/users');
    const result = await response.json();
    if (response.ok) { setMembers(result.members ?? []); setActor(result.actor); }
    else setMessage(result.error);
  }, []);
  useEffect(() => {
    const timeoutId = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [load]);

  async function invite(event: FormEvent) {
    event.preventDefault();
    setMessage('Sending invitation...');
    const response = await fetch('/api/epcr/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const result = await response.json();
    setMessage(response.ok ? `Invitation sent to ${result.member.email}. Username: ${result.member.username}` : result.error);
    if (response.ok) { setForm({ first_name: '', last_name: '', email: '', role: 'CLINICIAN' }); await load(); }
  }

  async function update(member: EpcrMembership, action: 'REINVITE' | 'REVOKE' | 'SET_ROLE', role?: EpcrRole) {
    if (action === 'REVOKE') {
      const label = member.status === 'INVITED' ? 'cancel this invitation' : "remove this user's access";
      if (!window.confirm(`Are you sure you want to ${label}? The membership history will be preserved.`)) return;
    }
    setWorkingId(member.id);
    setMessage(action === 'REINVITE' ? `Sending a new invitation to ${member.email}...` : action === 'SET_ROLE' ? `Updating ${member.first_name}'s role...` : `Updating access for ${member.email}...`);
    const response = await fetch('/api/epcr/users', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ membership_id: member.id, action, role }) });
    const result = await response.json();
    setMessage(response.ok ? action === 'REINVITE' ? `A new secure password link was sent to ${member.email}.` : action === 'SET_ROLE' ? `${member.first_name}'s role was updated.` : member.status === 'INVITED' ? `Invitation canceled for ${member.email}.` : `Access removed for ${member.email}.` : result.error);
    if (response.ok) await load();
    setWorkingId(null);
  }

  const canManage = (member: EpcrMembership) => actor?.role === 'PRIMARY_ADMIN' || member.role !== 'PRIMARY_ADMIN';
  const roles: { value: EpcrRole; label: string }[] = [
    ...(actor?.role === 'PRIMARY_ADMIN' ? [{ value: 'PRIMARY_ADMIN' as EpcrRole, label: 'Primary Admin' }] : []),
    { value: 'ADMIN', label: 'Admin / Instructor' }, { value: 'REVIEWER', label: 'Reviewer' }, { value: 'CLINICIAN', label: 'Clinician / Student' },
  ];

  return <main className="min-h-screen bg-slate-100 p-6"><div className="mx-auto max-w-6xl">
    <a href="/epcr-dashboard" className="font-bold text-blue-700">&larr; Agency Admin</a>
    <h1 className="mt-4 text-4xl font-black">Manage users</h1>
    <p className="mt-2 text-slate-600">Invite administrators and users for your agency. Access to other agencies is never shown here.</p>
    <section className="mt-8 rounded-3xl bg-white p-6 shadow">
      <h2 className="text-xl font-black">Add a user</h2>
      <form onSubmit={invite} className="mt-5 grid gap-3 md:grid-cols-4">
        <input required placeholder="First name" className="rounded-xl border p-3" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })}/>
        <input required placeholder="Last name" className="rounded-xl border p-3" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })}/>
        <input required type="email" placeholder="Email" className="rounded-xl border p-3" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}/>
        <select className="rounded-xl border p-3" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as EpcrRole })}>{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select>
        <button className="rounded-xl bg-blue-700 px-5 py-3 font-black text-white md:col-span-4 md:justify-self-start">Send secure invitation</button>
      </form>
      {message && <p className="mt-4 rounded-xl bg-slate-100 p-4 font-bold">{message}</p>}
    </section>
    <section className="mt-6 rounded-3xl bg-white p-6 shadow">
      <h2 className="text-xl font-black">Agency users</h2>
      <div className="mt-5 space-y-3">{members.map((member) => <div key={member.id} className="rounded-2xl border p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><span><b>{member.first_name} {member.last_name}</b><br/><span className="text-sm text-slate-600">{member.email} &middot; @{member.username}</span>{member.status === 'REVOKED' && member.revoked_at && <><br/><span className="text-xs text-slate-500">Revoked {new Date(member.revoked_at).toLocaleString()}{member.revoked_by ? ` by ${member.revoked_by}` : ''}</span></>}</span><b className="text-sm">{member.status}</b></div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select aria-label={`Role for ${member.first_name} ${member.last_name}`} disabled={!canManage(member) || workingId === member.id || member.id === actor?.id} className="rounded-lg border px-3 py-2 text-sm font-bold disabled:opacity-50" value={member.role} onChange={(e) => void update(member, 'SET_ROLE', e.target.value as EpcrRole)}>
            {!roles.some((role) => role.value === member.role) && <option value={member.role}>{member.role.replaceAll('_', ' ')}</option>}{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
          </select>
          {member.status === 'INVITED' && canManage(member) && <><button disabled={workingId === member.id} onClick={() => void update(member, 'REINVITE')} className="rounded-lg border border-blue-700 px-3 py-2 text-sm font-black text-blue-700 disabled:opacity-40">Replace invitation</button><button disabled={workingId === member.id || member.id === actor?.id} onClick={() => void update(member, 'REVOKE')} className="rounded-lg border border-red-700 px-3 py-2 text-sm font-black text-red-700 disabled:opacity-40">Cancel invitation</button></>}
          {member.status === 'ACTIVE' && canManage(member) && <button disabled={workingId === member.id || member.id === actor?.id} onClick={() => void update(member, 'REVOKE')} className="rounded-lg border border-red-700 px-3 py-2 text-sm font-black text-red-700 disabled:opacity-40">Remove access</button>}
          {member.status === 'REVOKED' && canManage(member) && <button disabled={workingId === member.id} onClick={() => void update(member, 'REINVITE')} className="rounded-lg border border-blue-700 px-3 py-2 text-sm font-black text-blue-700 disabled:opacity-40">Send new invitation</button>}
        </div>
      </div>)}</div>
    </section>
  </div></main>;
}
