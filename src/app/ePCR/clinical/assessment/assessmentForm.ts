import type { ApolloBodyRegionKey } from '../components/body-map/bodyMapTypes';
import { apolloBodyRegionDetails } from '../components/body-map/bodyRegionDetails';
import {
  createEmptyDcapBtlsFindings,
  type DcapBtlsFindings,
} from './dcapBtls';
import type { AlocAssessmentForm } from '../components/assessment/cards/AlocAssessmentCard';
import type { ClinicalHistoryForm } from '../components/assessment/cards/ClinicalHistoryCard';
import type { ConsciousnessAssessmentForm } from '../components/assessment/cards/ConsciousnessAssessmentCard';
import type { ExtremityAssessmentForm } from '../components/assessment/cards/ExtremityAssessmentCard';
import type { EcgAssessmentForm } from '../components/assessment/cards/EcgAssessmentCard';
import type { GcsAssessmentForm } from '../components/assessment/cards/GcsAssessmentCard';
import type { GfastAssessmentForm } from '../components/assessment/cards/GfastAssessmentCard';
import type { PainAssessmentForm } from '../components/assessment/cards/PainAssessmentCard';
import type { PrimaryAssessmentForm } from '../components/assessment/cards/PrimaryAssessmentCard';
import type { ReassessmentForm } from '../components/assessment/cards/ReassessmentCard';
import type { RespiratoryAssessmentForm } from '../components/assessment/cards/RespiratoryAssessmentCard';
import type { RevisedTraumaScoreForm } from '../components/assessment/cards/RevisedTraumaScoreCard';
import type { TraumaAssessmentForm } from '../components/assessment/cards/TraumaAssessmentCard';

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

export type AssessmentClinicalStatus =
  | 'not-assessed'
  | 'in-progress'
  | 'unremarkable'
  | 'abnormal'
  | 'complete';

export type AssessmentBodySubRegionFinding = {
  unremarkable: boolean;
  dcapBtls: DcapBtlsFindings;
  cmsTp: AssessmentCmsTpForm;
  notes: string;
};

export type AssessmentBodySubRegionFindings = Record<
  ApolloBodyRegionKey,
  Record<string, AssessmentBodySubRegionFinding>
>;

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
  subregionFindings: AssessmentBodySubRegionFindings;
};

export type AssessmentClinicalForm = {
  consciousness: ConsciousnessAssessmentForm;
  history: ClinicalHistoryForm;
  pain: PainAssessmentForm;
  primary: PrimaryAssessmentForm;
  gcs: GcsAssessmentForm;
  gfast: GfastAssessmentForm;
  extremity: ExtremityAssessmentForm;
  trauma: TraumaAssessmentForm;
  reassessment: ReassessmentForm;
  revisedTraumaScore: RevisedTraumaScoreForm;
  respiratory: RespiratoryAssessmentForm;
  aloc: AlocAssessmentForm;
  ecg: EcgAssessmentForm;
};

export type AssessmentForm = {
  clinical: AssessmentClinicalForm;
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

export function getBodySubRegionAssessmentStatus(
  finding: AssessmentBodySubRegionFinding,
): AssessmentClinicalStatus {
  const hasDcapBtlsFindings = Object.values(
    finding.dcapBtls,
  ).some(Boolean);

  if (hasDcapBtlsFindings) {
    return 'abnormal';
  }

  if (finding.unremarkable) {
    return 'unremarkable';
  }

  const completedCmsTpFields = [
    finding.cmsTp.circulation,
    finding.cmsTp.motor,
    finding.cmsTp.sensation,
    finding.cmsTp.tenderness,
    finding.cmsTp.pulses,
    finding.cmsTp.skin,
    finding.cmsTp.capillaryRefill,
  ].filter(Boolean).length;

  if (completedCmsTpFields === 7) {
    return 'complete';
  }

  if (
    completedCmsTpFields > 0 ||
    Boolean(finding.cmsTp.notes.trim()) ||
    Boolean(finding.notes.trim())
  ) {
    return 'in-progress';
  }

  return 'not-assessed';
}

export function getBodyRegionAssessmentStatusFromSubregions(
  findings: Record<string, AssessmentBodySubRegionFinding>,
): AssessmentClinicalStatus {
  const statuses = Object.values(findings).map(
    getBodySubRegionAssessmentStatus,
  );

  if (statuses.length === 0) {
    return 'not-assessed';
  }

  if (statuses.some((status) => status === 'abnormal')) {
    return 'abnormal';
  }

  if (statuses.every((status) => status === 'unremarkable')) {
    return 'unremarkable';
  }

  const allAddressed = statuses.every(
    (status) =>
      status === 'unremarkable' ||
      status === 'complete',
  );

  if (allAddressed) {
    return 'complete';
  }

  if (statuses.some((status) => status !== 'not-assessed')) {
    return 'in-progress';
  }

  return 'not-assessed';
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

export function createEmptyBodySubRegionFinding(): AssessmentBodySubRegionFinding {
  return {
    unremarkable: false,
    dcapBtls: createEmptyDcapBtlsFindings(),
    cmsTp: createEmptyAssessmentCmsTp(),
    notes: '',
  };
}

export function createEmptyBodySubRegionFindings(): AssessmentBodySubRegionFindings {
  return Object.fromEntries(
    (
      Object.keys(apolloBodyRegionDetails) as ApolloBodyRegionKey[]
    ).map((region) => [
      region,
      Object.fromEntries(
        apolloBodyRegionDetails[region].map((subregion) => [
          subregion.id,
          createEmptyBodySubRegionFinding(),
        ]),
      ),
    ]),
  ) as AssessmentBodySubRegionFindings;
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

export function createUnremarkableBodySubRegionFinding(): AssessmentBodySubRegionFinding {
  return {
    ...createEmptyBodySubRegionFinding(),
    unremarkable: true,
  };
}

export function markAssessmentSubregionUnremarkable(
  current: AssessmentForm,
  region: ApolloBodyRegionKey,
  subregionId: string,
): AssessmentForm {
  const currentSubregion =
    current.bodyMap.subregionFindings[region][subregionId];

  if (!currentSubregion) {
    return current;
  }

  const nextRegionSubregions = {
    ...current.bodyMap.subregionFindings[region],
    [subregionId]: createUnremarkableBodySubRegionFinding(),
  };

  const allSubregionsUnremarkable = Object.values(
    nextRegionSubregions,
  ).every((finding) => finding.unremarkable);

  return {
    ...current,
    bodyMap: {
      ...current.bodyMap,
      currentFocus: region,
      selectedRegions: {
        ...current.bodyMap.selectedRegions,
        [region]: true,
      },
      unremarkableRegions: {
        ...current.bodyMap.unremarkableRegions,
        [region]: allSubregionsUnremarkable,
      },
      regionFindings: {
        ...current.bodyMap.regionFindings,
        ...(allSubregionsUnremarkable
          ? {
              [region]: createEmptyBodyRegionFinding(),
            }
          : {}),
      },
      subregionFindings: {
        ...current.bodyMap.subregionFindings,
        [region]: nextRegionSubregions,
      },
    },
  };
}

export function markAssessmentRegionUnremarkable(
  current: AssessmentForm,
  region: ApolloBodyRegionKey,
): AssessmentForm {
  const nextRegionSubregions = Object.fromEntries(
    apolloBodyRegionDetails[region].map((subregion) => [
      subregion.id,
      createUnremarkableBodySubRegionFinding(),
    ]),
  );

  return {
    ...current,
    bodyMap: {
      ...current.bodyMap,
      currentFocus: region,
      selectedRegions: {
        ...current.bodyMap.selectedRegions,
        [region]: true,
      },
      unremarkableRegions: {
        ...current.bodyMap.unremarkableRegions,
        [region]: true,
      },
      regionFindings: {
        ...current.bodyMap.regionFindings,
        [region]: createEmptyBodyRegionFinding(),
      },
      subregionFindings: {
        ...current.bodyMap.subregionFindings,
        [region]: nextRegionSubregions,
      },
    },
  };
}

export function markEntireAssessmentBodyUnremarkable(
  current: AssessmentForm,
): AssessmentForm {
  const selectedRegions = Object.fromEntries(
    (
      Object.keys(apolloBodyRegionDetails) as ApolloBodyRegionKey[]
    ).map((region) => [region, true]),
  ) as ApolloBodyRegionSelection;

  const subregionFindings = Object.fromEntries(
    (
      Object.keys(apolloBodyRegionDetails) as ApolloBodyRegionKey[]
    ).map((region) => [
      region,
      Object.fromEntries(
        apolloBodyRegionDetails[region].map((subregion) => [
          subregion.id,
          createUnremarkableBodySubRegionFinding(),
        ]),
      ),
    ]),
  ) as AssessmentBodySubRegionFindings;

  return {
    ...current,
    bodyMap: {
      ...current.bodyMap,
      selectedRegions,
      unremarkableRegions: {
        ...selectedRegions,
      },
      regionFindings: createEmptyBodyRegionFindings(),
      subregionFindings,
    },
  };
}

export function createDefaultAssessmentForm(): AssessmentForm {
  return {
    clinical: {
      consciousness: {
        avpu: '',
        orientation: '',
      },
      history: {
        eventsLeadingToIllness: '',
        additionalHistoryNotes: '',
      },
      pain: {
        painPresent: '',
        painScaleType: '',
        numericPainScore: '',
        facesPainScore: '',
        onset: '',
        provocation: '',
        quality: '',
        radiation: '',
        time: '',
      },
      primary: {
        generalImpression: '',
        levelOfConsciousness: '',
        airway: '',
        breathing: '',
        circulation: '',
        disability: '',
        exposure: '',
        gcsEyes: '',
        gcsVerbal: '',
        gcsMotor: '',
        pupils: '',
        skinColor: '',
        skinTemperature: '',
        skinCondition: '',
        lifeThreats: '',
        transportPriority: '',
      },
      gcs: {
        eyes: '',
        verbal: '',
        motor: '',
      },
      gfast: {
        gaze: '',
        face: '',
        arms: '',
        speech: '',
        time: '',
        bloodGlucose: '',
      },
      ecg: {
        fourLeadInterpretation: '',
        twelveLeadInterpretation: '',
        abnormalFindings: '',
      },
      extremity: {
        rightArm: {
          selected: false,
          circulation: '',
          motor: '',
          sensation: '',
          tenderness: '',
          pulses: '',
          skin: '',
          capillaryRefill: '',
          notes: '',
        },
        leftArm: {
          selected: false,
          circulation: '',
          motor: '',
          sensation: '',
          tenderness: '',
          pulses: '',
          skin: '',
          capillaryRefill: '',
          notes: '',
        },
        rightLeg: {
          selected: false,
          circulation: '',
          motor: '',
          sensation: '',
          tenderness: '',
          pulses: '',
          skin: '',
          capillaryRefill: '',
          notes: '',
        },
        leftLeg: {
          selected: false,
          circulation: '',
          motor: '',
          sensation: '',
          tenderness: '',
          pulses: '',
          skin: '',
          capillaryRefill: '',
          notes: '',
        },
      },
      trauma: {
        regions: Object.fromEntries(
          (
            Object.keys(
              createEmptyBodyRegionSelection(),
            ) as ApolloBodyRegionKey[]
          ).map((region) => [
            region,
            {
              selected: false,
              findings: {
                deformity: false,
                contusions: false,
                abrasions: false,
                puncturesPenetrations: false,
                burns: false,
                tenderness: false,
                lacerations: false,
                swelling: false,
              },
              cms: {
                circulation: '',
                motor: '',
                sensation: '',
              },
            },
          ]),
        ) as TraumaAssessmentForm['regions'],
      },
      reassessment: {
        reason: '',
        patientCondition: '',
        mentalStatus: '',
        airwayBreathing: '',
        circulation: '',
        painChange: '',
        interventionsResponse: '',
        transportPriority: '',
        notes: '',
      },
      revisedTraumaScore: {
        respiratoryRate: '',
        systolicBloodPressure: '',
        notes: '',
      },
      respiratory: {
        respiratoryEffort: '',
        airwayPatency: '',
        breathSoundsLeft: '',
        breathSoundsRight: '',
        accessoryMuscleUse: '',
        cough: '',
        currentRespiratorySupport: '',
        observedResponse: '',
        pastmedProvocation: '',
        pastmedAssociatedSymptoms: '',
        pastmedSputum: '',
        pastmedTriggers: '',
        pastmedMedicalHistory: '',
        pastmedExerciseTolerance: '',
        pastmedDuration: '',
        notes: '',
      },
      aloc: {
        currentMentalStatus: '',
        orientation: '',
        speech: '',
        pupils: '',
        bloodGlucose: '',
        alcohol: '',
        epilepsy: '',
        insulin: '',
        overdose: '',
        uremia: '',
        trauma: '',
        infection: '',
        psych: '',
        stroke: '',
        notes: '',
      },
    },
    bodyMap: {
      currentFocus: '',
      selectedRegions: createEmptyBodyRegionSelection(),
      unremarkableRegions: createEmptyBodyRegionSelection(),
      regionFindings: createEmptyBodyRegionFindings(),
      subregionFindings: createEmptyBodySubRegionFindings(),
    },
  };
}
