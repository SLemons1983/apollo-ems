export const EPCR_REPORT_STATUSES = ['DRAFT', 'SUBMITTED', 'REJECTED', 'COMPLETED'] as const;
export type EpcrReportStatus = typeof EPCR_REPORT_STATUSES[number];

export type EpcrReportRow = {
  id: string;
  agency_id: string;
  submitted_by_membership_id: string;
  report_number: string;
  incident_number: string | null;
  patient_display: string;
  status: EpcrReportStatus;
  chart: Record<string, unknown>;
  submitted_at: string;
  reviewed_at: string | null;
  reviewer_message: string | null;
  revision: number;
  epcr_memberships?: { first_name: string; last_name: string; username: string } | null;
};

export function safeReportNumber(value: unknown) {
  return String(value ?? '').trim().slice(0, 100);
}

export function patientDisplay(chart: Record<string, unknown>) {
  const patient = chart.patient && typeof chart.patient === 'object'
    ? chart.patient as Record<string, unknown>
    : {};
  const first = String(patient.firstName ?? '').trim();
  const last = String(patient.lastName ?? '').trim();
  if (first || last) return `${last || 'Unknown'}, ${first || 'Unknown'}`;
  return 'Unidentified patient';
}
