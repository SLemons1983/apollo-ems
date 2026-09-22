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

function rowsToUsers(parsed: string[][]): { users?: CsvInputRow[]; error?: string } {
  if (parsed.length < 2) return { error: 'The import file must include a header row and at least one user.' };
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

  const users = parsed.slice(1)
    .filter((values) => values.some((value) => String(value ?? '').trim()))
    .map((values) => ({
      first_name: values[positions.first_name] ?? '',
      last_name: values[positions.last_name] ?? '',
      email: values[positions.email] ?? '',
      role: values[positions.role] ?? '',
    }));
  if (!users.length) return { error: 'Add at least one user to the import file.' };
  return { users };
}

function csvRowsFromText(text: string) {
  return rowsToUsers(parseCsv(text.replace(/^\uFEFF/, '')));
}

type ZipEntry = { name: string; method: number; compressedSize: number; localOffset: number };

function findZipEnd(view: DataView) {
  const signature = 0x06054b50;
  const start = Math.max(0, view.byteLength - 65557);
  for (let offset = view.byteLength - 22; offset >= start; offset -= 1) {
    if (view.getUint32(offset, true) === signature) return offset;
  }
  return -1;
}

function zipEntries(buffer: ArrayBuffer) {
  const view = new DataView(buffer);
  const decoder = new TextDecoder();
  const end = findZipEnd(view);
  if (end < 0) throw new Error('The Excel file is not a valid .xlsx workbook.');
  const entryCount = view.getUint16(end + 10, true);
  let offset = view.getUint32(end + 16, true);
  const entries = new Map<string, ZipEntry>();

  for (let index = 0; index < entryCount; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error('The Excel workbook directory is invalid.');
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const nameBytes = new Uint8Array(buffer, offset + 46, fileNameLength);
    const name = decoder.decode(nameBytes);
    entries.set(name, { name, method, compressedSize, localOffset });
    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

async function zipEntryText(buffer: ArrayBuffer, entry: ZipEntry) {
  const view = new DataView(buffer);
  const local = entry.localOffset;
  if (view.getUint32(local, true) !== 0x04034b50) throw new Error(`Workbook entry ${entry.name} is invalid.`);
  const fileNameLength = view.getUint16(local + 26, true);
  const extraLength = view.getUint16(local + 28, true);
  const start = local + 30 + fileNameLength + extraLength;
  const compressed = new Uint8Array(buffer.slice(start, start + entry.compressedSize));

  if (entry.method === 0) return new TextDecoder().decode(compressed);
  if (entry.method !== 8 || typeof DecompressionStream === 'undefined') {
    throw new Error('This browser cannot read compressed Excel workbooks. Use a current Chrome, Edge, or Safari browser, or upload CSV instead.');
  }

  const stream = new Blob([compressed]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Response(stream).text();
}

function cellColumn(reference: string) {
  const letters = reference.match(/^[A-Z]+/i)?.[0]?.toUpperCase() ?? '';
  let column = 0;
  for (const letter of letters) column = column * 26 + letter.charCodeAt(0) - 64;
  return column - 1;
}

async function xlsxRowsFromFile(file: File): Promise<{ users?: CsvInputRow[]; error?: string }> {
  if (file.size > 2 * 1024 * 1024) return { error: 'Excel imports must be 2 MB or smaller.' };
  const buffer = await file.arrayBuffer();
  const entries = zipEntries(buffer);
  const workbookEntry = entries.get('xl/workbook.xml');
  const relationshipsEntry = entries.get('xl/_rels/workbook.xml.rels');
  if (!workbookEntry || !relationshipsEntry) return { error: 'The Excel workbook is missing required worksheet information.' };

  const parser = new DOMParser();
  const workbookXml = parser.parseFromString(await zipEntryText(buffer, workbookEntry), 'application/xml');
  const relationshipXml = parser.parseFromString(await zipEntryText(buffer, relationshipsEntry), 'application/xml');
  const sheets = Array.from(workbookXml.getElementsByTagName('sheet'));
  const usersSheet = sheets.find((sheet) => sheet.getAttribute('name')?.trim().toLowerCase() === 'users') ?? sheets[0];
  if (!usersSheet) return { error: 'The Excel workbook does not contain a worksheet.' };
  const relationshipId = usersSheet.getAttribute('r:id') ?? usersSheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id');
  const relationship = Array.from(relationshipXml.getElementsByTagName('Relationship')).find((item) => item.getAttribute('Id') === relationshipId);
  const target = relationship?.getAttribute('Target') ?? '';
  const worksheetPath = target.startsWith('/') ? target.slice(1) : `xl/${target.replace(/^\.\//, '')}`;
  const worksheetEntry = entries.get(worksheetPath);
  if (!worksheetEntry) return { error: 'The Users worksheet could not be read.' };

  let sharedStrings: string[] = [];
  const sharedEntry = entries.get('xl/sharedStrings.xml');
  if (sharedEntry) {
    const sharedXml = parser.parseFromString(await zipEntryText(buffer, sharedEntry), 'application/xml');
    sharedStrings = Array.from(sharedXml.getElementsByTagName('si')).map((item) =>
      Array.from(item.getElementsByTagName('t')).map((text) => text.textContent ?? '').join(''),
    );
  }

  const worksheetXml = parser.parseFromString(await zipEntryText(buffer, worksheetEntry), 'application/xml');
  const parsedRows = Array.from(worksheetXml.getElementsByTagName('row')).map((row) => {
    const values: string[] = [];
    for (const cell of Array.from(row.getElementsByTagName('c'))) {
      const column = cellColumn(cell.getAttribute('r') ?? '');
      if (column < 0) continue;
      const type = cell.getAttribute('t');
      const value = cell.getElementsByTagName('v')[0]?.textContent ?? '';
      const inlineText = Array.from(cell.getElementsByTagName('t')).map((item) => item.textContent ?? '').join('');
      values[column] = type === 's' ? (sharedStrings[Number(value)] ?? '') : type === 'inlineStr' ? inlineText : value;
    }
    return values;
  }).filter((values) => values.some((value) => String(value ?? '').trim()));

  return rowsToUsers(parsedRows);
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
    setCsvMessage('Validating import...');
    setCsvPreview([]);
    const response = await fetch('/api/epcr/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'VALIDATE_BULK', users }),
    });
    const result = await response.json();
    if (!response.ok) {
      setCsvMessage(result.error ?? 'Unable to validate the import file.');
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

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setCsvFileName(file.name);
    setCsvMessage('Reading import file...');
    setCsvPreview([]);
    try {
      const isExcel = file.name.toLowerCase().endsWith('.xlsx');
      const parsed = isExcel ? await xlsxRowsFromFile(file) : csvRowsFromText(await file.text());
      if (!parsed.users) {
        setCsvUsers([]);
        setCsvMessage(parsed.error ?? 'Unable to read the import file.');
        return;
      }
      if (parsed.users.length > 100) {
        setCsvUsers([]);
        setCsvMessage('Import up to 100 users at a time. Split larger rosters into multiple files.');
        return;
      }
      setCsvUsers(parsed.users);
      await validateCsv(parsed.users);
    } catch (error) {
      setCsvUsers([]);
      setCsvMessage(error instanceof Error ? error.message : 'Unable to read that import file.');
    } finally {
      event.target.value = '';
    }
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
      <p className="mt-2 text-slate-600">Invite one person at a time or import an agency roster from Excel or CSV. Access to other agencies is never shown here.</p>
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
            <h2 className="mt-2 text-2xl font-black text-slate-950">Import users from Excel</h2>
            <p className="mt-2 max-w-2xl text-sm text-slate-600">Use the formatted ApolloEMS Excel template with role dropdowns, or upload an existing CSV roster. Apollo validates every row before any invitation is sent.</p>
          </div>
          <a href="/templates/apollo-epcr-user-import-template.xlsx" download className="rounded-xl border border-blue-700 bg-white px-4 py-2.5 text-sm font-black text-blue-700 transition hover:bg-blue-50">Download Excel template</a>
        </div>

        <div className="mt-5 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5">
          <label className="block cursor-pointer">
            <span className="block text-sm font-black text-slate-950">Choose Excel or CSV roster</span>
            <span className="mt-1 block text-sm text-slate-600">Recommended: use the ApolloEMS .xlsx template. Required columns: first_name, last_name, email, role</span>
            <input type="file" accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv" onChange={(event) => void handleImportFile(event)} className="mt-4 block w-full text-sm text-slate-700 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-700 file:px-4 file:py-2.5 file:font-black file:text-white hover:file:bg-blue-800"/>
          </label>
          <p className="mt-3 text-xs leading-5 text-slate-500">The Excel template includes a Role dropdown with Clinician / Student, Reviewer, Admin / Instructor, and Primary Admin. Existing CSV files may also use CLINICIAN, REVIEWER, ADMIN, or PRIMARY_ADMIN. Only a Primary Admin can import another Primary Admin.</p>
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
