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
  severityLabel?: string;
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
  severityLabel,
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
    severityLabel,
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

export function createPainOverlay(
  region: ApolloBodyRegionKey,
  painScore?: number,
  value?: string,
) {
  return createClinicalOverlay({
    region,
    type: 'pain',
    label: 'Pain',
    value: value ?? (painScore !== undefined ? `Pain ${painScore}/10` : 'Pain'),
    severity: painScore,
    severityLabel: painScore !== undefined ? `${painScore}/10` : undefined,
  });
}

export function createBurnOverlay(
  region: ApolloBodyRegionKey,
  value: string,
  severityLabel?: string,
) {
  return createClinicalOverlay({
    region,
    type: 'burn',
    label: 'Burn',
    value,
    severityLabel,
  });
}

export function createDeficitOverlay(
  region: ApolloBodyRegionKey,
  value: string,
) {
  return createClinicalOverlay({
    region,
    type: 'deficit',
    label: 'Deficit',
    value,
  });
}

export function createProcedureOverlay(
  region: ApolloBodyRegionKey,
  value: string,
) {
  return createClinicalOverlay({
    region,
    type: 'procedure',
    label: 'Procedure',
    value,
  });
}

export function createTreatmentOverlay(
  region: ApolloBodyRegionKey,
  value: string,
) {
  return createClinicalOverlay({
    region,
    type: 'treatment',
    label: 'Treatment',
    value,
  });
}

export function createDeviceOverlay(
  region: ApolloBodyRegionKey,
  value: string,
) {
  return createClinicalOverlay({
    region,
    type: 'device',
    label: 'Device',
    value,
  });
}

export function createLandmarkOverlay(
  region: ApolloBodyRegionKey,
  value: string,
) {
  return createClinicalOverlay({
    region,
    type: 'landmark',
    label: 'Landmark',
    value,
  });
}
