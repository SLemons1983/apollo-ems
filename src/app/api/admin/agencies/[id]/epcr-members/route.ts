import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getOwnerAdminClient } from '@/lib/adminApi';
import { validateInvite } from '@/lib/epcrAccess';

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const owner = await getOwnerAdminClient();
  if (!owner) return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  const { id } = await params;
  const { data, error } = await owner.db.from('epcr_memberships').select('*').eq('agency_id', id).order('created_at');
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ members: data });
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const owner = await getOwnerAdminClient();
  if (!owner) return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  const { id } = await params;
  const parsed = validateInvite(await request.json());
  if (!parsed.data) return NextResponse.json({ error: parsed.error }, { status: 400 });
  const { data: agency } = await owner.db.from('apollo_agencies').select('name,enabled_modules').eq('id', id).maybeSingle();
  if (!agency || !agency.enabled_modules?.includes('ePCR Beta')) return NextResponse.json({ error: 'Enable ePCR Beta for this agency before inviting users.' }, { status: 400 });
  const { data: sameAgencyMembership } = await owner.db.from('epcr_memberships').select('id,status').eq('agency_id', id).ilike('email', parsed.data.email).in('status', ['INVITED', 'ACTIVE']).maybeSingle();
  if (sameAgencyMembership) return NextResponse.json({ error: 'This email already has ePCR access for this agency.' }, { status: 409 });

  const { count } = await owner.db.from('epcr_memberships').select('id', { count: 'exact', head: true }).eq('agency_id', id).like('username', `${parsed.data.base}%`);
  const username = count ? `${parsed.data.base}${count + 1}` : parsed.data.base;

  // An ePCR identity belongs to the person, while memberships belong to agencies.
  // Reuse an existing Auth identity instead of sending another invitation.
  const { data: existingMembership } = await owner.db.from('epcr_memberships').select('auth_user_id').ilike('email', parsed.data.email).not('auth_user_id', 'is', null).limit(1).maybeSingle();
  const existingAuthUserId = existingMembership?.auth_user_id ?? null;

  let authUserId = existingAuthUserId;
  let status: 'ACTIVE' | 'INVITED' = existingAuthUserId ? 'ACTIVE' : 'INVITED';
  let invitationSent = false;

  if (!authUserId) {
    const origin = new URL(request.url).origin;
    const { data: invited, error: inviteError } = await owner.db.auth.admin.inviteUserByEmail(parsed.data.email, { redirectTo: `${origin}/epcr/setup-password`, data: { first_name: parsed.data.first_name, last_name: parsed.data.last_name, epcr_username: username } });
    if (inviteError || !invited.user) {
      const message = inviteError?.message ?? 'Unable to send invitation.';
      const rateLimited = /rate|limit|too many/i.test(message);
      return NextResponse.json({ error: rateLimited ? 'Supabase has temporarily limited authentication emails. Existing Apollo ePCR users can still be added to additional agencies without sending another invitation. Please retry new-user invitations after the email limit resets.' : message }, { status: rateLimited ? 429 : 400 });
    }
    authUserId = invited.user.id;
    invitationSent = true;
  }

  const now = new Date().toISOString();
  const { data: member, error } = await owner.db.from('epcr_memberships').insert({ agency_id: id, auth_user_id: authUserId, first_name: parsed.data.first_name, last_name: parsed.data.last_name, email: parsed.data.email, username, role: parsed.data.role, status, accepted_at: status === 'ACTIVE' ? now : null, invited_by: owner.user.email }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ member, invitation_sent: invitationSent, reused_existing_account: Boolean(existingAuthUserId) });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const owner = await getOwnerAdminClient();
  if (!owner) return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  const { id } = await params;
  const body = await request.json() as { membership_id?: unknown; action?: unknown };
  const membershipId = String(body.membership_id ?? '');
  const action = String(body.action ?? 'REINVITE');
  if (!/^[0-9a-f-]{36}$/i.test(membershipId)) return NextResponse.json({ error: 'Select a valid ePCR membership.' }, { status: 400 });
  const { data: member, error: memberError } = await owner.db.from('epcr_memberships').select('id,email,status,role').eq('id', membershipId).eq('agency_id', id).maybeSingle();
  if (memberError || !member) return NextResponse.json({ error: 'The ePCR membership was not found.' }, { status: 404 });

  if (action === 'REVOKE') {
    if (!['ACTIVE', 'INVITED'].includes(member.status)) return NextResponse.json({ error: 'Only active access or a pending invitation can be revoked.' }, { status: 409 });
    if (member.status === 'ACTIVE' && member.role === 'PRIMARY_ADMIN') {
      const { count, error: countError } = await owner.db.from('epcr_memberships').select('id', { count: 'exact', head: true }).eq('agency_id', id).eq('role', 'PRIMARY_ADMIN').eq('status', 'ACTIVE');
      if (countError) return NextResponse.json({ error: countError.message }, { status: 400 });
      if ((count ?? 0) <= 1) return NextResponse.json({ error: 'Assign and activate another Primary Admin before removing this user. Every agency must retain at least one active Primary Admin.' }, { status: 409 });
    }
    const revokedAt = new Date().toISOString();
    const { data: updated, error: updateError } = await owner.db.from('epcr_memberships').update({ status: 'REVOKED', revoked_at: revokedAt, revoked_by: owner.user.email }).eq('id', member.id).eq('agency_id', id).eq('status', member.status).select().maybeSingle();
    if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
    if (!updated) return NextResponse.json({ error: 'Access changed before this request completed. Refresh and try again.' }, { status: 409 });
    return NextResponse.json({ member: updated });
  }

  if (action !== 'REINVITE') return NextResponse.json({ error: 'Select a valid access action.' }, { status: 400 });
  if (!['INVITED', 'REVOKED'].includes(member.status)) return NextResponse.json({ error: 'Only an unaccepted or revoked membership can receive a fresh invitation.' }, { status: 409 });
  const origin = new URL(request.url).origin;
  const auth = createClient('https://xyrusrspvyuwpplhhett.supabase.co', 'sb_publishable_Pprc1W8EQ4tFMo_hvIX60A_t9zBIFaU', { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: resendError } = await auth.auth.resetPasswordForEmail(member.email, { redirectTo: `${origin}/epcr/setup-password` });
  if (resendError) return NextResponse.json({ error: resendError.message }, { status: 400 });
  const { data: updated, error: updateError } = await owner.db.from('epcr_memberships').update({ status: 'INVITED', last_invited_at: new Date().toISOString(), revoked_at: null, revoked_by: null }).eq('id', member.id).eq('agency_id', id).eq('status', member.status).select().maybeSingle();
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  if (!updated) return NextResponse.json({ error: 'Access changed before this request completed. Refresh and try again.' }, { status: 409 });
  return NextResponse.json({ member: updated });
}
