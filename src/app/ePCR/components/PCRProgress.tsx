type PCRProgressSection = {
  title: string;
  completedFields: number;
  totalFields: number;
};

type PCRProgressProps = {
  sections: PCRProgressSection[];
};

export default function PCRProgress({ sections }: PCRProgressProps) {
  const totalFields = sections.reduce(
    (total, section) => total + section.totalFields,
    0,
  );
  const completedFields = sections.reduce(
    (total, section) => total + section.completedFields,
    0,
  );
  const percentage =
    totalFields > 0 ? Math.round((completedFields / totalFields) * 100) : 0;

  return (
    <div className="mb-6 rounded-xl border bg-white p-5 shadow">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            Overall PCR Progress
          </h2>
          <p className="text-sm text-slate-500">
            {completedFields} / {totalFields} required fields complete
          </p>
        </div>

        <span className="rounded-full bg-slate-900 px-4 py-2 text-sm font-bold text-white">
          {percentage}%
        </span>
      </div>

      <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full bg-slate-900"
          style={{ width: `${percentage}%` }}
        />
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {sections.map((section) => {
          const sectionPercentage =
            section.totalFields > 0
              ? Math.round(
                  (section.completedFields / section.totalFields) * 100,
                )
              : 0;
          const sectionComplete =
            section.totalFields > 0 &&
            section.completedFields === section.totalFields;

          return (
            <div
              key={section.title}
              className="rounded-lg border border-slate-200 bg-slate-50 p-3"
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-800">
                  {section.title}
                </span>
                <span
                  className={`text-xs font-bold ${
                    sectionComplete ? 'text-emerald-700' : 'text-red-700'
                  }`}
                >
                  {sectionPercentage}%
                </span>
              </div>

              <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${
                    sectionComplete ? 'bg-emerald-600' : 'bg-red-600'
                  }`}
                  style={{ width: `${sectionPercentage}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
