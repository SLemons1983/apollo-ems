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

  const [assignmentsResult, employeesResult] = await Promise.all([
    supabase.from('schedule_assignments').select('*'),
    supabase.from('employees').select('id,first_name,last_name'),
  ]);

  return NextResponse.json({
    assignments: assignmentsResult.data ?? [],
    employees: employeesResult.data ?? [],
  });
}
