'use client';

import {
  determineAssessmentMode,
  getAssessmentTasksForContext,
} from '../clinical/engine/assessment';

type AssessmentSectionProps = {
  clinicalCategory: string;
  suspectedStroke: boolean;
  possibleTrauma: boolean;
  behavioralHold: boolean;
  cardiacArrest: boolean;
};

export default function AssessmentSection({
  clinicalCategory,
  suspectedStroke,
  possibleTrauma,
  behavioralHold,
  cardiacArrest,
}: AssessmentSectionProps) {
  const context = {
    clinicalCategory,
    suspectedStroke,
    possibleTrauma,
    behavioralHold,
    cardiacArrest,
  };

  const mode = determineAssessmentMode(context);
  const tasks = getAssessmentTasksForContext(context);

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-slate-50 p-5">
        <h3 className="text-xl font-bold text-slate-900">
          Apollo Clinical Intelligence
        </h3>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs font-bold uppercase text-slate-500">
              Assessment Mode
            </div>
            <div className="text-lg font-semibold capitalize text-slate-900">
              {mode.replace('-', ' ')}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase text-slate-500">
              Clinical Category
            </div>
            <div className="text-lg font-semibold text-slate-900">
              {clinicalCategory || 'Not Yet Selected'}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-white">
        <div className="border-b px-5 py-4">
          <h3 className="text-lg font-bold text-slate-900">
            Assessment Workflow
          </h3>
        </div>

        <div className="divide-y">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center justify-between gap-4 px-5 py-4"
            >
              <span className="font-medium text-slate-800">{task.title}</span>

              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                Pending
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
