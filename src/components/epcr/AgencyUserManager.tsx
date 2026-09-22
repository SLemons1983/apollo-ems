'use client';

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import type { EpcrMembership, EpcrRole } from '@/lib/epcrAccess';

type Actor = { id: string; role: EpcrRole };
type CsvInputRow = { first_name: string; last_name: string; email: string; role: string };
type CsvPreviewRow = CsvInputRow & {
  row: number;
  username?: string;
  valid: boolean;
  error?: string;
  imported?: boolean;
};

const CSV_TEMPLATE = `first_name,last_name,email,role\nJohn,Smith,john.smith@example.com,CLINICIAN\nSarah,Jones,sarah.jones@example.com,REVIEWER\n`;

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];
    if (char === '"' && quoted && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === ',' && !quoted) {
      row.push(field.trim());
      field = '';
    } else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && next === '\n') index += 1;
      row.push(field.trim());
      field = '';
      if (row.some((value) => value.length)) rows.push(row);
      row = [];
    } else {
      field += char;
    }
  }
  row.push(field.trim());
  if (row.some((value) => value.length)) rows.push(row);
  return rows;
}

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function csvRowsFromText(text: string): { users?: CsvInputRow[]; error?: string } {
  const parsed = parseCsv(text.replace(/^\uFEFF/, ''));
  if (parsed.length < 2) return { error: 'The CSV must include a header row and at least one user.' };
  const headers = parsed[0].map(normalizeHeader);
  const aliases: Record<string, string[]> = {
    first_name: ['first_name', 'firstname', 'first'],
    last_name: ['last_name', 'lastname', 'last'],
    email: ['email', 'email_address', 'emailaddress'],
    role: ['role', 'epcr_role', 'user_role'],
  };
  const positions = Object.fromEntries(Object.entries(aliases).map(([key, values]) => [key, headers.findIndex((header) => values.includes(header))]));
  const missing = Object.entries(positions).filter(([, position]) => position < 0).map(([key]) => key);
  if (missing.length) return { error: `Missing required column${missing.length === 1 ? '' : 's'}: ${missing.join(', ')}.` };

  const users = parsed.slice(1).map((values) => ({
    first_name: values[positions.first_name] ?? '',
    last_name: values[positions.last_name] ?? '',
    email: values[positions.email] ?? '',
    role: values[positions.role] ?? '',
  }));
  return { users };
}

export default function AgencyUserManager() {
  const [members, setMembers] = useState<EpcrMembership[]>([]);
  const [actor, setActor] = useState<Actor | null>(null);
  const [message, setMessage] = useState('');
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', role: 'CLINICIAN' as EpcrRole });
  const [csvFileName, setCsvFileName] = useState('');
  const [csvUsers, setCsvUsers] = useState<CsvInputRow[]>([]);
  const [csvPreview, setCsvPreview] = useState<CsvPreviewRow[]>([]);
  const [csvWorking, setCsvWorking] = useState(false);
  const [csvMessage, setCsvMessage] = useState('');

  const load = useCallback(async () => {
    const response = await fetch('/api/epcr/users');
    const result = await response.json();
    if (response.ok) { setMembers(result.members ?? []); setActor(result.actor); }
    else setMessage(result.error);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
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

  async function validateCsv(users: CsvInputRow[]) {
    setCsvWorking(true);
    setCsvMessage('Validating CSV...');
    setCsvPreview([]);
    const response = await fetch('/api/epcr/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'VALIDATE_BULK', users }),
    });
    const result = await response.json();
    if (!response.ok) {
      setCsvMessage(result.error ?? 'Unable to validate the CSV.');
      setCsvWorking(false);
      return;
    }
    const rows = (result.rows ?? []) as CsvPreviewRow[];
    setCsvPreview(rows);
    const ready = rows.filter((row) => row.valid).length;
    const problems = rows.length - ready;
    setCsvMessage(`${ready} user${ready === 1 ? '' : 's'} ready to import${problems ? ` · ${problems} row${problems === 1 ? '' : 's'} need attention` : ''}.`);
    setCsvWorking(false);
  }

  async function handleCsvFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setCsvMessage('Reading CSV...');
    setCsvPreview([]);
    try {
      const parsed = csvRowsFromText(await file.text());
      if (!parsed.users) {
        setCsvUsers([]);
        setCsvMessage(parsed.error ?? 'Unable to read the CSV.');
        return;
      }
      if (parsed.users.length > 100) {
        setCsvUsers([]);
        setCsvMessage('Import up to 100 users at a time. Split larger rosters into multiple CSV files.');
        return;
      }
      setCsvUsers(parsed.users);
      await validateCsv(parsed.users);
    } catch {
      setCsvUsers([]);
      setCsvMessage('Unable to read that CSV file.');
    }
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'apollo-epcr-user-import-template.csv';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  async function importCsvUsers() {
    const ready = csvPreview.filter((row) => row.valid).length;
    if (!ready || !csvUsers.length) return;
    if (!window.confirm(`Send secure ePCR invitations to ${ready} user${ready === 1 ? '' : 's'}?`)) return;
    setCsvWorking(true);
    setCsvMessage(`Importing ${ready} user${ready === 1 ? '' : 's'}...`);
    const response = await fetch('/api/epcr/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'IMPORT_BULK', users: csvUsers }),
    });
    const result = await response.json();
    if (!response.ok) {
      setCsvMessage(result.error ?? 'Unable to import users.');
      setCsvWorking(false);
      return;
    }
    const results = (result.results ?? []) as CsvPreviewRow[];
    setCsvPreview(results);
    setCsvMessage(`${result.imported ?? 0} invitation${result.imported === 1 ? '' : 's'} sent · ${result.skipped ?? 0} skipped.`);
    if ((result.imported ?? 0) > 0) await load();
    setCsvWorking(false);
  }

  function resetCsv() {
    setCsvFileName('');
    setCsvUsers([]);
    setCsvPreview([]);
    setCsvMessage('');
  }

  const canManage = (member: EpcrMembership) => actor?.role === 'PRIMARY_ADMIN' || member.role !== 'PRIMARY_ADMIN';
  const roles: { value: EpcrRole; label: string }[] = [
    ...(actor?.role === 'PRIMARY_ADMIN' ? [{ value: 'PRIMARY_ADMIN' as EpcrRole, label: 'Primary Admin' }] : []),
    { value: 'ADMIN', label: 'Admin / Instructor' }, { value: 'REVIEWER', label: 'Reviewer' }, { value: 'CLINICIAN', label: 'Clinician / Student' },
  ];
  const readyCount = useMemo(() => csvPreview.filter((row) => row.valid && !row.imported).length, [csvPreview]);
  const errorCount = useMemo(() => csvPreview.filter((row) => !row.valid).length, [csvPreview]);
  const importedCount = useMemo(() => csvPreview.filter((row) => row.imported).length, [csvPreview]);

  return <main className="min-h-screen bg-gradient-to-br from-[#071632] via-[#0b3f78] to-[#0795e6] px-4 py-8 text-slate-900 sm:px-6"><div className="mx-auto max-w-6xl">
    <header className="rounded-3xl border border-white/50 bg-white p-6 shadow-2xl sm:p-8">
      <a href="/epcr-dashboard" className="font-black text-blue-700 transition hover:text-blue-900">&larr; Agency Admin</a>
      <p className="mt-6 text-xs font-black uppercase tracking-[0.2em] text-blue-700">Agency administration</p>
      <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">Manage users</h1>
      <p className="mt-2 text-slate-600">Invite one person at a time or import an agency roster from CSV. Access to other agencies is never shown here.</p>
    </header>

    <div className="mt-6 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Single user</p>
        <h2 className="mt-2 text-2xl font-black text-slate-950">Send one invitation</h2>
        <p className="mt-2 text-sm text-slate-600">Best for adding an occasional new employee or instructor.</p>
        <form onSubmit={invite} className="mt-5 grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <input required placeholder="First name" className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })}/>
            <input required placeholder="Last name" className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })}/>
          </div>
          <input required type="email" placeholder="Email" className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}/>
          <select className="rounded-xl border border-slate-300 bg-white p-3 text-slate-900 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value as EpcrRole })}>{roles.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}</select>
          <button className="rounded-xl bg-gradient-to-r from-[#0b1f4d] to-[#0878d1] px-5 py-3 font-black text-white shadow-lg shadow-blue-900/20 transition hover:brightness-110">Send secure invitation</button>
        </form>
        {message && <p role="status" className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4 font-bold text-blue-950">{message}</p>}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-700">Bulk onboarding</p>
            <h2 className="mt-2 text-2xl font-black text-slate-950">Import users from CSV</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Upload up to 100 users at once. Apollo validates every row before any invitation is sent.</p>
          </div>
          <button type="button" onClick={downloadTemplate} className="rounded-xl border border-blue-700 bg-white px-4 py-2.5 text-sm font-black text-blue-700 transition hover:bg-blue-50">Download CSV template</button>
        </div>

        <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5">
          <label className="block cursor-pointer">
            <span className="block text-sm font-black text-slate-950">Choose CSV roster</span>
            <span className="mt-1 block text-sm text-slate-600">Required columns: first_name, last_name, email, role</span>
            <input type="file" accept=".csv,text/csv" onChange={(event) => void handleCsvFile(event)} className="mt-4 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-700 file:px-4 file:py-2.5 file:font-black file:text-white hover:file:bg-blue-800"/>
          </label>
          <p className="mt-3 text-xs leading-5 text-slate-500">Role values may be CLINICIAN, REVIEWER, ADMIN, or PRIMARY_ADMIN. Friendly values such as Student, Instructor, and User are also accepted. Only a Primary Admin can import another Primary Admin.</p>
        </div>

        {(csvFileName || csvMessage) && <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
          {csvFileName && <p className="font-black text-blue-950">{csvFileName}</p>}
          {csvMessage && <p role="status" className="mt-1 text-sm font-bold text-blue-900">{csvMessage}</p>}
        </div>}

        {csvPreview.length > 0 && <>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
            <div className="rounded-xl bg-emerald-50 p-3"><b className="block text-xl text-emerald-800">{importedCount || readyCount}</b><span className="font-bold text-emerald-700">{importedCount ? 'Imported' : 'Ready'}</span></div>
            <div className="rounded-xl bg-red-50 p-3"><b className="block text-xl text-red-800">{errorCount}</b><span className="font-bold text-red-700">Needs attention</span></div>
            <div className="rounded-xl bg-slate-100 p-3"><b className="block text-xl text-slate-800">{csvPreview.length}</b><span className="font-bold text-slate-600">Total rows</span></div>
          </div>
          <div className="mt-4 max-h-96 overflow-auto rounded-2xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-100 text-xs uppercase tracking-wide text-slate-600"><tr><th className="px-3 py-3">Row</th><th className="px-3 py-3">User</th><th className="px-3 py-3">Role</th><th className="px-3 py-3">Username</th><th className="px-3 py-3">Status</th></tr></thead>
              <tbody className="divide-y divide-slate-200 bg-white">{csvPreview.map((row) => <tr key={`${row.row}-${row.email}`} className={row.valid ? '' : 'bg-red-50/60'}>
                <td className="px-3 py-3 font-bold text-slate-500">{row.row}</td>
                <td className="px-3 py-3"><b className="text-slate-950">{row.first_name} {row.last_name}</b><br/><span className="text-xs text-slate-600">{row.email}</span></td>
                <td className="px-3 py-3 font-bold text-slate-700">{String(row.role).replaceAll('_', ' ')}</td>
                <td className="px-3 py-3 text-slate-600">{row.username ? `@${row.username}` : '—'}</td>
                <td className="px-3 py-3">{row.imported ? <span className="font-black text-emerald-700">Invitation sent</span> : row.valid ? <span className="font-black text-emerald-700">Ready</span> : <span className="font-bold text-red-700">{row.error}</span>}</td>
              </tr>)}</tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-wrap gap-3">
            {readyCount > 0 && <button type="button" disabled={csvWorking} onClick={() => void importCsvUsers()} className="rounded-xl bg-gradient-to-r from-[#0b1f4d] to-[#0878d1] px-5 py-3 font-black text-white shadow-lg shadow-blue-900/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">{csvWorking ? 'Working...' : `Import ${readyCount} valid user${readyCount === 1 ? '' : 's'}`}</button>}
            <button type="button" disabled={csvWorking} onClick={resetCsv} className="rounded-xl border border-slate-300 px-5 py-3 font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50">Clear import</button>
          </div>
        </>}
      </section>
    </div>

    <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-xl sm:p-8">
      <h2 className="text-xl font-black text-slate-950">Agency users</h2>
      <div className="mt-5 space-y-3">{members.map((member) => <div key={member.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3"><span><b className="text-slate-950">{member.first_name} {member.last_name}</b><br/><span className="text-sm text-slate-600">{member.email} &middot; @{member.username}</span>{member.status === 'REVOKED' && member.revoked_at && <><br/><span className="text-xs text-slate-500">Revoked {new Date(member.revoked_at).toLocaleString()}{member.revoked_by ? ` by ${member.revoked_by}` : ''}</span></>}</span><b className="rounded-full bg-blue-100 px-3 py-1 text-xs text-blue-900">{member.status}</b></div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <select aria-label={`Role for ${member.first_name} ${member.last_name}`} disabled={!canManage(member) || workingId === member.id || member.id === actor?.id} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-bold text-slate-900 disabled:opacity-50" value={member.role} onChange={(e) => void update(member, 'SET_ROLE', e.target.value as EpcrRole)}>
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
