import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://xyrusrspvyuwpplhhett.supabase.co';
const CERTIFICATION_BUCKET = 'employee-certifications';

export async function POST(request: NextRequest) {
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!serviceRoleKey) {
      throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable.');
    }

    const body = await request.json();
    const documentPath = String(body.documentPath ?? '').trim();

    if (!documentPath) {
      return NextResponse.json({ error: 'Missing certification document path.' }, { status: 400 });
    }

    if (documentPath.includes('..') || documentPath.startsWith('/')) {
      return NextResponse.json({ error: 'Invalid certification document path.' }, { status: 400 });
    }

    const supabase = createClient(SUPABASE_URL, serviceRoleKey);

    const { data, error } = await supabase.storage
      .from(CERTIFICATION_BUCKET)
      .createSignedUrl(documentPath, 300);

    if (error) {
      throw error;
    }

    return NextResponse.json({ signedUrl: data.signedUrl });
  } catch (error) {
    console.error('Employee certification view error:', error);
    return NextResponse.json({ error: 'Failed to open employee certification.' }, { status: 500 });
  }
}
