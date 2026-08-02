import { NextRequest, NextResponse } from 'next/server';
import { currentEpcrMembership, epcrAdminClient } from '@/lib/epcrServer';
import { patientDisplay, safeReportNumber } from '@/lib/epcrReports';

export async function POST(request: NextRequest) {
  const access = await currentEpcrMembership(true);
  if (!access || access.membership.status !== 'ACTIVE') return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });

  const input = await request.json().catch(() => null) as { chart?: unknown; action?: string; report_id?: string } | null;
  if (!input?.chart || typeof input.chart !== 'object' || Array.isArray(input.chart)) {
    return NextResponse.json({ error: 'A valid ePCR chart is required.' }, { status: 400 });
  }
  const chart = input.chart as Record<string, unknown>;
  const call = chart.call && typeof chart.call === 'object' ? chart.call as Record<string, unknown> : {};
  const reportNumber = safeReportNumber(call.emsResponseNumber);
  if (!reportNumber) return NextResponse.json({ error: 'EMS response number is required.' }, { status: 400 });
  const saveDraft = input.action === 'SAVE_DRAFT';

  const db = epcrAdminClient();
  const { data: prior } = await db.from('epcr_reports')
    .select('id,status,revision')
    .eq('agency_id', access.membership.agency_id)
    .eq('report_number', reportNumber)
    .eq('submitted_by_membership_id', access.membership.id)
    .order('revision', { ascending: false }).limit(1).maybeSingle();

  if (input.report_id && prior?.id !== input.report_id) {
    return NextResponse.json({ error: 'The selected report does not match this report number.' }, { status: 409 });
  }
  if (!saveDraft && prior && !['DRAFT', 'REJECTED'].includes(prior.status)) {
    return NextResponse.json({ error: 'This report number has already been submitted.' }, { status: 409 });
  }

  if (saveDraft) {
    if (prior && !['DRAFT', 'REJECTED'].includes(prior.status)) {
      return NextResponse.json({ error: 'A submitted or completed report cannot be edited.' }, { status: 409 });
    }
    if (prior) {
      const { data: report, error } = await db.from('epcr_reports').update({
        chart, incident_number: safeReportNumber(call.emsIncidentNumber) || null,
        patient_display: patientDisplay(chart), status: prior.status,
      }).eq('id', prior.id).eq('agency_id', access.membership.agency_id)
        .eq('submitted_by_membership_id', access.membership.id)
        .select('id,report_number,status,revision').single();
      if (error) return NextResponse.json({ error: error.message }, { status: 500 });
      return NextResponse.json({ report });
    }
    const { data: report, error } = await db.from('epcr_reports').insert({
      agency_id: access.membership.agency_id, submitted_by_membership_id: access.membership.id,
      submitted_by_auth_user_id: access.user.id, report_number: reportNumber,
      incident_number: safeReportNumber(call.emsIncidentNumber) || null,
      patient_display: patientDisplay(chart), chart, status: 'DRAFT', revision: 1,
    }).select('id,report_number,status,revision').single();
    if (error || !report) return NextResponse.json({ error: error?.message ?? 'Unable to save draft.' }, { status: 500 });
    return NextResponse.json({ report });
  }

  if (prior?.status === 'DRAFT') {
    const { data: report, error } = await db.from('epcr_reports').update({
      chart, incident_number: safeReportNumber(call.emsIncidentNumber) || null,
      patient_display: patientDisplay(chart), status: 'SUBMITTED', submitted_at: new Date().toISOString(),
      reviewed_at: null, reviewed_by_membership_id: null, reviewer_message: null,
    }).eq('id', prior.id).eq('agency_id', access.membership.agency_id)
      .select('id,report_number,status,revision').single();
    if (error || !report) return NextResponse.json({ error: error?.message ?? 'Unable to submit report.' }, { status: 500 });
    await db.from('epcr_report_review_events').insert({ report_id: report.id, agency_id: access.membership.agency_id, actor_membership_id: access.membership.id, event_type: 'SUBMITTED', report_revision: report.revision });
    return NextResponse.json({ report });
  }

  const revision = prior ? prior.revision + 1 : 1;
  const { data: report, error } = await db.from('epcr_reports').insert({
    agency_id: access.membership.agency_id,
    submitted_by_membership_id: access.membership.id,
    submitted_by_auth_user_id: access.user.id,
    report_number: reportNumber,
    incident_number: safeReportNumber(call.emsIncidentNumber) || null,
    patient_display: patientDisplay(chart),
    chart,
    revision,
  }).select('id,report_number,status,revision').single();
  if (error || !report) return NextResponse.json({ error: error?.message ?? 'Unable to submit report.' }, { status: 500 });

  await db.from('epcr_report_review_events').insert({
    report_id: report.id,
    agency_id: access.membership.agency_id,
    actor_membership_id: access.membership.id,
    event_type: prior ? 'RESUBMITTED' : 'SUBMITTED',
    report_revision: revision,
  });

  return NextResponse.json({ report });
}

export async function PATCH(request: NextRequest) {
  const access = await currentEpcrMembership(true);
  if (!access || !['PRIMARY_ADMIN', 'ADMIN', 'REVIEWER'].includes(access.membership.role)) {
    return NextResponse.json({ error: 'Reviewer access required.' }, { status: 403 });
  }
  const input = await request.json().catch(() => null) as { report_id?: string; action?: string; message?: string } | null;
  const action = input?.action === 'COMPLETE' ? 'COMPLETED' : input?.action === 'REJECT' ? 'REJECTED' : null;
  const message = String(input?.message ?? '').trim().slice(0, 2000);
  if (!input?.report_id || !action) return NextResponse.json({ error: 'A report and review action are required.' }, { status: 400 });
  if (action === 'REJECTED' && !message) return NextResponse.json({ error: 'A correction message is required when rejecting a report.' }, { status: 400 });

  const db = epcrAdminClient();
  const reviewedAt = new Date().toISOString();
  const { data: report, error } = await db.from('epcr_reports').update({
    status: action,
    reviewed_at: reviewedAt,
    reviewed_by_membership_id: access.membership.id,
    reviewer_message: message || null,
  }).eq('id', input.report_id).eq('agency_id', access.membership.agency_id).eq('status', 'SUBMITTED')
    .select('id,revision,status').maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!report) return NextResponse.json({ error: 'Report is no longer awaiting review.' }, { status: 409 });

  await db.from('epcr_report_review_events').insert({
    report_id: report.id,
    agency_id: access.membership.agency_id,
    actor_membership_id: access.membership.id,
    event_type: action,
    message: message || null,
    report_revision: report.revision,
  });
  return NextResponse.json({ report });
}

export async function DELETE(request: NextRequest) {
  const access = await currentEpcrMembership();
  if (!access || access.membership.status !== 'ACTIVE') {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }
  const reportId = new URL(request.url).searchParams.get('id');
  if (!reportId) return NextResponse.json({ error: 'A report is required.' }, { status: 400 });

  const db = epcrAdminClient();
  const { data: report, error: lookupError } = await db.from('epcr_reports')
    .select('id,status')
    .eq('id', reportId)
    .eq('agency_id', access.membership.agency_id)
    .eq('submitted_by_membership_id', access.membership.id)
    .maybeSingle();
  if (lookupError) return NextResponse.json({ error: lookupError.message }, { status: 500 });
  if (!report) return NextResponse.json({ error: 'Report not found.' }, { status: 404 });
  if (report.status === 'SUBMITTED') {
    return NextResponse.json({ error: 'A report awaiting review cannot be deleted.' }, { status: 409 });
  }

  const { error: reviewHistoryError } = await db.from('epcr_report_review_events')
    .delete()
    .eq('report_id', report.id)
    .eq('agency_id', access.membership.agency_id);
  if (reviewHistoryError) return NextResponse.json({ error: reviewHistoryError.message }, { status: 500 });

  const { error } = await db.from('epcr_reports').delete()
    .eq('id', report.id)
    .eq('agency_id', access.membership.agency_id)
    .eq('submitted_by_membership_id', access.membership.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ deleted: true });
}
