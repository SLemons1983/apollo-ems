import type { ApolloBodyRegionKey } from '../components/body-map/bodyMapTypes';
import type {
  ApolloClinicalOverlay,
  ApolloClinicalOverlayColor,
  ApolloClinicalOverlayType,
} from './types';

type CreateClinicalOverlayInput = {
  region: ApolloBodyRegionKey;
  type: ApolloClinicalOverlayType;
  label: string;
  value?: string;
  severity?: number;
  color?: ApolloClinicalOverlayColor;
  metadata?: Record<string, string | number | boolean>;
};

const defaultOverlayColors: Record<
  ApolloClinicalOverlayType,
  ApolloClinicalOverlayColor
> = {
  finding: 'amber',
  pain: 'red',
  burn: 'red',
  cms: 'green',
  procedure: 'blue',
  treatment: 'blue',
  deficit: 'red',
  device: 'blue',
  landmark: 'blue',
};

function toOverlayIdPart(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export function createClinicalOverlay({
  region,
  type,
  label,
  value,
  severity,
  color,
  metadata,
}: CreateClinicalOverlayInput): ApolloClinicalOverlay {
  const idParts = [region, type, label, value]
    .filter(Boolean)
    .map((part) => toOverlayIdPart(String(part)));

  return {
    id: idParts.join('-'),
    region,
    type,
    label,
    value,
    severity,
    color: color ?? defaultOverlayColors[type],
    metadata,
  };
}

export function createFindingOverlay(
  region: ApolloBodyRegionKey,
  label: string,
) {
  return createClinicalOverlay({
    region,
    type: 'finding',
    label,
    value: label,
  });
}

export function createCmsOverlay(
  region: ApolloBodyRegionKey,
  label: string,
  value: string,
) {
  return createClinicalOverlay({
    region,
    type: 'cms',
    label,
    value: `${label}: ${value}`,
  });
}
