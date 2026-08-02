import { NextResponse } from 'next/server';
import { currentEpcrMembership, epcrAdminClient } from '@/lib/epcrServer';
import { reportPdf } from '@/lib/epcrPdf';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await currentEpcrMembership();
  if (!access || access.membership.status !== 'ACTIVE') return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const { id } = await params;
  const db = epcrAdminClient();
  const { data: report, error } = await db.from('epcr_reports')
    .select('id,report_number,patient_display,status,chart')
    .eq('id', id)
    .eq('agency_id', access.membership.agency_id)
    .eq('submitted_by_membership_id', access.membership.id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!report) return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
  if (report.status !== 'COMPLETED') return NextResponse.json({ error: 'Only completed reports can be downloaded.' }, { status: 409 });

  const pdf = reportPdf(report.chart as Record<string, unknown>, report.report_number, report.patient_display);
  const filename = `ApolloEMS-PCR-${String(report.report_number).replace(/[^A-Za-z0-9_-]/g, '-')}.pdf`;
  return new Response(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Cache-Control': 'private, no-store' } });
}
