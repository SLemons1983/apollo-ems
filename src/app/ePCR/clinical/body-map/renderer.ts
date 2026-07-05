import type {
  ApolloBodyRegionKey,
  ApolloBodyRegionStatus,
} from '../components/body-map/bodyMapTypes';
import { apolloBodyRegions } from '../components/body-map/bodyMapData';
import { overlaysForRegion } from './engine';
import type { ApolloClinicalOverlay } from './types';

export function buildBodyRegionStatusesFromClinicalOverlays(
  overlays: ApolloClinicalOverlay[],
): Partial<Record<ApolloBodyRegionKey, ApolloBodyRegionStatus>> {
  return apolloBodyRegions.reduce(
    (statuses, region) => {
      const regionOverlays = overlaysForRegion(overlays, region.field);

      if (regionOverlays.length === 0) {
        return statuses;
      }

      return {
        ...statuses,
        [region.field]: {
          findingCount: regionOverlays.length,
          note: regionOverlays
            .map((overlay) => overlay.value || overlay.label)
            .join(' · '),
          overlays: regionOverlays.map((overlay) => ({
            type: overlay.type,
            label: overlay.label,
            value: overlay.value,
            count: overlay.severity,
            color: overlay.color,
          })),
        },
      };
    },
    {} as Partial<Record<ApolloBodyRegionKey, ApolloBodyRegionStatus>>,
  );
}

export function mergeBodyRegionStatuses(
  baseStatuses: Partial<Record<ApolloBodyRegionKey, ApolloBodyRegionStatus>>,
  overlayStatuses: Partial<Record<ApolloBodyRegionKey, ApolloBodyRegionStatus>>,
): Partial<Record<ApolloBodyRegionKey, ApolloBodyRegionStatus>> {
  return apolloBodyRegions.reduce(
    (merged, region) => {
      const baseStatus = baseStatuses[region.field];
      const overlayStatus = overlayStatuses[region.field];

      if (!baseStatus && !overlayStatus) {
        return merged;
      }

      return {
        ...merged,
        [region.field]: {
          ...baseStatus,
          ...overlayStatus,
          findingCount:
            (baseStatus?.findingCount ?? 0) +
            (overlayStatus?.findingCount ?? 0),
          note: [baseStatus?.note, overlayStatus?.note]
            .filter(Boolean)
            .join(' · '),
          overlays: [
            ...(baseStatus?.overlays ?? []),
            ...(overlayStatus?.overlays ?? []),
          ],
        },
      };
    },
    {} as Partial<Record<ApolloBodyRegionKey, ApolloBodyRegionStatus>>,
  );
}
