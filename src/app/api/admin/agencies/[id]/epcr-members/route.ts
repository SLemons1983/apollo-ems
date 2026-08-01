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
  const { count } = await owner.db.from('epcr_memberships').select('id', { count: 'exact', head: true }).eq('agency_id', id).like('username', `${parsed.data.base}%`);
  const username = count ? `${parsed.data.base}${count + 1}` : parsed.data.base;
  const origin = new URL(request.url).origin;
  const { data: invited, error: inviteError } = await owner.db.auth.admin.inviteUserByEmail(parsed.data.email, { redirectTo: `${origin}/epcr/setup-password`, data: { first_name: parsed.data.first_name, last_name: parsed.data.last_name, epcr_username: username } });
  if (inviteError || !invited.user) return NextResponse.json({ error: inviteError?.message ?? 'Unable to send invitation.' }, { status: 400 });
  const { data: member, error } = await owner.db.from('epcr_memberships').insert({ agency_id: id, auth_user_id: invited.user.id, first_name: parsed.data.first_name, last_name: parsed.data.last_name, email: parsed.data.email, username, role: parsed.data.role, invited_by: owner.user.email }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ member });
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const owner = await getOwnerAdminClient();
  if (!owner) return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  const { id } = await params;
  const body = await request.json() as { membership_id?: unknown };
  const membershipId = String(body.membership_id ?? '');
  if (!/^[0-9a-f-]{36}$/i.test(membershipId)) return NextResponse.json({ error: 'Select a valid invited membership.' }, { status: 400 });
  const { data: member, error: memberError } = await owner.db.from('epcr_memberships').select('id,email,status').eq('id', membershipId).eq('agency_id', id).maybeSingle();
  if (memberError || !member) return NextResponse.json({ error: 'The invited membership was not found.' }, { status: 404 });
  if (member.status !== 'INVITED') return NextResponse.json({ error: 'Only an unaccepted invitation can be replaced.' }, { status: 409 });
  const origin = new URL(request.url).origin;
  const auth = createClient('https://xyrusrspvyuwpplhhett.supabase.co', 'sb_publishable_Pprc1W8EQ4tFMo_hvIX60A_t9zBIFaU', { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: resendError } = await auth.auth.resetPasswordForEmail(member.email, { redirectTo: `${origin}/epcr/setup-password` });
  if (resendError) return NextResponse.json({ error: resendError.message }, { status: 400 });
  const { error: updateError } = await owner.db.from('epcr_memberships').update({ last_invited_at: new Date().toISOString() }).eq('id', member.id).eq('agency_id', id).eq('status', 'INVITED');
  if (updateError) return NextResponse.json({ error: updateError.message }, { status: 400 });
  return NextResponse.json({ member });
}
