'use client';

type ApolloBodyRegionKey =
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

type ApolloBodyMapProps = {
  selectedRegions: Record<ApolloBodyRegionKey, boolean>;
  onRegionClick: (region: ApolloBodyRegionKey) => void;
};

const bodyRegions: {
  field: ApolloBodyRegionKey;
  label: string;
  gridClass: string;
}[] = [
  { field: 'head', label: 'Head', gridClass: 'col-start-2 row-start-1' },
  { field: 'face', label: 'Face', gridClass: 'col-start-2 row-start-2' },
  { field: 'neck', label: 'Neck', gridClass: 'col-start-2 row-start-3' },
  { field: 'leftArm', label: 'Left Arm', gridClass: 'col-start-1 row-start-4 row-span-2' },
  { field: 'chest', label: 'Chest', gridClass: 'col-start-2 row-start-4' },
  { field: 'rightArm', label: 'Right Arm', gridClass: 'col-start-3 row-start-4 row-span-2' },
  { field: 'abdomen', label: 'Abdomen', gridClass: 'col-start-2 row-start-5' },
  { field: 'pelvis', label: 'Pelvis', gridClass: 'col-start-2 row-start-6' },
  { field: 'leftLeg', label: 'Left Leg', gridClass: 'col-start-1 row-start-7 row-span-2' },
  { field: 'back', label: 'Back', gridClass: 'col-start-2 row-start-7' },
  { field: 'rightLeg', label: 'Right Leg', gridClass: 'col-start-3 row-start-7 row-span-2' },
];

export default function ApolloBodyMap({
  selectedRegions,
  onRegionClick,
}: ApolloBodyMapProps) {
  return (
    <div className="rounded-xl border border-slate-300 bg-white p-4">
      <div className="mb-3">
        <h4 className="text-sm font-black uppercase tracking-wide text-slate-700">
          Apollo Body Map
        </h4>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Select body regions using the map or the region buttons below.
        </p>
      </div>

      <div className="mx-auto grid max-w-md grid-cols-3 grid-rows-8 gap-2">
        {bodyRegions.map((region) => {
          const selected = selectedRegions[region.field];

          return (
            <button
              key={region.field}
              type="button"
              onClick={() => onRegionClick(region.field)}
              className={`${region.gridClass} rounded-2xl border px-3 py-4 text-center text-xs font-black uppercase tracking-wide transition ${
                selected
                  ? 'border-slate-900 bg-slate-900 text-white shadow-md'
                  : 'border-slate-300 bg-slate-50 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {selected ? `✓ ${region.label}` : region.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type { ApolloBodyRegionKey };
