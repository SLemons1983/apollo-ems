import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xyrusrspvyuwpplhhett.supabase.co';

const ALLOWED_STATUSES = new Set([
  'NEW',
  'IN_REVIEW',
  'PENDING_EMPLOYEE_RESPONSE',
  'CLOSED',
]);

export async function POST(request: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
    }

    const body = await request.json();

    const id = String(body.id ?? '').trim();
    const status = String(body.status ?? '').trim();
    const supervisorNotes = String(body.supervisorNotes ?? '').trim();
    const closedBy = String(body.closedBy ?? '').trim();

    if (!id || !ALLOWED_STATUSES.has(status)) {
      return NextResponse.json({ error: 'Invalid incident report update.' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, serviceRoleKey);
    const now = new Date().toISOString();

    const updatePayload = {
      status,
      supervisor_notes: supervisorNotes || null,
      updated_at: now,
      closed_at: status === 'CLOSED' ? now : null,
      closed_by: status === 'CLOSED' ? closedBy || null : null,
    };

    const { data, error } = await supabase
      .from('incident_reports')
      .update(updatePayload)
      .eq('id', id)
      .select('id,incident_number,created_at,employee_name,employee_phone,employee_email,category,supervisor_notified,supervisor_name,assigned_supervisor,narrative,status,attachment_name,attachment_type,supervisor_notes,updated_at,closed_at,closed_by')
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({ incidentReport: data });
  } catch (error) {
    console.error('Incident report update error:', error);
    return NextResponse.json({ error: 'Failed to update incident report.' }, { status: 500 });
  }
}
