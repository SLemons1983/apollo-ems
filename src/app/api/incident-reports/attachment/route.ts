import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xyrusrspvyuwpplhhett.supabase.co';
const ATTACHMENT_BUCKET = 'incident-report-attachments';

export async function POST(request: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
    }

    const body = await request.json();
    const attachmentPath = String(body.attachmentPath ?? '').trim();

    if (!attachmentPath) {
      return NextResponse.json({ error: 'Missing attachment path.' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, serviceRoleKey);

    const { data, error } = await supabase.storage
      .from(ATTACHMENT_BUCKET)
      .createSignedUrl(attachmentPath, 300);

    if (error) {
      throw error;
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (error) {
    console.error('Incident report attachment error:', error);
    return NextResponse.json({ error: 'Failed to open attachment.' }, { status: 500 });
  }
}
