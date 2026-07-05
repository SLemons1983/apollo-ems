import type { ApolloBodyRegionKey } from '../components/body-map/bodyMapTypes';
import type { ApolloClinicalOverlay } from './types';

export function overlaysForRegion(
  overlays: ApolloClinicalOverlay[],
  region: ApolloBodyRegionKey,
) {
  return overlays.filter((overlay) => overlay.region === region);
}

export function overlayCount(
  overlays: ApolloClinicalOverlay[],
  region: ApolloBodyRegionKey,
) {
  return overlaysForRegion(overlays, region).length;
}

export function hasOverlay(
  overlays: ApolloClinicalOverlay[],
  region: ApolloBodyRegionKey,
) {
  return overlayCount(overlays, region) > 0;
}

export function overlaysByRegion(overlays: ApolloClinicalOverlay[]) {
  return overlays.reduce(
    (grouped, overlay) => ({
      ...grouped,
      [overlay.region]: [...(grouped[overlay.region] ?? []), overlay],
    }),
    {} as Partial<Record<ApolloBodyRegionKey, ApolloClinicalOverlay[]>>,
  );
}
