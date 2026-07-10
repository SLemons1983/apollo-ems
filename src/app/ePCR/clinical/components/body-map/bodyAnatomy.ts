import type { ApolloBodyRegionKey } from './bodyMapTypes';

export const PATIENT_LEFT_REGIONS: ApolloBodyRegionKey[] = [
  'leftArm',
  'leftLeg',
];

export const PATIENT_RIGHT_REGIONS: ApolloBodyRegionKey[] = [
  'rightArm',
  'rightLeg',
];

export function isPatientLeft(region: ApolloBodyRegionKey) {
  return PATIENT_LEFT_REGIONS.includes(region);
}

export function isPatientRight(region: ApolloBodyRegionKey) {
  return PATIENT_RIGHT_REGIONS.includes(region);
}

export function getClinicalDisplayName(region: ApolloBodyRegionKey) {
  switch (region) {
    case 'leftArm':
      return "Patient's Left Arm";

    case 'rightArm':
      return "Patient's Right Arm";

    case 'leftLeg':
      return "Patient's Left Leg";

    case 'rightLeg':
      return "Patient's Right Leg";

    case 'head':
      return 'Head';

    case 'face':
      return 'Face';

    case 'neck':
      return 'Neck';

    case 'chest':
      return 'Chest';

    case 'abdomen':
      return 'Abdomen';

    case 'pelvis':
      return 'Pelvis';

    case 'back':
      return 'Back';

    default:
      return region;
  }
}
