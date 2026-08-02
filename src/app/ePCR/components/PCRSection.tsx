type PCRSectionProps = {
  title: string;
  completedFields: number;
  totalFields: number;
  expanded: boolean;
  onToggle: () => void;
  contentDisabled?: boolean;
  children: React.ReactNode;
};

export default function PCRSection({
  title,
  completedFields,
  totalFields,
  expanded,
  onToggle,
  contentDisabled = false,
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

      <div className={`${expanded ? '' : 'hidden'} border-t bg-slate-100 p-6`} aria-hidden={!expanded}>
        {contentDisabled ? (
          <div
            className="min-w-0 [&_input]:pointer-events-none [&_select]:pointer-events-none [&_textarea]:pointer-events-none"
            onClickCapture={(event) => {
              const target = event.target as HTMLElement;
              const button = target.closest('button');
              if (button && !button.dataset.reviewNavigation && button.getAttribute('aria-expanded') === null) {
                event.preventDefault();
                event.stopPropagation();
              }
            }}
            onChangeCapture={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            {children}
          </div>
        ) : children}
      </div>
    </section>
  );
}
