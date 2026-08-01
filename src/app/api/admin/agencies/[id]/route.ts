import { NextResponse } from 'next/server';
import { getOwnerAdminClient } from '@/lib/adminApi';
import { validateAgencyInput } from '@/lib/adminAgencies';

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const owner = await getOwnerAdminClient();
    if (!owner) return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    const { id } = await context.params;
    const { data, error } = await owner.db.from('apollo_agencies').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    if (!data) return NextResponse.json({ error: 'Agency not found.' }, { status: 404 });
    return NextResponse.json({ agency: data });
  } catch (error) {
    console.error('Agency read failed:', error);
    return NextResponse.json({ error: 'Agency could not be loaded.' }, { status: 500 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const owner = await getOwnerAdminClient();
    if (!owner) return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    const result = validateAgencyInput(await request.json());
    if (!result.data) return NextResponse.json({ error: result.error }, { status: 400 });
    const { id } = await context.params;
    const { data, error } = await owner.db.from('apollo_agencies').update({ ...result.data, updated_by: owner.user.email }).eq('id', id).select('*').single();
    if (error?.code === '23505') return NextResponse.json({ error: 'That agency name or slug is already in use.' }, { status: 409 });
    if (error) throw error;
    return NextResponse.json({ agency: data });
  } catch (error) {
    console.error('Agency update failed:', error);
    return NextResponse.json({ error: 'Agency could not be updated.' }, { status: 500 });
  }
}
