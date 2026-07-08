'use client';

type ExtremityKey = 'rightArm' | 'leftArm' | 'rightLeg' | 'leftLeg';

type ExtremityCmsTpAssessment = {
  selected: boolean;
  circulation: string;
  motor: string;
  sensation: string;
  tenderness: string;
  pulses: string;
  skin: string;
  capillaryRefill: string;
  notes: string;
};

type ExtremityAssessmentForm = Record<ExtremityKey, ExtremityCmsTpAssessment>;

type ExtremityAssessmentCardProps = {
  value: ExtremityAssessmentForm;
  onExtremityToggle: (extremity: ExtremityKey, selected: boolean) => void;
  onChange: (
    extremity: ExtremityKey,
    field: keyof ExtremityCmsTpAssessment,
    value: string,
  ) => void;
};

const extremities: { field: ExtremityKey; label: string }[] = [
  { field: 'rightArm', label: 'Right Arm' },
  { field: 'leftArm', label: 'Left Arm' },
  { field: 'rightLeg', label: 'Right Leg' },
  { field: 'leftLeg', label: 'Left Leg' },
];

const groups: {
  field: keyof ExtremityCmsTpAssessment;
  label: string;
  options: string[];
}[] = [
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

function getCompletedFields(extremity: ExtremityCmsTpAssessment) {
  return [
    extremity.circulation,
    extremity.motor,
    extremity.sensation,
    extremity.tenderness,
    extremity.pulses,
    extremity.skin,
    extremity.capillaryRefill,
    extremity.notes,
  ].filter(Boolean).length;
}

export default function ExtremityAssessmentCard({
  value,
  onExtremityToggle,
  onChange,
}: ExtremityAssessmentCardProps) {
  const selectedExtremities = extremities.filter(
    (extremity) => value[extremity.field].selected,
  );

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Extremity Assessment / CMS-TP
        </div>
        <div className="mt-1 text-sm font-semibold text-slate-800">
          Select each extremity assessed, then document circulation, motor,
          sensation, tenderness, and distal perfusion.
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
          Extremities Assessed
        </h4>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {extremities.map((extremity) => {
            const selected = value[extremity.field].selected;
            const completedFields = getCompletedFields(value[extremity.field]);

            return (
              <button
                key={extremity.field}
                type="button"
                onClick={() => onExtremityToggle(extremity.field, !selected)}
                className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  selected
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span className="block">
                  {selected ? `✓ ${extremity.label}` : extremity.label}
                </span>
                {completedFields > 0 && (
                  <span className="mt-1 block text-xs opacity-80">
                    {completedFields} field{completedFields === 1 ? '' : 's'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedExtremities.length > 0 ? (
        <div className="space-y-4">
          {selectedExtremities.map((extremity) => {
            const extremityValue = value[extremity.field];

            return (
              <div
                key={extremity.field}
                className="rounded-xl border border-slate-300 bg-white p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-base font-black text-slate-900">
                    {extremity.label}
                  </h4>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">
                    CMS-TP
                  </div>
                </div>

                {groups.map((group) => (
                  <div key={group.field} className="mb-4">
                    <h5 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
                      {group.label}
                    </h5>

                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                      {group.options.map((option) => {
                        const selected = extremityValue[group.field] === option;

                        return (
                          <button
                            key={option}
                            type="button"
                            onClick={() =>
                              onChange(
                                extremity.field,
                                group.field,
                                selected ? '' : option,
                              )
                            }
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
                    value={extremityValue.notes}
                    onChange={(event) =>
                      onChange(extremity.field, 'notes', event.target.value)
                    }
                    rows={3}
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm"
                  />
                </label>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm font-semibold text-slate-500">
          Select one or more extremities to document CMS-TP findings.
        </div>
      )}
    </div>
  );
}

export type {
  ExtremityAssessmentForm,
  ExtremityCmsTpAssessment,
  ExtremityKey,
};
