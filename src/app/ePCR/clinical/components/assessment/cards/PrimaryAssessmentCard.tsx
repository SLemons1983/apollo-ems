'use client';

type PrimaryAssessmentForm = {
  generalImpression: string;
  levelOfConsciousness: string;
  airway: string;
  breathing: string;
  circulation: string;
  disability: string;
  exposure: string;
  gcsEyes: string;
  gcsVerbal: string;
  gcsMotor: string;
  pupils: string;
  skinColor: string;
  skinTemperature: string;
  skinCondition: string;
  lifeThreats: string;
  transportPriority: string;
};

type PrimaryAssessmentCardProps = {
  value: PrimaryAssessmentForm;
  onChange: (field: keyof PrimaryAssessmentForm, value: string) => void;
  onMarkUnremarkable: () => void;
};

const primarySurveyGroups: {
  field: keyof PrimaryAssessmentForm;
  label: string;
  prompt: string;
  options: string[];
}[] = [
  {
    field: 'generalImpression',
    label: 'General Impression',
    prompt: 'How does the patient appear on first contact?',
    options: ['Stable', 'Sick', 'Critical', 'Unable to Determine'],
  },
  {
    field: 'airway',
    label: 'A - Airway',
    prompt: 'Is the airway open and maintainable?',
    options: ['Patent', 'Maintained', 'Obstructed', 'Advanced Airway'],
  },
  {
    field: 'breathing',
    label: 'B - Breathing',
    prompt: 'Is breathing adequate?',
    options: ['Normal', 'Labored', 'Assisted', 'Apneic'],
  },
  {
    field: 'circulation',
    label: 'C - Circulation',
    prompt: 'Is circulation adequate without an immediate threat?',
    options: ['Adequate', 'Major Bleeding', 'Shock Signs', 'Cardiac Arrest'],
  },
  {
    field: 'disability',
    label: 'D - Disability',
    prompt: 'Is an immediate neurological problem apparent?',
    options: ['No Deficit Noted', 'Altered LOC', 'Focal Deficit', 'Seizure Activity'],
  },
  {
    field: 'exposure',
    label: 'E - Exposure',
    prompt: 'Did exposure reveal an immediate concern?',
    options: ['No Major Findings', 'Fully Assessed', 'Limited Assessment', 'Environmental Concern'],
  },
];

export default function PrimaryAssessmentCard({
  value,
  onChange,
  onMarkUnremarkable,
}: PrimaryAssessmentCardProps) {
  const completedCount = primarySurveyGroups.filter(
    (group) => Boolean(value[group.field]),
  ).length;
  const isUnremarkable =
    value.generalImpression === 'Stable' &&
    value.airway === 'Patent' &&
    value.breathing === 'Normal' &&
    value.circulation === 'Adequate' &&
    value.disability === 'No Deficit Noted' &&
    value.exposure === 'No Major Findings';

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="text-sm font-black text-slate-900">
              Rapid A–E Primary Survey
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
              Record the immediate survey. Detailed neurological and physical
              findings are documented in their focused assessments.
            </p>
          </div>
          <div className="shrink-0 rounded-full border border-sky-200 bg-white px-3 py-1.5 text-xs font-bold text-sky-900">
            {completedCount} of {primarySurveyGroups.length} complete
          </div>
        </div>

        <button
          type="button"
          onClick={onMarkUnremarkable}
          className={`mt-4 w-full rounded-xl border px-4 py-3 text-left text-sm font-black transition sm:w-auto ${
            isUnremarkable
              ? 'border-emerald-700 bg-emerald-700 text-white'
              : 'border-emerald-300 bg-white text-emerald-800 hover:border-emerald-500 hover:bg-emerald-50'
          }`}
        >
          {isUnremarkable ? '✓ Primary Survey Unremarkable' : 'Mark Primary Survey Unremarkable'}
        </button>
        <p className="mt-2 text-xs leading-5 text-slate-500">
          Sets Stable, Patent, Normal, Adequate, No Deficit Noted, and No Major
          Findings. Any item can be changed below.
        </p>
      </div>

      {primarySurveyGroups.map((group) => (
        <div
          key={group.field}
          className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
        >
          <div className="mb-3">
            <h4 className="text-sm font-black uppercase tracking-wide text-slate-700">
              {group.label}
            </h4>
            <p className="mt-1 text-sm text-slate-500">{group.prompt}</p>
          </div>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {group.options.map((option) => {
              const selected = value[group.field] === option;

              return (
                <button
                  key={option}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onChange(group.field, option)}
                  className={`min-h-12 rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    selected
                      ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
                      : 'border-slate-300 bg-white text-slate-800 hover:border-slate-400 hover:bg-slate-50'
                  }`}
                >
                  {selected ? `✓ ${option}` : option}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export type { PrimaryAssessmentForm };
