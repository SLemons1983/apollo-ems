import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!serviceRoleKey) {
    return NextResponse.json({ error: 'Server configuration missing.' }, { status: 500 });
  }

  const cookieStore = await cookies();
  const session = cookieStore.get('apollo_dispatch_session');

  if (!session || session.value !== 'active') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient('https://xyrusrspvyuwpplhhett.supabase.co', serviceRoleKey);

  const assignments: any[] = [];
  let assignmentPageStart = 0;
  const assignmentPageSize = 1000;

  while (true) {
    const { data: assignmentPage, error: assignmentError } = await supabase
      .from('schedule_assignments')
      .select('*')
      .order('date_key', { ascending: true })
      .order('shift_key', { ascending: true })
      .order('slot_number', { ascending: true })
      .range(assignmentPageStart, assignmentPageStart + assignmentPageSize - 1);

    if (assignmentError) {
      return NextResponse.json({ error: assignmentError.message }, { status: 500 });
    }

    assignments.push(...(assignmentPage ?? []));

    if (!assignmentPage || assignmentPage.length < assignmentPageSize) {
      break;
    }

    assignmentPageStart += assignmentPageSize;
  }

  const employeesResult = await supabase.from('employees').select('id,first_name,last_name');

  if (employeesResult.error) {
    return NextResponse.json({ error: employeesResult.error.message }, { status: 500 });
  }

  return NextResponse.json({
    assignments,
    employees: employeesResult.data ?? [],
  });
}
