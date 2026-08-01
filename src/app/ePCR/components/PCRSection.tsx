type PCRSectionProps = {
  title: string;
  completedFields: number;
  totalFields: number;
  expanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

export default function PCRSection({
  title,
  completedFields,
  totalFields,
  expanded,
  onToggle,
  children,
}: PCRSectionProps) {
  const complete = totalFields > 0 && completedFields === totalFields;
  const percentage =
    totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;

  return (
    <section className="overflow-hidden rounded-xl border border-blue-950/30 bg-slate-100 shadow-md shadow-blue-950/20">
      <button
        type="button"
        onClick={onToggle}
        className={`flex w-full items-center justify-between px-6 py-5 text-left transition ${
          complete
            ? 'border-l-8 border-emerald-600 bg-slate-100'
            : 'border-l-8 border-blue-700 bg-slate-100'
        }`}
      >
        <div>
          <h2 className="text-xl font-semibold text-blue-950">{title}</h2>

          <p className="text-sm text-slate-500">
            {completedFields} / {totalFields} Required Fields Complete
          </p>

          <div className="mt-2 h-2 w-64 overflow-hidden rounded-full bg-slate-200">
            <div
              className={`h-full rounded-full ${
                complete
                  ? 'bg-emerald-600'
                  : 'bg-[linear-gradient(90deg,#031735_0%,#0a438d_55%,#168fd0_100%)]'
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <span className="text-2xl text-slate-700">{expanded ? '−' : '+'}</span>
      </button>

      {expanded && <div className="border-t bg-slate-100 p-6">{children}</div>}
    </section>
  );
}
