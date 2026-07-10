import type { ApolloBodyRegionKey } from '../components/body-map/bodyMapTypes';

export type ApolloBodyRegionSelection = Record<ApolloBodyRegionKey, boolean>;

export type AssessmentBodyMapForm = {
  currentFocus: ApolloBodyRegionKey | '';
  selectedRegions: ApolloBodyRegionSelection;
  unremarkableRegions: ApolloBodyRegionSelection;
};

export type AssessmentForm = {
  bodyMap: AssessmentBodyMapForm;
};

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

export function createDefaultAssessmentForm(): AssessmentForm {
  return {
    bodyMap: {
      currentFocus: '',
      selectedRegions: createEmptyBodyRegionSelection(),
      unremarkableRegions: createEmptyBodyRegionSelection(),
    },
  };
}
