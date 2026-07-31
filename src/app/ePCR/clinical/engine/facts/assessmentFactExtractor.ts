import type {
  AssessmentBodyRegionFinding,
  AssessmentBodySubRegionFinding,
  AssessmentCmsTpForm,
  AssessmentForm,
} from '../../assessment/assessmentForm';
import {
  dcapBtlsFindings,
  type DcapBtlsFindings,
} from '../../assessment/dcapBtls';
import type { ApolloBodyRegionKey } from '../../components/body-map/bodyMapTypes';
import { apolloBodyRegionDetails } from '../../components/body-map/bodyRegionDetails';
import { assessmentClinicalFactRegistry } from './assessmentFacts';
import type { ClinicalFact, ClinicalFactValue } from './types';

const bodyRegionLabels: Record<ApolloBodyRegionKey, string> = {
  head: 'Head',
  face: 'Face',
  neck: 'Neck',
  chest: 'Chest',
  abdomen: 'Abdomen',
  pelvis: 'Pelvis',
  back: 'Back',
  rightArm: 'Right Arm',
  leftArm: 'Left Arm',
  rightLeg: 'Right Leg',
  leftLeg: 'Left Leg',
};

const cmsTpLabels: Record<keyof AssessmentCmsTpForm, string> = {
  circulation: 'Circulation',
  motor: 'Motor',
  sensation: 'Sensation',
  tenderness: 'Tenderness',
  pulses: 'Pulses',
  skin: 'Skin',
  capillaryRefill: 'Capillary Refill',
  notes: 'CMS-TP Notes',
};

const alocPossibleCauseFields = [
  ['alcohol', 'Alcohol / Acidosis'],
  ['epilepsy', 'Epilepsy / Seizure'],
  ['insulin', 'Insulin / Glucose'],
  ['overdose', 'Overdose / Oxygen'],
  ['uremia', 'Uremia / Metabolic'],
  ['trauma', 'Trauma / Temperature'],
  ['infection', 'Infection'],
  ['psych', 'Psychiatric / Poisoning'],
  ['stroke', 'Stroke / Shock'],
] as const;

type FactCollector = {
  add(
    id: ClinicalFact['id'],
    value: ClinicalFactValue | undefined,
  ): void;
  list(): ClinicalFact[];
};

function createFactCollector(): FactCollector {
  const facts: ClinicalFact[] = [];

  return {
    add(id, value) {
      if (value === undefined) {
        return;
      }

      if (typeof value === 'string' && !value.trim()) {
        return;
      }

      if (Array.isArray(value) && value.length === 0) {
        return;
      }

      const fact: ClinicalFact = {
        id,
        value,
      };

      const validation = assessmentClinicalFactRegistry.validate(fact);

      if (!validation.valid) {
        throw new Error(validation.message);
      }

      facts.push(fact);
    },

    list() {
      return [...facts];
    },
  };
}

function parseDocumentedNumber(value: string): number | undefined {
  const normalizedValue = value.trim();

  if (!normalizedValue) {
    return undefined;
  }

  const parsedValue = Number(normalizedValue);

  return Number.isFinite(parsedValue) ? parsedValue : undefined;
}

function hasText(value: string): boolean {
  return Boolean(value.trim());
}

function getGcsTotal(
  eyes: number | undefined,
  verbal: number | undefined,
  motor: number | undefined,
): number | undefined {
  if (
    eyes === undefined ||
    verbal === undefined ||
    motor === undefined
  ) {
    return undefined;
  }

  return eyes + verbal + motor;
}

function getGfastScore(values: readonly string[]): number | undefined {
  if (!values.some(hasText)) {
    return undefined;
  }

  return values.reduce(
    (score, value) => score + (value === 'Abnormal' ? 1 : 0),
    0,
  );
}

function getPainScore(
  painScaleType: string,
  numericPainScore: string,
  facesPainScore: string,
): number | undefined {
  if (painScaleType === '0-10 Numeric') {
    return parseDocumentedNumber(numericPainScore);
  }

  if (painScaleType === 'Wong-Baker Faces') {
    return parseDocumentedNumber(facesPainScore);
  }

  return undefined;
}

function getDcapBtlsFindingDescriptions(
  location: string,
  findings: DcapBtlsFindings,
): string[] {
  return dcapBtlsFindings.flatMap(({ field, label }) =>
    findings[field] ? [`${location}: ${label}`] : [],
  );
}

function getCmsTpFindingDescriptions(
  location: string,
  cmsTp: AssessmentCmsTpForm,
): string[] {
  return (
    Object.entries(cmsTp) as [
      keyof AssessmentCmsTpForm,
      string,
    ][]
  ).flatMap(([field, value]) =>
    hasText(value)
      ? [`${location}: ${cmsTpLabels[field]} - ${value.trim()}`]
      : [],
  );
}

function hasDcapBtlsFinding(findings: DcapBtlsFindings): boolean {
  return Object.values(findings).some(Boolean);
}

function hasCmsTpFinding(cmsTp: AssessmentCmsTpForm): boolean {
  return Object.values(cmsTp).some(hasText);
}

function hasRegionFinding(
  finding: AssessmentBodyRegionFinding,
): boolean {
  return (
    hasDcapBtlsFinding(finding.dcapBtls) ||
    hasCmsTpFinding(finding.cmsTp) ||
    hasText(finding.notes)
  );
}

function hasSubregionFinding(
  finding: AssessmentBodySubRegionFinding,
): boolean {
  return (
    finding.unremarkable ||
    hasDcapBtlsFinding(finding.dcapBtls) ||
    hasCmsTpFinding(finding.cmsTp) ||
    hasText(finding.notes)
  );
}

function extractBodyFacts(
  form: AssessmentForm,
  collector: FactCollector,
): void {
  const regionsAssessed: string[] = [];
  const unremarkableRegions: string[] = [];
  const abnormalRegions: string[] = [];
  const dcapBtlsFindingsList: string[] = [];
  const cmsTpFindingsList: string[] = [];
  const notes: string[] = [];

  (
    Object.keys(bodyRegionLabels) as ApolloBodyRegionKey[]
  ).forEach((region) => {
    const regionLabel = bodyRegionLabels[region];
    const regionFinding = form.bodyMap.regionFindings[region];
    const subregionFindings =
      form.bodyMap.subregionFindings[region];

    const hasDocumentedSubregion = Object.values(
      subregionFindings,
    ).some(hasSubregionFinding);

    const regionAssessed =
      form.bodyMap.selectedRegions[region] ||
      form.bodyMap.unremarkableRegions[region] ||
      hasRegionFinding(regionFinding) ||
      hasDocumentedSubregion;

    if (regionAssessed) {
      regionsAssessed.push(regionLabel);
    }

    if (form.bodyMap.unremarkableRegions[region]) {
      unremarkableRegions.push(regionLabel);
    }

    let regionIsAbnormal =
      hasDcapBtlsFinding(regionFinding.dcapBtls) ||
      hasCmsTpFinding(regionFinding.cmsTp) ||
      hasText(regionFinding.notes);

    dcapBtlsFindingsList.push(
      ...getDcapBtlsFindingDescriptions(
        regionLabel,
        regionFinding.dcapBtls,
      ),
    );

    cmsTpFindingsList.push(
      ...getCmsTpFindingDescriptions(
        regionLabel,
        regionFinding.cmsTp,
      ),
    );

    if (hasText(regionFinding.notes)) {
      notes.push(`${regionLabel}: ${regionFinding.notes.trim()}`);
    }

    apolloBodyRegionDetails[region].forEach((subregion) => {
      const finding = subregionFindings[subregion.id];

      if (!finding) {
        return;
      }

      const location = `${regionLabel} — ${subregion.label}`;

      if (
        hasDcapBtlsFinding(finding.dcapBtls) ||
        hasCmsTpFinding(finding.cmsTp) ||
        hasText(finding.notes)
      ) {
        regionIsAbnormal = true;
      }

      dcapBtlsFindingsList.push(
        ...getDcapBtlsFindingDescriptions(
          location,
          finding.dcapBtls,
        ),
      );

      cmsTpFindingsList.push(
        ...getCmsTpFindingDescriptions(location, finding.cmsTp),
      );

      if (hasText(finding.notes)) {
        notes.push(`${location}: ${finding.notes.trim()}`);
      }
    });

    if (regionIsAbnormal) {
      abnormalRegions.push(regionLabel);
    }
  });

  collector.add(
    'assessment.body.regions-assessed',
    regionsAssessed,
  );
  collector.add(
    'assessment.body.unremarkable-regions',
    unremarkableRegions,
  );
  collector.add(
    'assessment.body.abnormal-regions',
    abnormalRegions,
  );
  collector.add(
    'assessment.body.dcap-btls-findings',
    dcapBtlsFindingsList,
  );
  collector.add(
    'assessment.body.cms-tp-findings',
    cmsTpFindingsList,
  );
  collector.add('assessment.body.notes', notes);
}

/**
 * Converts documented AssessmentForm values into validated clinical facts.
 *
 * Empty and incomplete values are omitted. The extractor does not infer a
 * finding that the clinician did not document.
 */
export function extractAssessmentClinicalFacts(
  form: AssessmentForm,
): ClinicalFact[] {
  const collector = createFactCollector();
  const { clinical } = form;

  collector.add(
    'assessment.primary.general-impression',
    clinical.primary.generalImpression,
  );
  collector.add(
    'assessment.primary.airway',
    clinical.primary.airway,
  );
  collector.add(
    'assessment.primary.breathing',
    clinical.primary.breathing,
  );
  collector.add(
    'assessment.primary.circulation',
    clinical.primary.circulation,
  );
  collector.add(
    'assessment.primary.disability',
    clinical.primary.disability,
  );
  collector.add(
    'assessment.primary.exposure',
    clinical.primary.exposure,
  );

  collector.add(
    'assessment.consciousness.avpu',
    clinical.consciousness.avpu,
  );
  collector.add(
    'assessment.consciousness.orientation',
    clinical.consciousness.orientation,
  );

  const gcsEyes = parseDocumentedNumber(clinical.gcs.eyes);
  const gcsVerbal = parseDocumentedNumber(clinical.gcs.verbal);
  const gcsMotor = parseDocumentedNumber(clinical.gcs.motor);

  collector.add('assessment.gcs.eyes', gcsEyes);
  collector.add('assessment.gcs.verbal', gcsVerbal);
  collector.add('assessment.gcs.motor', gcsMotor);
  collector.add(
    'assessment.gcs.total',
    getGcsTotal(gcsEyes, gcsVerbal, gcsMotor),
  );

  const gfastScoredValues = [
    clinical.gfast.gaze,
    clinical.gfast.face,
    clinical.gfast.arms,
    clinical.gfast.speech,
  ];

  collector.add(
    'assessment.gfast.gaze',
    clinical.gfast.gaze,
  );
  collector.add(
    'assessment.gfast.face',
    clinical.gfast.face,
  );
  collector.add(
    'assessment.gfast.arms',
    clinical.gfast.arms,
  );
  collector.add(
    'assessment.gfast.speech',
    clinical.gfast.speech,
  );
  collector.add(
    'assessment.gfast.last-known-well',
    clinical.gfast.time,
  );
  collector.add(
    'assessment.gfast.blood-glucose',
    parseDocumentedNumber(clinical.gfast.bloodGlucose),
  );
  collector.add(
    'assessment.gfast.score',
    getGfastScore(gfastScoredValues),
  );

  collector.add(
    'assessment.pain.present',
    clinical.pain.painPresent,
  );
  collector.add(
    'assessment.pain.scale-type',
    clinical.pain.painScaleType,
  );
  collector.add(
    'assessment.pain.score',
    getPainScore(
      clinical.pain.painScaleType,
      clinical.pain.numericPainScore,
      clinical.pain.facesPainScore,
    ),
  );
  collector.add(
    'assessment.pain.onset',
    clinical.pain.onset,
  );
  collector.add(
    'assessment.pain.provocation-palliation',
    clinical.pain.provocation,
  );
  collector.add(
    'assessment.pain.quality',
    clinical.pain.quality,
  );
  collector.add(
    'assessment.pain.radiation',
    clinical.pain.radiation,
  );
  collector.add(
    'assessment.pain.time',
    clinical.pain.time,
  );

  collector.add(
    'assessment.respiratory.effort',
    clinical.respiratory.respiratoryEffort,
  );
  collector.add(
    'assessment.respiratory.airway-patency',
    clinical.respiratory.airwayPatency,
  );
  collector.add(
    'assessment.respiratory.breath-sounds-left',
    clinical.respiratory.breathSoundsLeft,
  );
  collector.add(
    'assessment.respiratory.breath-sounds-right',
    clinical.respiratory.breathSoundsRight,
  );
  collector.add(
    'assessment.respiratory.accessory-muscle-use',
    clinical.respiratory.accessoryMuscleUse,
  );
  collector.add(
    'assessment.respiratory.current-support',
    clinical.respiratory.currentRespiratorySupport,
  );
  collector.add(
    'assessment.respiratory.response',
    clinical.respiratory.observedResponse,
  );

  collector.add(
    'assessment.aloc.current-mental-status',
    clinical.aloc.currentMentalStatus,
  );
  collector.add(
    'assessment.aloc.orientation',
    clinical.aloc.orientation,
  );
  collector.add(
    'assessment.aloc.speech',
    clinical.aloc.speech,
  );
  collector.add(
    'assessment.aloc.pupils',
    clinical.aloc.pupils,
  );
  collector.add(
    'assessment.aloc.blood-glucose',
    parseDocumentedNumber(clinical.aloc.bloodGlucose),
  );

  const possibleAlocCauses = alocPossibleCauseFields.flatMap(
    ([field, label]) => {
      const value = clinical.aloc[field];

      return value === 'Possible' || value === 'Confirmed'
        ? [`${label}: ${value}`]
        : [];
    },
  );

  collector.add(
    'assessment.aloc.possible-causes',
    possibleAlocCauses,
  );

  if (clinical.ecg.notIndicated) {
    collector.add('assessment.ecg.not-indicated', true);
  }

  collector.add(
    'assessment.ecg.four-lead-interpretation',
    clinical.ecg.fourLeadInterpretation,
  );
  collector.add(
    'assessment.ecg.twelve-lead-interpretation',
    clinical.ecg.twelveLeadInterpretation,
  );
  collector.add(
    'assessment.ecg.abnormal-findings',
    clinical.ecg.abnormalFindings,
  );

  extractBodyFacts(form, collector);

  return collector.list();
}