import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  try {
    const cookieStore = await cookies();

    const auth = createServerClient(
      'https://xyrusrspvyuwpplhhett.supabase.co',
      'sb_publishable_Pprc1W8EQ4tFMo_hvIX60A_t9zBIFaU',
      {
        cookies: {
          getAll: () => cookieStore.getAll(),
          setAll() {},
        },
      },
    );

    const {
      data: { user },
      error: userError,
    } = await auth.auth.getUser();

    if (userError || !user?.email) {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured.');
    }

    const db = createClient(
      'https://xyrusrspvyuwpplhhett.supabase.co',
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      },
    );

    const { data: supervisor, error: supervisorError } = await db
      .from('employees')
      .select('id,email,role,job_title,status')
      .ilike('email', user.email)
      .maybeSingle();

    const role = (supervisor?.role ?? '').trim().toLowerCase();
    const jobTitle = (supervisor?.job_title ?? '').trim().toLowerCase();
    const status = (supervisor?.status ?? '').trim().toLowerCase();

    const hasSupervisorAccess =
      role === 'supervisor' ||
      role === 'admin' ||
      role === 'gm' ||
      jobTitle.includes('supervisor') ||
      jobTitle.includes('admin') ||
      jobTitle.includes('general manager');

    if (
      supervisorError ||
      !supervisor ||
      status !== 'active' ||
      !hasSupervisorAccess
    ) {
      return NextResponse.json(
        { ok: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    const employeeIds = ['emp-009', 'emp-016'];

    const { data, error } = await db
      .from('submitted_timecards')
      .select(`
        id,
        employee_id,
        employee_name,
        pay_period_key,
        pay_period_start,
        pay_period_end,
        submitted_at,
        total_hours,
        status,
        submission_acknowledgement,
        supervisor_comment,
        reviewed_at,
        reviewed_by,
        updated_at
      `)
      .in('employee_id', employeeIds)
      .order('submitted_at', { ascending: false });

    if (error) {
      console.error('Timecard diagnostic query failed:', error);

      return NextResponse.json(
        {
          ok: false,
          error: error.message,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      employees: {
        'emp-009': 'Carlos Juarez-Lopez',
        'emp-016': 'Tomas Renteria',
      },
      count: data?.length ?? 0,
      rows: data ?? [],
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Unknown diagnostic error';

    if (message === 'SUPERVISOR_API_UNAUTHORIZED') {
      return NextResponse.json(
        { ok: false, error: 'Unauthorized' },
        { status: 401 },
      );
    }

    if (message === 'SUPERVISOR_API_FORBIDDEN') {
      return NextResponse.json(
        { ok: false, error: 'Forbidden' },
        { status: 403 },
      );
    }

    console.error('Timecard diagnostic failed:', error);

    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 },
    );
  }
}
