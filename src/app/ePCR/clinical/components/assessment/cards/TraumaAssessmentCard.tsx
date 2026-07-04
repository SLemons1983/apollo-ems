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

type TraumaFindingKey =
  | 'deformity'
  | 'contusions'
  | 'abrasions'
  | 'puncturesPenetrations'
  | 'burns'
  | 'tenderness'
  | 'lacerations'
  | 'swelling';

type TraumaRegionAssessment = {
  selected: boolean;
  findings: Record<TraumaFindingKey, boolean>;
};

type TraumaAssessmentForm = {
  regions: Record<TraumaRegionKey, TraumaRegionAssessment>;
};

type TraumaAssessmentCardProps = {
  value: TraumaAssessmentForm;
  onRegionChange: (field: TraumaRegionKey, value: boolean) => void;
  onFindingChange: (
    region: TraumaRegionKey,
    finding: TraumaFindingKey,
    value: boolean,
  ) => void;
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

const traumaFindings: { field: TraumaFindingKey; label: string }[] = [
  { field: 'deformity', label: 'Deformity' },
  { field: 'contusions', label: 'Contusions' },
  { field: 'abrasions', label: 'Abrasions' },
  { field: 'puncturesPenetrations', label: 'Punctures / Penetrations' },
  { field: 'burns', label: 'Burns' },
  { field: 'tenderness', label: 'Tenderness' },
  { field: 'lacerations', label: 'Lacerations' },
  { field: 'swelling', label: 'Swelling' },
];

function getRegionFindingCount(region: TraumaRegionAssessment) {
  return Object.values(region.findings).filter(Boolean).length;
}

export default function TraumaAssessmentCard({
  value,
  onRegionChange,
  onFindingChange,
}: TraumaAssessmentCardProps) {
  const selectedRegions = traumaRegions.filter(
    (region) => value.regions[region.field].selected,
  );

  const totalFindings = selectedRegions.reduce(
    (total, region) => total + getRegionFindingCount(value.regions[region.field]),
    0,
  );

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
        <div className="text-xs font-bold uppercase text-slate-500">
          Trauma Assessment / DCAP-BTLS
        </div>
        <div className="mt-1 text-sm font-semibold text-slate-800">
          Select all body regions examined, then document DCAP-BTLS findings for
          each selected region.
        </div>
      </div>

      <div>
        <h4 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
          Body Regions Examined
        </h4>

        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
          {traumaRegions.map((region) => {
            const selected = value.regions[region.field].selected;
            const findingCount = getRegionFindingCount(value.regions[region.field]);

            return (
              <button
                key={region.field}
                type="button"
                onClick={() => onRegionChange(region.field, !selected)}
                className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                  selected
                    ? 'border-slate-900 bg-slate-900 text-white'
                    : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                }`}
              >
                <span className="block">
                  {selected ? `✓ ${region.label}` : region.label}
                </span>
                {findingCount > 0 && (
                  <span className="mt-1 block text-xs opacity-80">
                    {findingCount} finding{findingCount === 1 ? '' : 's'}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {selectedRegions.length > 0 ? (
        <div className="space-y-4">
          {selectedRegions.map((region) => {
            const regionValue = value.regions[region.field];

            return (
              <div
                key={region.field}
                className="rounded-xl border border-slate-300 bg-white p-4"
              >
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <h4 className="text-base font-black text-slate-900">
                    {region.label}
                  </h4>
                  <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold uppercase text-slate-600">
                    DCAP-BTLS
                  </div>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  {traumaFindings.map((finding) => {
                    const selected = regionValue.findings[finding.field];

                    return (
                      <button
                        key={finding.field}
                        type="button"
                        onClick={() =>
                          onFindingChange(
                            region.field,
                            finding.field,
                            !selected,
                          )
                        }
                        className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                          selected
                            ? 'border-slate-900 bg-slate-900 text-white'
                            : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                        }`}
                      >
                        {selected ? `✓ ${finding.label}` : finding.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-slate-300 bg-white px-4 py-6 text-center text-sm font-semibold text-slate-500">
          Select a body region to document DCAP-BTLS findings.
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700">
        Regions selected: {selectedRegions.length} · Findings documented:{' '}
        {totalFindings}
      </div>
    </div>
  );
}

export type {
  TraumaAssessmentForm,
  TraumaFindingKey,
  TraumaRegionAssessment,
  TraumaRegionKey,
};
