import { NextRequest, NextResponse } from 'next/server';
import { requireSupervisorApi } from '@/lib/supervisorApi';

export async function GET(request: NextRequest) {
  try {
    const { db } = await requireSupervisorApi(request);

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
