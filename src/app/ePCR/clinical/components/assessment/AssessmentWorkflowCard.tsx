'use client';

import {
  getAssessmentStatusColor,
  getAssessmentStatusLabel,
  type AssessmentStatus,
} from '../../engine/assessment/status/assessmentStatus';

type AssessmentWorkflowCardProps = {
  title: string;
  status: AssessmentStatus;
  selected: boolean;
  onClick: () => void;
};

export default function AssessmentWorkflowCard({
  title,
  status,
  selected,
  onClick,
}: AssessmentWorkflowCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition ${
        selected ? 'bg-slate-900 text-white' : 'bg-white hover:bg-slate-50'
      }`}
    >
      <span className="font-medium">{title}</span>

      <span
        className={`rounded-full px-3 py-1 text-xs font-semibold ${
          selected ? 'bg-white text-slate-900' : getAssessmentStatusColor(status)
        }`}
      >
        {getAssessmentStatusLabel(status)}
      </span>
    </button>
  );
}
