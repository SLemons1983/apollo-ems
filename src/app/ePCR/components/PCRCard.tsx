type PCRCardProps = {
  title: string;
  completedFields: number;
  totalFields: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

export default function PCRCard({
  title,
  completedFields,
  totalFields,
  expanded,
  onToggle,
  children,
}: PCRCardProps) {
  const complete = totalFields > 0 && completedFields === totalFields;
  const percentage =
    totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;

  const remainingFields = Math.max(totalFields - completedFields, 0);

  const statusText =
    completedFields === 0
      ? 'Not Started'
      : complete
        ? 'Complete'
        : `${remainingFields} Required Field${remainingFields === 1 ? '' : 's'} Remaining`;

  const statusColor =
    completedFields === 0
      ? 'bg-slate-200 text-slate-700'
      : complete
        ? 'bg-emerald-100 text-emerald-800'
        : 'bg-amber-100 text-amber-800';

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-slate-50 shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-100"
      >
        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-sm font-medium text-slate-600">
            {statusText}
          </p>

          <p className="mt-1 text-xs text-slate-500">
            {completedFields} of {totalFields} required fields completed
          </p>
          <div className="mt-2 h-2 w-56 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full ${
                complete ? 'bg-emerald-600' : 'bg-red-600'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`rounded-full px-3 py-1 text-xs font-bold ${statusColor}`}
          >
            {statusText}
          </span>

          <span className="text-2xl text-slate-700">
            {expanded ? '−' : '+'}
          </span>
        </div>
      </button>

      {expanded && <div className="border-t p-5">{children}</div>}
    </div>
  );
}
