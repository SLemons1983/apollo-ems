import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { currentEpcrMembership, epcrAdminClient } from '@/lib/epcrServer';
import { EPCR_ROLES, validateInvite, type EpcrRole } from '@/lib/epcrAccess';

const SUPABASE_URL = 'https://xyrusrspvyuwpplhhett.supabase.co';
const PUBLISHABLE_KEY = 'sb_publishable_Pprc1W8EQ4tFMo_hvIX60A_t9zBIFaU';

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
  const parsed = validateInvite(await request.json());
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });
  if (!mayManageRole(access.membership.role, parsed.data.role)) return NextResponse.json({ error: 'Only a Primary Admin can invite another Primary Admin.' }, { status: 403 });

  const db = epcrAdminClient();
  const agencyId = access.membership.agency_id;
  const { data: agency } = await db.from('apollo_agencies').select('enabled_modules').eq('id', agencyId).maybeSingle();
  if (!agency?.enabled_modules?.includes('ePCR Beta')) return NextResponse.json({ error: 'ePCR access is not enabled for this agency.' }, { status: 400 });
  const { data: existing } = await db.from('epcr_memberships').select('id,status').eq('agency_id', agencyId).eq('email', parsed.data.email).maybeSingle();
  if (existing) return NextResponse.json({ error: existing.status === 'REVOKED' ? 'This user already has a revoked membership. Use Send new invitation instead.' : 'This email already belongs to an agency user.' }, { status: 409 });

  let username: string;
  try { username = await uniqueUsername(agencyId, parsed.data.base); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Unable to generate a username.' }, { status: 400 }); }
  const origin = new URL(request.url).origin;
  const { data: invited, error: inviteError } = await db.auth.admin.inviteUserByEmail(parsed.data.email, { redirectTo: `${origin}/epcr/setup-password`, data: { first_name: parsed.data.first_name, last_name: parsed.data.last_name, epcr_username: username } });
  if (inviteError || !invited.user) return NextResponse.json({ error: inviteError?.message ?? 'Unable to send invitation.' }, { status: 400 });
  const { data: member, error } = await db.from('epcr_memberships').insert({ agency_id: agencyId, auth_user_id: invited.user.id, first_name: parsed.data.first_name, last_name: parsed.data.last_name, email: parsed.data.email, username, role: parsed.data.role, invited_by: access.user.email }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ member });
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
