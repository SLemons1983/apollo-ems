import { NextResponse } from 'next/server';
import { currentEpcrMembership, epcrAdminClient } from '@/lib/epcrServer';
import { reportPdf } from '@/lib/epcrPdf';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const access = await currentEpcrMembership(true);
  if (!access || access.membership.status !== 'ACTIVE') return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  const { id } = await params;
  const db = epcrAdminClient();
  const { data: report, error } = await db.from('epcr_reports')
    .select('id,report_number,patient_display,status,chart,submitted_by_membership_id')
    .eq('id', id)
    .eq('agency_id', access.membership.agency_id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!report) return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
  const canReview = ['PRIMARY_ADMIN', 'ADMIN', 'REVIEWER'].includes(access.membership.role);
  if (report.submitted_by_membership_id !== access.membership.id && !canReview) {
    return NextResponse.json({ error: 'You do not have permission to download this report.' }, { status: 403 });
  }
  if (report.status !== 'COMPLETED') return NextResponse.json({ error: 'Only completed reports can be downloaded.' }, { status: 409 });

  try {
    const pdf = await reportPdf(report.chart as Record<string, unknown>, report.report_number, report.patient_display);
    if (pdf.length < 5 || pdf.subarray(0, 5).toString('ascii') !== '%PDF-') {
      throw new Error('The generated report was not a valid PDF.');
    }
    const filename = `ApolloEMS-PCR-${String(report.report_number).replace(/[^A-Za-z0-9_-]/g, '-')}.pdf`;
    return new Response(pdf, { headers: { 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${filename}"`, 'Content-Length': String(pdf.length), 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' } });
  } catch (caught) {
    console.error('ePCR PDF generation failed', caught);
    return NextResponse.json({ error: caught instanceof Error ? caught.message : 'Unable to generate the completed report PDF.' }, { status: 500 });
  }
}
