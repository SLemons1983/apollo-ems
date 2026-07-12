import type { ApolloBodyRegionKey } from '../components/body-map/bodyMapTypes';
import {
  createEmptyDcapBtlsFindings,
  type DcapBtlsFindings,
} from './dcapBtls';

export type ApolloBodyRegionSelection = Record<ApolloBodyRegionKey, boolean>;

export type AssessmentExtremityRegionKey =
  | 'rightArm'
  | 'leftArm'
  | 'rightLeg'
  | 'leftLeg';

export type AssessmentCmsTpForm = {
  circulation: string;
  motor: string;
  sensation: string;
  tenderness: string;
  pulses: string;
  skin: string;
  capillaryRefill: string;
  notes: string;
};

export type AssessmentCmsTpField = keyof AssessmentCmsTpForm;

export type AssessmentBodyRegionFinding = {
  dcapBtls: DcapBtlsFindings;
  cmsTp: AssessmentCmsTpForm;
  notes: string;
};

export type AssessmentBodyRegionFindings = Record<
  ApolloBodyRegionKey,
  AssessmentBodyRegionFinding
>;

export type AssessmentBodyMapForm = {
  currentFocus: ApolloBodyRegionKey | '';
  selectedRegions: ApolloBodyRegionSelection;
  unremarkableRegions: ApolloBodyRegionSelection;
  regionFindings: AssessmentBodyRegionFindings;
};

export type AssessmentForm = {
  bodyMap: AssessmentBodyMapForm;
};

export function isAssessmentExtremityRegion(
  region: ApolloBodyRegionKey | '',
): region is AssessmentExtremityRegionKey {
  return (
    region === 'rightArm' ||
    region === 'leftArm' ||
    region === 'rightLeg' ||
    region === 'leftLeg'
  );
}

export function createEmptyBodyRegionSelection(): ApolloBodyRegionSelection {
  return {
    head: false,
    face: false,
    neck: false,
    chest: false,
    abdomen: false,
    pelvis: false,
    back: false,
    rightArm: false,
    leftArm: false,
    rightLeg: false,
    leftLeg: false,
  };
}

export function createEmptyAssessmentCmsTp(): AssessmentCmsTpForm {
  return {
    circulation: '',
    motor: '',
    sensation: '',
    tenderness: '',
    pulses: '',
    skin: '',
    capillaryRefill: '',
    notes: '',
  };
}

function createEmptyBodyRegionFinding(): AssessmentBodyRegionFinding {
  return {
    dcapBtls: createEmptyDcapBtlsFindings(),
    cmsTp: createEmptyAssessmentCmsTp(),
    notes: '',
  };
}

export function createEmptyBodyRegionFindings(): AssessmentBodyRegionFindings {
  return {
    head: createEmptyBodyRegionFinding(),
    face: createEmptyBodyRegionFinding(),
    neck: createEmptyBodyRegionFinding(),
    chest: createEmptyBodyRegionFinding(),
    abdomen: createEmptyBodyRegionFinding(),
    pelvis: createEmptyBodyRegionFinding(),
    back: createEmptyBodyRegionFinding(),
    rightArm: createEmptyBodyRegionFinding(),
    leftArm: createEmptyBodyRegionFinding(),
    rightLeg: createEmptyBodyRegionFinding(),
    leftLeg: createEmptyBodyRegionFinding(),
  };
}

export function createDefaultAssessmentForm(): AssessmentForm {
  return {
    bodyMap: {
      currentFocus: '',
      selectedRegions: createEmptyBodyRegionSelection(),
      unremarkableRegions: createEmptyBodyRegionSelection(),
      regionFindings: createEmptyBodyRegionFindings(),
    },
  };
}
