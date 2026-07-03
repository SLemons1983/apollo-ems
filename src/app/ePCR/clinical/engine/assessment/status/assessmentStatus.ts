export type AssessmentStatus =
  | 'not-started'
  | 'in-progress'
  | 'complete'
  | 'needs-review';

export function getAssessmentStatusLabel(status: AssessmentStatus) {
  if (status === 'not-started') return 'Not Started';
  if (status === 'in-progress') return 'In Progress';
  if (status === 'complete') return 'Complete';
  return 'Needs Review';
}

export function getAssessmentStatusColor(status: AssessmentStatus) {
  if (status === 'complete') return 'bg-emerald-100 text-emerald-800';
  if (status === 'in-progress') return 'bg-amber-100 text-amber-800';
  if (status === 'needs-review') return 'bg-blue-100 text-blue-800';
  return 'bg-slate-100 text-slate-700';
}
