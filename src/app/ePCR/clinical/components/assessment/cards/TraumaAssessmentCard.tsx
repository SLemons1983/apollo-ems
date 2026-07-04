'use client';

type TraumaRegionKey =
  | 'head'
  | 'face'
  | 'neck'
  | 'chest'
  | 'abdomen'
  | 'pelvis'
  | 'back'
  | 'rightArm'
  | 'leftArm'
  | 'rightLeg'
  | 'leftLeg';

type TraumaAssessmentForm = {
  regions: Record<TraumaRegionKey, boolean>;
};

type TraumaAssessmentCardProps = {
  value: TraumaAssessmentForm;
  onChange: (field: TraumaRegionKey, value: boolean) => void;
};

const traumaRegions: { field: TraumaRegionKey; label: string }[] = [
  { field: 'head', label: 'Head' },
  { field: 'face', label: 'Face' },
  { field: 'neck', label: 'Neck' },
  { field: 'chest', label: 'Chest' },
  { field: 'abdomen', label: 'Abdomen' },
  { field: 'pelvis', label: 'Pelvis' },
  { field: 'back', label: 'Back' },
  { field: 'rightArm', label: 'Right Arm' },
  { field: 'leftArm', label: 'Left Arm' },
  { field: 'rightLeg', label: 'Right Leg' },
  { field: 'leftLeg', label: 'Left Leg' },
];

export default function TraumaAssessmentCard({
  value,
  onChange,
}: TraumaAssessmentCardProps) {
  const selectedCount = traumaRegions.filter(
    (region) => value.regions[region.field],
  ).length;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
        <div className="text-xs font-bold uppercase text-slate-500">
          Trauma Assessment / DCAP-BTLS
        </div>
        <div className="mt-1 text-sm font-semibold text-slate-800">
          Select all body regions examined. Findings will be added to each
          selected region in the next build step.
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
          Body Regions Examined
        </h4>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {traumaRegions.map((region) => {
            const selected = value.regions[region.field];

            return (
              <button
                key={region.field}
                type="button"
                onClick={() => onChange(region.field, !selected)}
                className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  selected
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                {selected ? `✓ ${region.label}` : region.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
        Regions selected: {selectedCount}
      </div>
    </div>
  );
}

export type { TraumaAssessmentForm, TraumaRegionKey };
