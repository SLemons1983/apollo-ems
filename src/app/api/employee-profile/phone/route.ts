import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  'https://xyrusrspvyuwpplhhett.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  '';

function normalizeUsPhone(value: string): string | null {
  const digits = value.replace(/\D/g, '');

  if (digits.length === 10) {
    return digits;
  }

  if (digits.length === 11 && digits.startsWith('1')) {
    return digits.slice(1);
  }

  return null;
}

function formatUsPhone(digits: string): string {
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export async function POST(request: NextRequest) {
  try {
    const authorization = request.headers.get('authorization') ?? '';
    const accessToken = authorization.startsWith('Bearer ')
      ? authorization.slice(7).trim()
      : '';

    if (!accessToken) {
      return NextResponse.json(
        { error: 'Authentication required.' },
        { status: 401 },
      );
    }

    if (!SUPABASE_PUBLISHABLE_KEY) {
      console.error('Employee phone update: Supabase publishable key is missing.');
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 },
      );
    }

    const auth = createClient(
      SUPABASE_URL,
      SUPABASE_PUBLISHABLE_KEY,
      {
        global: {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await auth.auth.getUser(accessToken);

    if (userError || !user?.email) {
      return NextResponse.json(
        { error: 'Unable to verify the signed-in employee.' },
        { status: 401 },
      );
    }

    const body = await request.json();
    const requestedPhone =
      typeof body?.phone === 'string' ? body.phone.trim() : '';

    const normalizedPhone = normalizeUsPhone(requestedPhone);

    if (!normalizedPhone) {
      return NextResponse.json(
        { error: 'Enter a valid 10-digit US mobile number.' },
        { status: 400 },
      );
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      console.error('Employee phone update: SUPABASE_SERVICE_ROLE_KEY is missing.');
      return NextResponse.json(
        { error: 'Server configuration error.' },
        { status: 500 },
      );
    }

    const db = createClient(
      SUPABASE_URL,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const normalizedEmail = user.email.trim().toLowerCase();

    const { data: employees, error: employeeLookupError } = await db
      .from('employees')
      .select('id,email')
      .ilike('email', normalizedEmail)
      .limit(2);

    if (employeeLookupError) {
      console.error(
        'Employee phone update lookup failed:',
        employeeLookupError,
      );

      return NextResponse.json(
        { error: 'Unable to locate your employee profile.' },
        { status: 500 },
      );
    }

    if (!employees || employees.length !== 1) {
      console.error(
        'Employee phone update expected exactly one employee profile:',
        normalizedEmail,
        employees?.length ?? 0,
      );

      return NextResponse.json(
        { error: 'Unable to uniquely identify your employee profile.' },
        { status: 409 },
      );
    }

    const formattedPhone = formatUsPhone(normalizedPhone);

    const { error: updateError } = await db
      .from('employees')
      .update({
        phone: formattedPhone,
      })
      .eq('id', employees[0].id);

    if (updateError) {
      console.error('Employee phone update failed:', updateError);

      return NextResponse.json(
        { error: 'Unable to update your mobile number.' },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      phone: formattedPhone,
    });
  } catch (error) {
    console.error('Employee phone update failed:', error);

    return NextResponse.json(
      { error: 'Unable to update your mobile number.' },
      { status: 500 },
    );
  }
}
