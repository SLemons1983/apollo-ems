import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

const SUPABASE_URL = 'https://xyrusrspvyuwpplhhett.supabase.co';
const ANCHOR_DATE_UTC = Date.UTC(2026, 5, 7);
const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');

  if (!serviceRoleKey || !cronSecret) {
    return NextResponse.json({ error: 'Server configuration missing.' }, { status: 500 });
  }

  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  const daysSinceAnchor = Math.floor((todayUtc - ANCHOR_DATE_UTC) / DAY_MS);

  if (daysSinceAnchor < 0 || daysSinceAnchor % 14 !== 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: 'Not a reminder day.' });
  }

  const reminderKey = new Date(todayUtc).toISOString().slice(0, 10);
  const id = `timecard-reminder-${reminderKey}`;

  const supabase = createClient(SUPABASE_URL, serviceRoleKey);

  const { error } = await supabase.from('company_announcements').upsert(
    {
      id,
      title: 'Timecard Reminder',
      message:
        'Timecards are due for review and submission. Please verify your shifts, punches, notes, and corrections, then submit your timecard for supervisor review.',
      created_at: now.toISOString(),
      expires_at: new Date(todayUtc + 3 * DAY_MS).toISOString(),
      posted_by: 'ApolloEMS System',
    },
    { onConflict: 'id' },
  );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, announcementId: id });
}
