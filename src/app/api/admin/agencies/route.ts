import { NextResponse } from 'next/server';
import { getOwnerAdminClient } from '@/lib/adminApi';
import { validateAgencyInput } from '@/lib/adminAgencies';

export async function GET() {
  try {
    const owner = await getOwnerAdminClient();
    if (!owner) return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    const { data, error } = await owner.db.from('apollo_agencies').select('*').order('name');
    if (error) throw error;
    return NextResponse.json({ agencies: data ?? [] });
  } catch (error) {
    console.error('Agency list failed:', error);
    return NextResponse.json({ error: 'Agency registry is unavailable. Confirm the agency migration has been applied.' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const owner = await getOwnerAdminClient();
    if (!owner) return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
    const result = validateAgencyInput(await request.json());
    if (!result.data) return NextResponse.json({ error: result.error }, { status: 400 });
    const { data, error } = await owner.db.from('apollo_agencies').insert({ ...result.data, created_by: owner.user.email, updated_by: owner.user.email }).select('*').single();
    if (error?.code === '23505') return NextResponse.json({ error: 'That agency name or slug is already in use.' }, { status: 409 });
    if (error) throw error;
    return NextResponse.json({ agency: data }, { status: 201 });
  } catch (error) {
    console.error('Agency creation failed:', error);
    return NextResponse.json({ error: 'Agency could not be created.' }, { status: 500 });
  }
}
