import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { currentEpcrMembership, epcrAdminClient } from '@/lib/epcrServer';
import { EPCR_ROLES, validateInvite, type EpcrRole } from '@/lib/epcrAccess';

const SUPABASE_URL = 'https://xyrusrspvyuwpplhhett.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_Pprc1W8EQ4tFMo_hvIX60A_t9zBIFaU';
const MAX_BULK_USERS = 100;

type Access = NonNullable<Awaited<ReturnType<typeof currentEpcrMembership>>>;
type ValidatedInvite = { first_name: string; last_name: string; email: string; role: EpcrRole; base: string };

type BulkRowResult = {
  row: number;
  first_name: string;
  last_name: string;
  email: string;
  role: EpcrRole | string;
  username?: string;
  valid: boolean;
  error?: string;
};

async function agencyAdmin() {
  const access = await currentEpcrMembership();
  if (!access || !['PRIMARY_ADMIN', 'ADMIN'].includes(access.membership.role)) return null;
  return access;
}

function mayManageRole(actorRole: EpcrRole, targetRole: EpcrRole) {
  return actorRole === 'PRIMARY_ADMIN' || targetRole !== 'PRIMARY_ADMIN';
}

async function uniqueUsername(agencyId: string, base: string) {
  const db = epcrAdminClient();
  const { data, error } = await db.from('epcr_memberships').select('username').eq('agency_id', agencyId).like('username', `${base}%`);
  if (error) throw new Error(error.message);
  const used = new Set((data ?? []).map((row) => row.username));
  if (!used.has(base)) return base;
  let suffix = 2;
  while (used.has(`${base}${suffix}`)) suffix += 1;
  return `${base}${suffix}`;
}

function reserveUsername(base: string, used: Set<string>) {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let suffix = 2;
  while (used.has(`${base}${suffix}`)) suffix += 1;
  const username = `${base}${suffix}`;
  used.add(username);
  return username;
}

async function ensureEpcrEnabled(agencyId: string) {
  const db = epcrAdminClient();
  const { data: agency, error } = await db.from('apollo_agencies').select('enabled_modules').eq('id', agencyId).maybeSingle();
  if (error) throw new Error(error.message);
  return Boolean(agency?.enabled_modules?.includes('ePCR Beta'));
}

async function validateBulkRows(access: Access, rows: unknown[]): Promise<BulkRowResult[]> {
  const db = epcrAdminClient();
  const agencyId = access.membership.agency_id;
  const parsedRows = rows.map((row, index) => {
    const parsed = validateInvite(row);
    const raw = row && typeof row === 'object' ? row as Record<string, unknown> : {};
    return {
      row: index + 2,
      raw,
      parsed,
    };
  });

  const emails = parsedRows
    .flatMap((item) => item.parsed.data ? [item.parsed.data.email] : []);
  const duplicateEmails = new Set<string>();
  const seenEmails = new Set<string>();
  for (const email of emails) {
    if (seenEmails.has(email)) duplicateEmails.add(email);
    seenEmails.add(email);
  }

  const [{ data: existingMembers, error: memberError }, { data: usernames, error: usernameError }] = await Promise.all([
    emails.length
      ? db.from('epcr_memberships').select('email,status').eq('agency_id', agencyId).in('email', [...new Set(emails)])
      : Promise.resolve({ data: [], error: null }),
    db.from('epcr_memberships').select('username').eq('agency_id', agencyId),
  ]);
  if (memberError) throw new Error(memberError.message);
  if (usernameError) throw new Error(usernameError.message);

  const existingByEmail = new Map<string, string>((existingMembers ?? []).map((member: { email: string; status: string }) => [member.email, member.status]));
  const usedUsernames = new Set<string>((usernames ?? []).map((item: { username: string }) => item.username));

  return parsedRows.map(({ row, raw, parsed }) => {
    const fallback = {
      row,
      first_name: String(raw.first_name ?? '').trim(),
      last_name: String(raw.last_name ?? '').trim(),
      email: String(raw.email ?? '').trim().toLowerCase(),
      role: String(raw.role ?? '').trim(),
    };
    if (!parsed.data) return { ...fallback, valid: false, error: parsed.error };
    const data = parsed.data;
    if (!mayManageRole(access.membership.role, data.role)) {
      return { row, ...data, valid: false, error: 'Only a Primary Admin can invite another Primary Admin.' };
    }
    if (duplicateEmails.has(data.email)) {
      return { row, ...data, valid: false, error: 'This email appears more than once in the import file.' };
    }
    const existingStatus = existingByEmail.get(data.email);
    if (existingStatus) {
      return {
        row,
        ...data,
        valid: false,
        error: existingStatus === 'REVOKED'
          ? 'This user already has a revoked membership. Use Send new invitation instead.'
          : 'This email already belongs to an agency user.',
      };
    }
    return { row, ...data, username: reserveUsername(data.base, usedUsernames), valid: true };
  });
}

async function inviteValidatedUser(request: NextRequest, access: Access, data: ValidatedInvite) {
  const db = epcrAdminClient();
  const agencyId = access.membership.agency_id;
  const { data: existing } = await db.from('epcr_memberships').select('id,status').eq('agency_id', agencyId).eq('email', data.email).maybeSingle();
  if (existing) throw new Error(existing.status === 'REVOKED' ? 'This user already has a revoked membership. Use Send new invitation instead.' : 'This email already belongs to an agency user.');

  const username = await uniqueUsername(agencyId, data.base);
  const origin = new URL(request.url).origin;
  const { data: invited, error: inviteError } = await db.auth.admin.inviteUserByEmail(data.email, {
    redirectTo: `${origin}/epcr/setup-password`,
    data: { first_name: data.first_name, last_name: data.last_name, epcr_username: username },
  });
  if (inviteError || !invited.user) throw new Error(inviteError?.message ?? 'Unable to send invitation.');

  const { data: member, error } = await db.from('epcr_memberships').insert({
    agency_id: agencyId,
    auth_user_id: invited.user.id,
    first_name: data.first_name,
    last_name: data.last_name,
    email: data.email,
    username,
    role: data.role,
    invited_by: access.user.email,
  }).select().single();

  if (error) {
    await db.auth.admin.deleteUser(invited.user.id).catch(() => undefined);
    throw new Error(error.message);
  }
  return member;
}

export async function GET() {
  const access = await agencyAdmin();
  if (!access) return NextResponse.json({ error: 'Agency administrator access is required.' }, { status: 403 });
  const db = epcrAdminClient();
  const { data, error } = await db.from('epcr_memberships').select('*').eq('agency_id', access.membership.agency_id).order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ members: data, actor: { id: access.membership.id, role: access.membership.role } });
}

export async function POST(request: NextRequest) {
  const access = await agencyAdmin();
  if (!access) return NextResponse.json({ error: 'Agency administrator access is required.' }, { status: 403 });

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ error: 'Request details are required.' }, { status: 400 }); }

  const input = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const action = String(input.action ?? '');

  if (action === 'VALIDATE_BULK' || action === 'IMPORT_BULK') {
    const rows = Array.isArray(input.users) ? input.users : [];
    if (!rows.length) return NextResponse.json({ error: 'Add at least one user to the import file.' }, { status: 400 });
    if (rows.length > MAX_BULK_USERS) return NextResponse.json({ error: `Import up to ${MAX_BULK_USERS} users at a time.` }, { status: 400 });

    try {
      if (!await ensureEpcrEnabled(access.membership.agency_id)) {
        return NextResponse.json({ error: 'ePCR access is not enabled for this agency.' }, { status: 400 });
      }
      const validation = await validateBulkRows(access, rows);
      if (action === 'VALIDATE_BULK') return NextResponse.json({ rows: validation });

      const ready = validation.filter((row) => row.valid);
      const results: Array<BulkRowResult & { imported?: boolean }> = validation
        .filter((row) => !row.valid)
        .map((row) => ({ ...row, imported: false }));

      for (const row of ready) {
        const parsed = validateInvite(row);
        if (!parsed.data) {
          results.push({ ...row, valid: false, imported: false, error: parsed.error });
          continue;
        }
        try {
          const member = await inviteValidatedUser(request, access, parsed.data);
          results.push({ ...row, username: member.username, imported: true });
        } catch (error) {
          results.push({ ...row, valid: false, imported: false, error: error instanceof Error ? error.message : 'Unable to import this user.' });
        }
      }

      results.sort((a, b) => a.row - b.row);
      return NextResponse.json({
        results,
        imported: results.filter((row) => row.imported).length,
        skipped: results.filter((row) => !row.imported).length,
      });
    } catch (error) {
      return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to process the user import.' }, { status: 400 });
    }
  }

  const parsed = validateInvite(body);
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (!mayManageRole(access.membership.role, parsed.data.role)) return NextResponse.json({ error: 'Only a Primary Admin can invite another Primary Admin.' }, { status: 403 });

  try {
    if (!await ensureEpcrEnabled(access.membership.agency_id)) return NextResponse.json({ error: 'ePCR access is not enabled for this agency.' }, { status: 400 });
    const member = await inviteValidatedUser(request, access, parsed.data);
    return NextResponse.json({ member });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send invitation.';
    const status = message.includes('already') ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(request: NextRequest) {
  const access = await agencyAdmin();
  if (!access) return NextResponse.json({ error: 'Agency administrator access is required.' }, { status: 403 });
  const body = await request.json() as { membership_id?: unknown; action?: unknown; role?: unknown };
  const membershipId = String(body.membership_id ?? '');
  const action = String(body.action ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(membershipId)) return NextResponse.json({ error: 'Select a valid agency user.' }, { status: 400 });
  if (membershipId === access.membership.id && ['REVOKE', 'SET_ROLE'].includes(action)) return NextResponse.json({ error: 'Use another Primary Admin to change your own role or remove your access.' }, { status: 409 });

  const db = epcrAdminClient();
  const agencyId = access.membership.agency_id;
  const { data: member } = await db.from('epcr_memberships').select('*').eq('id', membershipId).eq('agency_id', agencyId).maybeSingle();
  if (!member) return NextResponse.json({ error: 'The agency user was not found.' }, { status: 404 });
  if (!mayManageRole(access.membership.role, member.role)) return NextResponse.json({ error: 'Only a Primary Admin can manage a Primary Admin.' }, { status: 403 });

  if (action === 'SET_ROLE') {
    const role = String(body.role ?? '') as EpcrRole;
    if (!EPCR_ROLES.includes(role)) return NextResponse.json({ error: 'Select a valid role.' }, { status: 400 });
    if (!mayManageRole(access.membership.role, role)) return NextResponse.json({ error: 'Only a Primary Admin can assign the Primary Admin role.' }, { status: 403 });
    const { data: updated, error } = await db.from('epcr_memberships').update({ role }).eq('id', member.id).eq('agency_id', agencyId).select().maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    return NextResponse.json({ member: updated });
  }

  if (action === 'REVOKE') {
    if (!['ACTIVE', 'INVITED'].includes(member.status)) return NextResponse.json({ error: 'Only active access or a pending invitation can be revoked.' }, { status: 409 });
    const { data: updated, error } = await db.from('epcr_memberships').update({ status: 'REVOKED', revoked_at: new Date().toISOString(), revoked_by: access.user.email }).eq('id', member.id).eq('agency_id', agencyId).eq('status', member.status).select().maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 409 });
    if (!updated) return NextResponse.json({ error: 'Access changed before this request completed. Refresh and try again.' }, { status: 409 });
    return NextResponse.json({ member: updated });
  }

  if (action === 'REINVITE') {
    if (!['INVITED', 'REVOKED'].includes(member.status)) return NextResponse.json({ error: 'Only a pending or revoked user can receive a new invitation.' }, { status: 409 });
    const auth = createClient(SUPABASE_URL, PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
    const { error: resendError } = await auth.auth.resetPasswordForEmail(member.email, { redirectTo: `${new URL(request.url).origin}/epcr/setup-password` });
    if (resendError) return NextResponse.json({ error: resendError.message }, { status: 400 });
    const { data: updated, error } = await db.from('epcr_memberships').update({ status: 'INVITED', last_invited_at: new Date().toISOString(), revoked_at: null, revoked_by: null }).eq('id', member.id).eq('agency_id', agencyId).eq('status', member.status).select().maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ member: updated });
  }

  return NextResponse.json({ error: 'Select a valid user action.' }, { status: 400 });
}
