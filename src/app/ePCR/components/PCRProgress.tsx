'use client';

import { useState } from 'react';

type PCRProgressTask = {
  title: string;
  completedFields: number;
  totalFields: number;
};

type PCRProgressSection = {
  title: string;
  completedFields: number;
  totalFields: number;
  tasks?: PCRProgressTask[];
};

type PCRProgressProps = {
  sections: PCRProgressSection[];
};

function getStatus(completedFields: number, totalFields: number) {
  if (completedFields === 0) return '○';
  if (completedFields === totalFields) return '✓';
  return '⚠';
}

export default function PCRProgress({ sections }: PCRProgressProps) {
  const [expanded, setExpanded] = useState(false);

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
    <div className="mb-6 rounded-xl border border-blue-950/30 bg-slate-100 p-5 shadow-md shadow-blue-950/20">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="mb-3 flex w-full flex-wrap items-center justify-between gap-3 text-left"
      >
        <div>
          <h2 className="text-xl font-bold text-blue-950">
            Overall PCR Progress
          </h2>
          <p className="text-sm text-slate-500">
            {completedFields} / {totalFields} required fields complete
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-[linear-gradient(135deg,#031735_0%,#0a438d_55%,#168fd0_100%)] px-4 py-2 text-sm font-bold text-white">
            {percentage}%
          </span>
          <span className="text-2xl text-slate-700">
            {expanded ? '−' : '+'}
          </span>
        </div>
      </button>

      {expanded && (
        <>
          <div className="mb-4 h-3 overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-[linear-gradient(90deg,#031735_0%,#0a438d_55%,#168fd0_100%)]"
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
                  {getStatus(section.completedFields, section.totalFields)}{' '}
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

              {section.tasks && section.tasks.length > 0 && (
                <div className="mt-3 space-y-1 border-t border-slate-200 pt-3">
                  {section.tasks.map((task) => (
                    <div
                      key={task.title}
                      className="flex items-center justify-between gap-2 text-xs"
                    >
                      <span className="font-medium text-slate-700">
                        {getStatus(task.completedFields, task.totalFields)}{' '}
                        {task.title}
                      </span>
                      <span className="text-slate-500">
                        {task.completedFields}/{task.totalFields}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
        </>
      )}
    </div>
  );
}
