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
  head: 'left-[42%] top-[2%] h-[10%] w-[16%] rounded-full',
  face: 'left-[42%] top-[11%] h-[7%] w-[16%] rounded-full',
  neck: 'left-[44%] top-[18%] h-[6%] w-[12%] rounded-xl',
  chest: 'left-[32%] top-[24%] h-[18%] w-[36%] rounded-[2rem]',
  abdomen: 'left-[34%] top-[42%] h-[14%] w-[32%] rounded-[2rem]',
  pelvis: 'left-[35%] top-[56%] h-[10%] w-[30%] rounded-[2rem]',
  back: 'left-[31%] top-[25%] h-[34%] w-[38%] rounded-[2rem]',
  leftArm: 'left-[13%] top-[26%] h-[35%] w-[17%] rounded-full',
  rightArm: 'left-[70%] top-[26%] h-[35%] w-[17%] rounded-full',
  leftLeg: 'left-[31%] top-[66%] h-[31%] w-[16%] rounded-full',
  rightLeg: 'left-[53%] top-[66%] h-[31%] w-[16%] rounded-full',
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
    <div className="relative mx-auto h-[620px] max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-b from-white to-slate-50">
      <div className="absolute left-[38%] top-[2%] h-[18%] w-[24%] rounded-full border border-slate-300 bg-white/80" />
      <div className="absolute left-[43%] top-[18%] h-[7%] w-[14%] rounded-xl border border-slate-300 bg-white/80" />
      <div className="absolute left-[28%] top-[24%] h-[36%] w-[44%] rounded-[3rem] border border-slate-300 bg-white/80" />
      <div className="absolute left-[14%] top-[25%] h-[37%] w-[15%] rounded-full border border-slate-300 bg-white/80" />
      <div className="absolute left-[71%] top-[25%] h-[37%] w-[15%] rounded-full border border-slate-300 bg-white/80" />
      <div className="absolute left-[29%] top-[60%] h-[37%] w-[18%] rounded-full border border-slate-300 bg-white/80" />
      <div className="absolute left-[53%] top-[60%] h-[37%] w-[18%] rounded-full border border-slate-300 bg-white/80" />

      {view === 'front' ? (
        <>
          <div className="absolute left-[45%] top-[9%] h-1.5 w-1.5 rounded-full bg-slate-300" />
          <div className="absolute left-[54%] top-[9%] h-1.5 w-1.5 rounded-full bg-slate-300" />
          <div className="absolute left-[47%] top-[13%] h-px w-[6%] bg-slate-300" />
          <div className="absolute left-[38%] top-[31%] h-2 w-2 rounded-full border border-slate-300" />
          <div className="absolute left-[60%] top-[31%] h-2 w-2 rounded-full border border-slate-300" />
        </>
      ) : (
        <>
          <div className="absolute left-[40%] top-[10%] h-[7%] w-[20%] rounded-b-full border-b border-slate-300" />
          <div className="absolute left-[40%] top-[60%] h-[8%] w-[20%] rounded-b-full border-b border-slate-300" />
        </>
      )}

      {visibleRegions.map((region) => (
        <ApolloBodyRegion
          key={region.field}
          region={region.field}
          label={region.label}
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
