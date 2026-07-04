'use client';

import ApolloBodyRegion from './ApolloBodyRegion';
import { apolloBodyRegions } from './bodyMapData';
import type {
  ApolloBodyRegionKey,
  ApolloBodyRegionStatus,
  ApolloBodyView,
} from './bodyMapTypes';

type ApolloBodyFigureProps = {
  view: ApolloBodyView;
  selectedRegions: Record<ApolloBodyRegionKey, boolean>;
  regionStatuses: Partial<Record<ApolloBodyRegionKey, ApolloBodyRegionStatus>>;
  activeRegion: ApolloBodyRegionKey | null;
  onRegionClick: (region: ApolloBodyRegionKey) => void;
  onFocusRegion: (region: ApolloBodyRegionKey) => void;
  onBlurRegion: () => void;
};

const regionPositionClasses: Record<ApolloBodyRegionKey, string> = {
  head: 'left-[42%] top-[3%] h-[11%] w-[16%] rounded-full',
  face: 'left-[42%] top-[12%] h-[7%] w-[16%] rounded-full',
  neck: 'left-[44%] top-[19%] h-[6%] w-[12%] rounded-xl',
  chest: 'left-[31%] top-[25%] h-[18%] w-[38%] rounded-[2rem]',
  abdomen: 'left-[34%] top-[43%] h-[14%] w-[32%] rounded-[2rem]',
  pelvis: 'left-[35%] top-[57%] h-[10%] w-[30%] rounded-[2rem]',
  back: 'left-[30%] top-[25%] h-[34%] w-[40%] rounded-[2rem]',
  leftArm: 'left-[12%] top-[27%] h-[35%] w-[18%] rounded-full',
  rightArm: 'left-[70%] top-[27%] h-[35%] w-[18%] rounded-full',
  leftLeg: 'left-[30%] top-[67%] h-[30%] w-[17%] rounded-full',
  rightLeg: 'left-[53%] top-[67%] h-[30%] w-[17%] rounded-full',
};

function shouldShowRegion(
  regionView: 'front' | 'back' | 'both',
  activeView: ApolloBodyView,
) {
  return regionView === activeView || regionView === 'both';
}

export default function ApolloBodyFigure({
  view,
  selectedRegions,
  regionStatuses,
  activeRegion,
  onRegionClick,
  onFocusRegion,
  onBlurRegion,
}: ApolloBodyFigureProps) {
  const visibleRegions = apolloBodyRegions.filter((region) =>
    shouldShowRegion(region.view, view),
  );

  return (
    <div className="relative mx-auto h-[620px] w-full max-w-md overflow-hidden rounded-2xl border border-slate-300 bg-slate-100">
      <div className="absolute inset-4 rounded-2xl border border-white/80 bg-white/80" />

      <div className="absolute left-[38%] top-[3%] h-[17%] w-[24%] rounded-full border-2 border-slate-400 bg-white shadow-sm" />
      <div className="absolute left-[43%] top-[19%] h-[7%] w-[14%] rounded-xl border-2 border-slate-400 bg-white shadow-sm" />
      <div className="absolute left-[28%] top-[25%] h-[36%] w-[44%] rounded-[3rem] border-2 border-slate-400 bg-white shadow-sm" />
      <div className="absolute left-[13%] top-[27%] h-[36%] w-[16%] rounded-full border-2 border-slate-400 bg-white shadow-sm" />
      <div className="absolute left-[71%] top-[27%] h-[36%] w-[16%] rounded-full border-2 border-slate-400 bg-white shadow-sm" />
      <div className="absolute left-[29%] top-[62%] h-[35%] w-[18%] rounded-full border-2 border-slate-400 bg-white shadow-sm" />
      <div className="absolute left-[53%] top-[62%] h-[35%] w-[18%] rounded-full border-2 border-slate-400 bg-white shadow-sm" />

      {view === 'front' ? (
        <>
          <div className="absolute left-[45%] top-[10%] h-2 w-2 rounded-full bg-slate-400" />
          <div className="absolute left-[54%] top-[10%] h-2 w-2 rounded-full bg-slate-400" />
          <div className="absolute left-[47%] top-[14%] h-px w-[6%] bg-slate-400" />
          <div className="absolute left-[38%] top-[32%] h-2.5 w-2.5 rounded-full border border-slate-400" />
          <div className="absolute left-[60%] top-[32%] h-2.5 w-2.5 rounded-full border border-slate-400" />
        </>
      ) : (
        <>
          <div className="absolute left-[40%] top-[11%] h-[7%] w-[20%] rounded-b-full border-b-2 border-slate-400" />
          <div className="absolute left-[40%] top-[61%] h-[8%] w-[20%] rounded-b-full border-b-2 border-slate-400" />
        </>
      )}

      {visibleRegions.map((region) => (
        <ApolloBodyRegion
          key={region.field}
          region={region.field}
          label={region.shortLabel}
          layoutClass={regionPositionClasses[region.field]}
          status={{
            ...regionStatuses[region.field],
            selected: selectedRegions[region.field],
          }}
          active={activeRegion === region.field}
          onClick={onRegionClick}
          onFocusRegion={onFocusRegion}
          onBlurRegion={onBlurRegion}
        />
      ))}
    </div>
  );
}
