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

  return (
    <div className="overflow-hidden rounded-xl border border-slate-300 bg-slate-50 shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:bg-slate-100"
      >
        <div>
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500">
            {completedFields} / {totalFields} required fields complete
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
            className={`rounded-full px-3 py-1 text-xs font-bold ${
              complete
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-red-100 text-red-800'
            }`}
          >
            {complete ? 'Complete' : 'Incomplete'}
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
