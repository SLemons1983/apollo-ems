'use client';

type ConsciousnessAssessmentForm = {
  avpu: string;
  orientation: string;
};

type ConsciousnessAssessmentCardProps = {
  value: ConsciousnessAssessmentForm;
  onChange: (field: keyof ConsciousnessAssessmentForm, value: string) => void;
};

const avpuOptions = [
  { value: 'Alert', description: 'Patient is awake and responsive.' },
  { value: 'Verbal', description: 'Responds to verbal stimulus.' },
  { value: 'Painful', description: 'Responds only to painful stimulus.' },
  { value: 'Unresponsive', description: 'No response to verbal or painful stimulus.' },
];

const orientationOptions = [
  'Oriented x4',
  'Oriented x3',
  'Oriented x2',
  'Oriented x1',
  'Confused',
  'Unable to Assess',
];

export default function ConsciousnessAssessmentCard({
  value,
  onChange,
}: ConsciousnessAssessmentCardProps) {
  return (
    <div className="space-y-6">
      <div>
        <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
          AVPU
        </h4>

        <div className="grid gap-2 sm:grid-cols-2">
          {avpuOptions.map((option) => {
            const selected = value.avpu === option.value;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onChange('avpu', option.value)}
                className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  selected
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span className="block text-lg font-black">{option.value}</span>
                <span className="block">{option.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
          Orientation
        </h4>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {orientationOptions.map((option) => {
            const selected = value.orientation === option;

            return (
              <button
                key={option}
                type="button"
                onClick={() => onChange('orientation', option)}
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
    </div>
  );
}

export type { ConsciousnessAssessmentForm };
