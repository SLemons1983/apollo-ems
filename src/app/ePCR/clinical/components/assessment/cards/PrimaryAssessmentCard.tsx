'use client';

type PrimaryAssessmentForm = {
  generalImpression: string;
  levelOfConsciousness: string;
  airway: string;
  breathing: string;
  circulation: string;
  lifeThreats: string;
  transportPriority: string;
};

type PrimaryAssessmentCardProps = {
  value: PrimaryAssessmentForm;
  onChange: (field: keyof PrimaryAssessmentForm, value: string) => void;
};

const groups: {
  field: keyof PrimaryAssessmentForm;
  label: string;
  options: string[];
}[] = [
  {
    field: 'generalImpression',
    label: 'General Impression',
    options: ['Stable', 'Ill', 'Critical', 'Unable to Determine'],
  },
  {
    field: 'levelOfConsciousness',
    label: 'Level of Consciousness',
    options: ['Alert', 'Verbal', 'Painful', 'Unresponsive'],
  },
  {
    field: 'airway',
    label: 'Airway',
    options: ['Patent', 'Maintained', 'Obstructed', 'Advanced Airway'],
  },
  {
    field: 'breathing',
    label: 'Breathing',
    options: ['Normal', 'Labored', 'Assisted', 'Apneic'],
  },
  {
    field: 'circulation',
    label: 'Circulation',
    options: ['Adequate', 'Major Bleeding', 'Shock Signs', 'Cardiac Arrest'],
  },
  {
    field: 'lifeThreats',
    label: 'Life Threats',
    options: ['None Apparent', 'Airway', 'Breathing', 'Circulation', 'Trauma'],
  },
  {
    field: 'transportPriority',
    label: 'Transport Priority',
    options: ['Low', 'Moderate', 'High', 'Immediate'],
  },
];

export default function PrimaryAssessmentCard({
  value,
  onChange,
}: PrimaryAssessmentCardProps) {
  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <div key={group.field}>
          <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
            {group.label}
          </h4>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {group.options.map((option) => {
              const selected = value[group.field] === option;

              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => onChange(group.field, option)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    selected
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
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
