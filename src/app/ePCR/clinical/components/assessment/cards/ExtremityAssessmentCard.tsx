'use client';

type ExtremityAssessmentForm = {
  extremity: string;
  circulation: string;
  motor: string;
  sensation: string;
  tenderness: string;
  pulses: string;
  skin: string;
  capillaryRefill: string;
  notes: string;
};

type ExtremityAssessmentCardProps = {
  value: ExtremityAssessmentForm;
  onChange: (field: keyof ExtremityAssessmentForm, value: string) => void;
};

const groups: {
  field: keyof ExtremityAssessmentForm;
  label: string;
  options: string[];
}[] = [
  {
    field: 'extremity',
    label: 'Extremity Assessed',
    options: ['Right Arm', 'Left Arm', 'Right Leg', 'Left Leg'],
  },
  {
    field: 'circulation',
    label: 'Circulation',
    options: ['Normal', 'Decreased', 'Absent', 'Unable to Assess'],
  },
  {
    field: 'motor',
    label: 'Motor',
    options: ['Normal', 'Weak', 'Absent', 'Unable to Assess'],
  },
  {
    field: 'sensation',
    label: 'Sensation',
    options: ['Intact', 'Decreased', 'Absent', 'Unable to Assess'],
  },
  {
    field: 'tenderness',
    label: 'Tenderness / Pain',
    options: ['None', 'Mild', 'Moderate', 'Severe', 'Unable to Assess'],
  },
  {
    field: 'pulses',
    label: 'Distal Pulses',
    options: ['Present', 'Weak', 'Absent', 'Unable to Assess'],
  },
  {
    field: 'skin',
    label: 'Skin',
    options: ['Normal', 'Pale', 'Cyanotic', 'Cool', 'Hot', 'Unable to Assess'],
  },
  {
    field: 'capillaryRefill',
    label: 'Capillary Refill',
    options: ['Less Than 2 Seconds', 'Greater Than 2 Seconds', 'Absent', 'Unable to Assess'],
  },
];

export default function ExtremityAssessmentCard({
  value,
  onChange,
}: ExtremityAssessmentCardProps) {
  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Extremity Assessment / CMS-TP
        </div>
        <div className="mt-1 text-sm font-semibold text-slate-800">
          Document circulation, motor, sensation, tenderness, and distal perfusion for extremity complaints.
        </div>
      </div>

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
                  onClick={() => onChange(group.field, selected ? '' : option)}
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

      <label className="block">
        <span className="mb-2 block text-sm font-bold uppercase tracking-wide text-slate-600">
          Extremity Notes
        </span>
        <textarea
          value={value.notes}
          onChange={(event) => onChange('notes', event.target.value)}
          rows={4}
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm"
        />
      </label>
    </div>
  );
}

export type { ExtremityAssessmentForm };
