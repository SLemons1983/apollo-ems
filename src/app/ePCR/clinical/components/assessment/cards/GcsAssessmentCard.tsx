'use client';

type GcsAssessmentForm = {
  eyes: string;
  verbal: string;
  motor: string;
};

type GcsAssessmentCardProps = {
  value: GcsAssessmentForm;
  onChange: (field: keyof GcsAssessmentForm, value: string) => void;
};

const gcsGroups: {
  field: keyof GcsAssessmentForm;
  label: string;
  options: { score: string; description: string }[];
}[] = [
  {
    field: 'eyes',
    label: 'Eye Opening',
    options: [
      { score: '4', description: 'Spontaneous' },
      { score: '3', description: 'To speech' },
      { score: '2', description: 'To pain' },
      { score: '1', description: 'None' },
    ],
  },
  {
    field: 'verbal',
    label: 'Verbal Response',
    options: [
      { score: '5', description: 'Oriented' },
      { score: '4', description: 'Confused' },
      { score: '3', description: 'Inappropriate words' },
      { score: '2', description: 'Incomprehensible sounds' },
      { score: '1', description: 'None' },
    ],
  },
  {
    field: 'motor',
    label: 'Motor Response',
    options: [
      { score: '6', description: 'Obeys commands' },
      { score: '5', description: 'Localizes pain' },
      { score: '4', description: 'Withdraws from pain' },
      { score: '3', description: 'Flexion to pain' },
      { score: '2', description: 'Extension to pain' },
      { score: '1', description: 'None' },
    ],
  },
];

function calculateGcs(value: GcsAssessmentForm) {
  const total =
    Number(value.eyes || 0) +
    Number(value.verbal || 0) +
    Number(value.motor || 0);

  return total > 0 ? total : 0;
}

export default function GcsAssessmentCard({
  value,
  onChange,
}: GcsAssessmentCardProps) {
  const total = calculateGcs(value);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
        <div className="text-xs font-bold uppercase text-slate-500">
          Calculated Glasgow Coma Scale
        </div>
        <div className="mt-1 text-4xl font-black text-slate-900">
          {total || '—'}
        </div>
      </div>

      {gcsGroups.map((group) => (
        <div key={group.field}>
          <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
            {group.label}
          </h4>

          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {group.options.map((option) => {
              const selected = value[group.field] === option.score;

              return (
                <button
                  key={`${group.field}-${option.score}`}
                  type="button"
                  onClick={() => onChange(group.field, option.score)}
                  className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                    selected
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                  }`}
                >
                  <span className="block text-lg font-black">
                    {option.score}
                  </span>
                  <span className="block">{option.description}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export type { GcsAssessmentForm };
