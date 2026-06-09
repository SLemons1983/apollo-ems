import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xyrusrspvyuwpplhhett.supabase.co';

export async function GET() {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
    }

    const supabase = createClient(SUPABASE_URL, serviceRoleKey);

    const { data, error } = await supabase
      .from('incident_reports')
      .select('id,incident_number,created_at,employee_name,category,assigned_supervisor,status')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({ incidentReports: data ?? [] });
  } catch (error) {
    console.error('Incident report list error:', error);
    return NextResponse.json({ error: 'Failed to load incident reports.' }, { status: 500 });
  }
}
