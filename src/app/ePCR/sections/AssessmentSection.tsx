'use client';

import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import PCRCard from '../components/PCRCard';
import ApolloBodyMap from '../clinical/components/body-map/ApolloBodyMap';
import { apolloBodyRegionDetails } from '../clinical/components/body-map/bodyRegionDetails';
import { getClinicalDisplayName } from '../clinical/components/body-map/bodyAnatomy';
import type {
  ApolloBodyRegionKey,
  ApolloBodyRegionStatus,
} from '../clinical/components/body-map/bodyMapTypes';
import {
  createEmptyAssessmentCmsTp,
  getBodyRegionAssessmentStatusFromSubregions,
  getBodySubRegionAssessmentStatus,
  isAssessmentExtremityRegion,
  markAssessmentRegionUnremarkable,
  markAssessmentSubregionUnremarkable,
  markEntireAssessmentBodyUnremarkable,
  type AssessmentClinicalStatus,
  type AssessmentCmsTpField,
} from '../clinical/assessment/assessmentForm';
import {
  getAdditionalAssessmentTasksForContext,
  getAssessmentTasksForContext,
} from '../clinical/engine/assessment';
import ClinicalHistoryCard, {
  type ClinicalHistoryForm,
  type EditablePatientHistoryField,
} from '../clinical/components/assessment/cards/ClinicalHistoryCard';
import AlocAssessmentCard, {
  type AlocAssessmentForm,
} from '../clinical/components/assessment/cards/AlocAssessmentCard';
import ConsciousnessAssessmentCard, {
  type ConsciousnessAssessmentForm,
} from '../clinical/components/assessment/cards/ConsciousnessAssessmentCard';
import GcsAssessmentCard, {
  type GcsAssessmentForm,
} from '../clinical/components/assessment/cards/GcsAssessmentCard';
import GfastAssessmentCard, {
  type GfastAssessmentForm,
} from '../clinical/components/assessment/cards/GfastAssessmentCard';
import ExtremityAssessmentCard, {
  type ExtremityAssessmentForm,
  type ExtremityCmsTpAssessment,
  type ExtremityKey,
} from '../clinical/components/assessment/cards/ExtremityAssessmentCard';
import EcgAssessmentCard, {
  type EcgAssessmentForm,
} from '../clinical/components/assessment/cards/EcgAssessmentCard';
import PainAssessmentCard, {
  type PainAssessmentForm,
} from '../clinical/components/assessment/cards/PainAssessmentCard';
import PrimaryAssessmentCard, {
  type PrimaryAssessmentForm,
} from '../clinical/components/assessment/cards/PrimaryAssessmentCard';
import ReassessmentCard, {
  type ReassessmentForm,
} from '../clinical/components/assessment/cards/ReassessmentCard';
import RevisedTraumaScoreCard, {
  type RevisedTraumaScoreForm,
} from '../clinical/components/assessment/cards/RevisedTraumaScoreCard';
import RespiratoryAssessmentCard, {
  type RespiratoryAssessmentForm,
} from '../clinical/components/assessment/cards/RespiratoryAssessmentCard';
import TraumaAssessmentCard, {
  type TraumaAssessmentForm,
  type TraumaCmsAssessment,
  type TraumaFindingKey,
  type TraumaRegionKey,
} from '../clinical/components/assessment/cards/TraumaAssessmentCard';
import { calculateGcsScore } from '../clinical/engine/scores/gcs';
import type { PatientForm } from '../types';
import type {
  AssessmentForm,
  ApolloBodyRegionSelection,
} from '../clinical/assessment/assessmentForm';
import {
  createEmptyDcapBtlsFindings,
  dcapBtlsFindings,
  type DcapBtlsFindingKey,
} from '../clinical/assessment/dcapBtls';

const cmsTpFields: {
  field: Exclude<AssessmentCmsTpField, 'notes'>;
  label: string;
  options: string[];
}[] = [
  {
    field: 'circulation',
    label: 'Circulation',
    options: ['Normal', 'Impaired', 'Absent', 'Unable to Assess'],
  },
  {
    field: 'motor',
    label: 'Motor',
    options: ['Intact', 'Weak', 'Absent', 'Unable to Assess'],
  },
  {
    field: 'sensation',
    label: 'Sensation',
    options: ['Intact', 'Decreased', 'Absent', 'Unable to Assess'],
  },
  {
    field: 'tenderness',
    label: 'Tenderness',
    options: ['None', 'Present', 'Unable to Assess'],
  },
  {
    field: 'pulses',
    label: 'Pulses',
    options: ['Normal', 'Weak', 'Absent', 'Unable to Assess'],
  },
  {
    field: 'skin',
    label: 'Skin',
    options: [
      'Normal',
      'Pale',
      'Cyanotic',
      'Cool',
      'Warm',
      'Diaphoretic',
      'Unable to Assess',
    ],
  },
  {
    field: 'capillaryRefill',
    label: 'Capillary Refill',
    options: [
      'Less Than 2 Seconds',
      '2 to 3 Seconds',
      'Greater Than 3 Seconds',
      'Unable to Assess',
    ],
  },
];

const integratedBodyMapTaskIds = new Set([
  'pain-assessment',
  'gfast-stroke-assessment',
  'respiratory-assessment',
]);

type AssessmentSectionProps = {
  assessmentForm: AssessmentForm;
  onAssessmentFormChange: Dispatch<SetStateAction<AssessmentForm>>;
  patientForm: PatientForm;
  onPatientChange: (
    field: EditablePatientHistoryField,
    value: string,
  ) => void;
  providerScope: 'BLS' | 'ALS';
  clinicalCategory: string;
  suspectedStroke: boolean;
  possibleTrauma: boolean;
  behavioralHold: boolean;
  cardiacArrest: boolean;
  onProgressChange: (progress: {
    completedFields: number;
    totalFields: number;
    tasks: {
      title: string;
      completedFields: number;
      totalFields: number;
    }[];
  }) => void;
};

export default function AssessmentSection({
  assessmentForm,
  onAssessmentFormChange,
  patientForm,
  onPatientChange,
  providerScope,
  clinicalCategory,
  suspectedStroke,
  possibleTrauma,
  behavioralHold,
  cardiacArrest,
  onProgressChange,
}: AssessmentSectionProps) {
  const context = {
    clinicalCategory,
    suspectedStroke,
    possibleTrauma,
    behavioralHold,
    cardiacArrest,
  };

  const suggestedAssessmentTasks = useMemo(
    () => getAssessmentTasksForContext(context),
    [
      clinicalCategory,
      suspectedStroke,
      possibleTrauma,
      behavioralHold,
      cardiacArrest,
    ],
  );

  const suggestedTasks = useMemo(
    () =>
      suggestedAssessmentTasks.filter(
        (task) =>
          task.id !== 'primary-assessment' &&
          task.id !== 'history-taking' &&
          task.id !== 'extremity-assessment' &&
          task.id !== 'trauma-assessment' &&
          !integratedBodyMapTaskIds.has(task.id),
      ),
    [suggestedAssessmentTasks],
  );

  const additionalTasks = useMemo(
    () =>
      getAdditionalAssessmentTasksForContext(context).filter(
        (task) =>
          task.id !== 'extremity-assessment' &&
          task.id !== 'trauma-assessment' &&
          !integratedBodyMapTaskIds.has(task.id),
      ),
    [
      clinicalCategory,
      suspectedStroke,
      possibleTrauma,
      behavioralHold,
      cardiacArrest,
    ],
  );
  const [expandedTaskId, setExpandedTaskId] = useState('');
  const [expandedRegionalAssessmentId, setExpandedRegionalAssessmentId] =
    useState('');
  const [expandedBodySubregionId, setExpandedBodySubregionId] =
    useState('');
  const selectedAssessmentRegion = assessmentForm.bodyMap.currentFocus;
  const selectedAssessmentRegions = assessmentForm.bodyMap.selectedRegions;
  const bodyRegionUnremarkable =
    assessmentForm.bodyMap.unremarkableRegions;

  function setSelectedAssessmentRegion(
    nextValue: SetStateAction<ApolloBodyRegionKey | ''>,
  ) {
    onAssessmentFormChange((current) => {
      const currentValue = current.bodyMap.currentFocus;
      const resolvedValue =
        typeof nextValue === 'function'
          ? nextValue(currentValue)
          : nextValue;

      return {
        ...current,
        bodyMap: {
          ...current.bodyMap,
          currentFocus: resolvedValue,
        },
      };
    });
  }

  function setSelectedAssessmentRegions(
    nextValue: SetStateAction<ApolloBodyRegionSelection>,
  ) {
    onAssessmentFormChange((current) => {
      const currentValue = current.bodyMap.selectedRegions;
      const resolvedValue =
        typeof nextValue === 'function'
          ? nextValue(currentValue)
          : nextValue;

      return {
        ...current,
        bodyMap: {
          ...current.bodyMap,
          selectedRegions: resolvedValue,
        },
      };
    });
  }

  function setBodyRegionUnremarkable(
    nextValue: SetStateAction<ApolloBodyRegionSelection>,
  ) {
    onAssessmentFormChange((current) => {
      const currentValue = current.bodyMap.unremarkableRegions;
      const resolvedValue =
        typeof nextValue === 'function'
          ? nextValue(currentValue)
          : nextValue;

      return {
        ...current,
        bodyMap: {
          ...current.bodyMap,
          unremarkableRegions: resolvedValue,
        },
      };
    });
  }

  function setClinicalAssessmentValue<
    Key extends keyof AssessmentForm['clinical'],
  >(
    key: Key,
    nextValue: SetStateAction<AssessmentForm['clinical'][Key]>,
  ) {
    onAssessmentFormChange((current) => {
      const currentValue = current.clinical[key];
      const resolvedValue =
        typeof nextValue === 'function'
          ? (
              nextValue as (
                value: AssessmentForm['clinical'][Key],
              ) => AssessmentForm['clinical'][Key]
            )(currentValue)
          : nextValue;

      return {
        ...current,
        clinical: {
          ...current.clinical,
          [key]: resolvedValue,
        },
      };
    });
  }

  const consciousnessAssessment = assessmentForm.clinical.consciousness;
  const clinicalHistory = assessmentForm.clinical.history;
  const painAssessment = assessmentForm.clinical.pain;
  const primaryAssessment = assessmentForm.clinical.primary;
  const gcsAssessment = assessmentForm.clinical.gcs;
  const gfastAssessment = assessmentForm.clinical.gfast;
  const extremityAssessment = assessmentForm.clinical.extremity;
  const traumaAssessment = assessmentForm.clinical.trauma;
  const reassessment = assessmentForm.clinical.reassessment;
  const revisedTraumaScore = assessmentForm.clinical.revisedTraumaScore;
  const respiratoryAssessment = assessmentForm.clinical.respiratory;
  const alocAssessment = assessmentForm.clinical.aloc;
  const ecgAssessment = assessmentForm.clinical.ecg;

  const setConsciousnessAssessment = (
    value: SetStateAction<ConsciousnessAssessmentForm>,
  ) => setClinicalAssessmentValue('consciousness', value);
  const setClinicalHistory = (
    value: SetStateAction<ClinicalHistoryForm>,
  ) => setClinicalAssessmentValue('history', value);
  const setPainAssessment = (
    value: SetStateAction<PainAssessmentForm>,
  ) => setClinicalAssessmentValue('pain', value);
  const setPrimaryAssessment = (
    value: SetStateAction<PrimaryAssessmentForm>,
  ) => setClinicalAssessmentValue('primary', value);
  const setGcsAssessment = (
    value: SetStateAction<GcsAssessmentForm>,
  ) => setClinicalAssessmentValue('gcs', value);
  const setGfastAssessment = (
    value: SetStateAction<GfastAssessmentForm>,
  ) => setClinicalAssessmentValue('gfast', value);
  const setExtremityAssessment = (
    value: SetStateAction<ExtremityAssessmentForm>,
  ) => setClinicalAssessmentValue('extremity', value);
  const setTraumaAssessment = (
    value: SetStateAction<TraumaAssessmentForm>,
  ) => setClinicalAssessmentValue('trauma', value);
  const setReassessment = (
    value: SetStateAction<ReassessmentForm>,
  ) => setClinicalAssessmentValue('reassessment', value);
  const setRevisedTraumaScore = (
    value: SetStateAction<RevisedTraumaScoreForm>,
  ) => setClinicalAssessmentValue('revisedTraumaScore', value);
  const setRespiratoryAssessment = (
    value: SetStateAction<RespiratoryAssessmentForm>,
  ) => setClinicalAssessmentValue('respiratory', value);
  const setAlocAssessment = (
    value: SetStateAction<AlocAssessmentForm>,
  ) => setClinicalAssessmentValue('aloc', value);
  const setEcgAssessment = (
    value: SetStateAction<EcgAssessmentForm>,
  ) => setClinicalAssessmentValue('ecg', value);


  function getTaskProgress(taskId: string) {
    if (taskId === 'primary-assessment') {
      const primarySurveyFields = [
        primaryAssessment.generalImpression,
        primaryAssessment.airway,
        primaryAssessment.breathing,
        primaryAssessment.circulation,
        primaryAssessment.disability,
        primaryAssessment.exposure,
      ];

      return {
        completed: primarySurveyFields.filter(Boolean).length,
        total: primarySurveyFields.length,
      };
    }

    if (taskId === 'consciousness-assessment') {
      const completed = Object.values(consciousnessAssessment).filter(Boolean).length;
      return { completed, total: Object.keys(consciousnessAssessment).length };
    }

    if (taskId === 'history-taking') {
      return {
        completed: clinicalHistory.eventsLeadingToIllness ? 1 : 0,
        total: 1,
      };
    }

    if (taskId === 'pain-assessment') {
      const requiredFields = [
        painAssessment.painPresent,
        ...(painAssessment.painPresent === 'Yes'
          ? [
              painAssessment.painScaleType,
              painAssessment.painScaleType === '0-10 Numeric'
                ? painAssessment.numericPainScore
                : painAssessment.facesPainScore,
              painAssessment.onset,
              painAssessment.provocation,
              painAssessment.quality,
              painAssessment.radiation,
              painAssessment.time,
            ]
          : []),
      ];

      return {
        completed: requiredFields.filter(Boolean).length,
        total: requiredFields.length,
      };
    }

    if (taskId === 'neurological-assessment') {
      const completed = Object.values(gcsAssessment).filter(Boolean).length;
      return { completed, total: Object.keys(gcsAssessment).length };
    }

    if (taskId === 'gfast-stroke-assessment') {
      const completed = Object.values(gfastAssessment).filter(Boolean).length;
      return { completed, total: Object.keys(gfastAssessment).length };
    }

    if (taskId === 'extremity-assessment') {
      const selectedExtremities = Object.values(extremityAssessment).filter(
        (extremity) => extremity.selected,
      );
      const completedFields = selectedExtremities.reduce(
        (total, extremity) =>
          total +
          [
            extremity.circulation,
            extremity.motor,
            extremity.sensation,
            extremity.tenderness,
            extremity.pulses,
            extremity.skin,
            extremity.capillaryRefill,
            extremity.notes,
          ].filter(Boolean).length,
        0,
      );

      return {
        completed: selectedExtremities.length + completedFields,
        total: Object.keys(extremityAssessment).length,
      };
    }

    if (taskId === 'respiratory-assessment') {
      const completed = Object.values(respiratoryAssessment).filter(Boolean).length;
      return { completed, total: Object.keys(respiratoryAssessment).length };
    }

    if (taskId === 'aloc-assessment') {
      const completed = Object.values(alocAssessment).filter(Boolean).length;
      return { completed, total: Object.keys(alocAssessment).length };
    }

    if (taskId === 'trauma-assessment') {
      const selectedRegions = Object.values(traumaAssessment.regions).filter(
        (region) => region.selected,
      );
      const completedFindings = selectedRegions.reduce(
        (total, region) =>
          total + Object.values(region.findings).filter(Boolean).length,
        0,
      );
      const completedCms = selectedRegions.reduce(
        (total, region) =>
          total + Object.values(region.cms).filter(Boolean).length,
        0,
      );

      return {
        completed: selectedRegions.length + completedFindings + completedCms,
        total: Object.keys(traumaAssessment.regions).length,
      };
    }

    if (taskId === 'revised-trauma-score') {
      const gcsScore = calculateGcsScore(primaryAssessment);
      const requiredFields = [
        gcsScore ? String(gcsScore) : '',
        revisedTraumaScore.respiratoryRate,
        revisedTraumaScore.systolicBloodPressure,
      ];

      return {
        completed: requiredFields.filter(Boolean).length,
        total: requiredFields.length,
      };
    }

    if (taskId === 'revised-trauma-score') {
      const gcsScore = calculateGcsScore(primaryAssessment);
      const requiredFields = [
        gcsScore ? String(gcsScore) : '',
        revisedTraumaScore.respiratoryRate,
        revisedTraumaScore.systolicBloodPressure,
      ];

      return {
        completed: requiredFields.filter(Boolean).length,
        total: requiredFields.length,
      };
    }

    if (taskId === 'reassessment') {
      const completed = Object.values(reassessment).filter(Boolean).length;
      return { completed, total: Object.keys(reassessment).length };
    }

    if (taskId === 'ecg-assessment') {
      return {
        completed:
          ecgAssessment.notIndicated ||
          ecgAssessment.fourLeadInterpretation ||
          ecgAssessment.twelveLeadInterpretation
            ? 1
            : 0,
        total: 1,
      };
    }

    return { completed: 0, total: 1 };
  }

  function updateConsciousnessAssessment(
    field: keyof ConsciousnessAssessmentForm,
    fieldValue: string,
  ) {
    setConsciousnessAssessment((current) => ({
      ...current,
      [field]: fieldValue,
    }));
  }

  function updateClinicalHistory(
    field: keyof ClinicalHistoryForm,
    fieldValue: string,
  ) {
    setClinicalHistory((current) => ({
      ...current,
      [field]: fieldValue,
    }));

    if (field === 'eventsLeadingToIllness') {
      setPainAssessment((current) => ({
        ...current,
        onset: current.onset || fieldValue,
      }));
    }
  }

  function updatePainAssessment(
    field: keyof PainAssessmentForm,
    fieldValue: string,
  ) {
    setPainAssessment((current) => ({
      ...current,
      [field]: fieldValue,
    }));
  }

  function updatePrimaryAssessment(
    field: keyof PrimaryAssessmentForm,
    fieldValue: string,
  ) {
    setPrimaryAssessment((current) => ({
      ...current,
      [field]: fieldValue,
    }));
  }

  function markPrimarySurveyUnremarkable() {
    setPrimaryAssessment((current) => ({
      ...current,
      generalImpression: 'Stable',
      airway: 'Patent',
      breathing: 'Normal',
      circulation: 'Adequate',
      disability: 'No Deficit Noted',
      exposure: 'No Major Findings',
    }));
  }

  function updateGcsAssessment(
    field: keyof GcsAssessmentForm,
    fieldValue: string,
  ) {
    setGcsAssessment((current) => ({
      ...current,
      [field]: fieldValue,
    }));
  }

  function updateGfastAssessment(
    field: keyof GfastAssessmentForm,
    fieldValue: string,
  ) {
    setGfastAssessment((current) => ({
      ...current,
      [field]: fieldValue,
    }));
  }

  function toggleExtremityAssessment(
    extremity: ExtremityKey,
    selected: boolean,
  ) {
    setExtremityAssessment((current) => ({
      ...current,
      [extremity]: {
        ...current[extremity],
        selected,
      },
    }));
  }

  function updateExtremityAssessment(
    extremity: ExtremityKey,
    field: keyof ExtremityCmsTpAssessment,
    fieldValue: string,
  ) {
    setExtremityAssessment((current) => ({
      ...current,
      [extremity]: {
        ...current[extremity],
        [field]: fieldValue,
      },
    }));
  }

  function updateTraumaRegion(field: TraumaRegionKey, fieldValue: boolean) {
    setTraumaAssessment((current) => ({
      ...current,
      regions: {
        ...current.regions,
        [field]: {
          ...current.regions[field],
          selected: fieldValue,
        },
      },
    }));
  }

  function updateTraumaFinding(
    region: TraumaRegionKey,
    finding: TraumaFindingKey,
    fieldValue: boolean,
  ) {
    setTraumaAssessment((current) => ({
      ...current,
      regions: {
        ...current.regions,
        [region]: {
          ...current.regions[region],
          findings: {
            ...current.regions[region].findings,
            [finding]: fieldValue,
          },
        },
      },
    }));
  }

  function updateTraumaCms(
    region: TraumaRegionKey,
    field: keyof TraumaCmsAssessment,
    fieldValue: string,
  ) {
    setTraumaAssessment((current) => ({
      ...current,
      regions: {
        ...current.regions,
        [region]: {
          ...current.regions[region],
          cms: {
            ...current.regions[region].cms,
            [field]: fieldValue,
          },
        },
      },
    }));
  }

  function updateReassessment(
    field: keyof ReassessmentForm,
    fieldValue: string,
  ) {
    setReassessment((current) => ({
      ...current,
      [field]: fieldValue,
    }));
  }

  function getAssessmentTaskForBodyRegion(region: ApolloBodyRegionKey) {
    if (isAssessmentExtremityRegion(region)) {
      return '';
    }

    if (region === 'chest') {
      return 'respiratory-assessment';
    }

    if (region === 'head' || region === 'face') {
      return suspectedStroke ? 'gfast-stroke-assessment' : 'aloc-assessment';
    }

    if (possibleTrauma) {
      return 'trauma-assessment';
    }

    return 'primary-assessment';
  }

  function getBodyRegionAssessmentStatus(
    region: ApolloBodyRegionKey,
  ): ApolloBodyRegionStatus | undefined {
    const selected = selectedAssessmentRegions[region];

    const subregionFindings =
      assessmentForm.bodyMap.subregionFindings[region];

    const regionStatus =
      getBodyRegionAssessmentStatusFromSubregions(
        subregionFindings,
      );

    if (regionStatus === 'unremarkable') {
      return {
        selected: true,
        assessmentState: 'unremarkable',
        findingCount: 0,
        note: 'All subregions unremarkable',
      };
    }

    if (regionStatus === 'abnormal') {
      const abnormalFindings = Object.entries(
        subregionFindings,
      ).flatMap(([subregionId, finding]) => {
        const subregionLabel =
          apolloBodyRegionDetails[region].find(
            (subregion) => subregion.id === subregionId,
          )?.label ?? subregionId;

        return dcapBtlsFindings
          .filter(
            (dcapFinding) =>
              finding.dcapBtls[dcapFinding.field],
          )
          .map(
            (dcapFinding) =>
              `${subregionLabel}: ${dcapFinding.label}`,
          );
      });

      return {
        selected: true,
        assessmentState: 'abnormal',
        findingCount: abnormalFindings.length,
        note:
          abnormalFindings.length > 0
            ? abnormalFindings.join(' · ')
            : 'Abnormal findings documented',
        overlays: abnormalFindings.map((label) => ({
          type: 'finding',
          label,
          color: 'red',
        })),
      };
    }

    if (regionStatus === 'complete') {
      return {
        selected: true,
        assessmentState: 'unremarkable',
        findingCount: 0,
        note: 'Assessment complete',
      };
    }

    if (regionStatus === 'in-progress') {
      const addressedSubregions = Object.entries(
        subregionFindings,
      )
        .filter(
          ([, finding]) =>
            getBodySubRegionAssessmentStatus(finding) !==
            'not-assessed',
        )
        .map(([subregionId]) => {
          return (
            apolloBodyRegionDetails[region].find(
              (subregion) => subregion.id === subregionId,
            )?.label ?? subregionId
          );
        });

      return {
        selected: true,
        assessmentState: 'noted',
        findingCount: 0,
        note:
          addressedSubregions.length > 0
            ? `In progress: ${addressedSubregions.join(', ')}`
            : 'Assessment in progress',
      };
    }

    if (selected) {
      return {
        selected: true,
        assessmentState: 'pending',
        findingCount: 0,
        note: 'Assessment pending',
      };
    }

    return undefined;
  }

  const assessmentBodyRegionStatuses =
    (
      Object.keys(selectedAssessmentRegions) as ApolloBodyRegionKey[]
    ).reduce(
      (statuses, region) => {
        const status = getBodyRegionAssessmentStatus(region);

        if (!status) {
          return statuses;
        }

        return {
          ...statuses,
          [region]: status,
        };
      },
      {} as Partial<
        Record<ApolloBodyRegionKey, ApolloBodyRegionStatus>
      >,
    );

  function getAssessmentClinicalStatusPresentation(
    status: AssessmentClinicalStatus,
  ) {
    if (status === 'unremarkable') {
      return {
        label: 'Unremarkable',
        borderClass: 'border-emerald-300',
        backgroundClass: 'bg-emerald-50',
        textClass: 'text-emerald-800',
        dotClass: 'text-emerald-600',
      };
    }

    if (status === 'abnormal') {
      return {
        label: 'Abnormal Findings Documented',
        borderClass: 'border-red-300',
        backgroundClass: 'bg-red-50',
        textClass: 'text-red-800',
        dotClass: 'text-red-600',
      };
    }

    if (status === 'complete') {
      return {
        label: 'Complete',
        borderClass: 'border-emerald-300',
        backgroundClass: 'bg-emerald-50',
        textClass: 'text-emerald-800',
        dotClass: 'text-emerald-600',
      };
    }

    if (status === 'in-progress') {
      return {
        label: 'In Progress',
        borderClass: 'border-amber-300',
        backgroundClass: 'bg-amber-50',
        textClass: 'text-amber-800',
        dotClass: 'text-amber-500',
      };
    }

    return {
      label: 'Not Assessed',
      borderClass: 'border-slate-300',
      backgroundClass: 'bg-white',
      textClass: 'text-slate-600',
      dotClass: 'text-slate-400',
    };
  }

  function toggleBodyRegionDcapBtlsFinding(
    region: ApolloBodyRegionKey,
    finding: DcapBtlsFindingKey,
  ) {
    onAssessmentFormChange((current) => {
      const currentRegion = current.bodyMap.regionFindings[region];

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
            [region]: false,
          },
          regionFindings: {
            ...current.bodyMap.regionFindings,
            [region]: {
              ...currentRegion,
              dcapBtls: {
                ...currentRegion.dcapBtls,
                [finding]: !currentRegion.dcapBtls[finding],
              },
            },
          },
        },
      };
    });
  }

  function updateBodyRegionNotes(
    region: ApolloBodyRegionKey,
    notes: string,
  ) {
    onAssessmentFormChange((current) => ({
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
          [region]: false,
        },
        regionFindings: {
          ...current.bodyMap.regionFindings,
          [region]: {
            ...current.bodyMap.regionFindings[region],
            notes,
          },
        },
      },
    }));
  }

  function toggleBodySubregionDcapBtlsFinding(
    region: ApolloBodyRegionKey,
    subregionId: string,
    finding: DcapBtlsFindingKey,
  ) {
    onAssessmentFormChange((current) => {
      const currentSubregion =
        current.bodyMap.subregionFindings[region][subregionId];

      if (!currentSubregion) {
        return current;
      }

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
            [region]: false,
          },
          subregionFindings: {
            ...current.bodyMap.subregionFindings,
            [region]: {
              ...current.bodyMap.subregionFindings[region],
              [subregionId]: {
                ...currentSubregion,
                unremarkable: false,
                dcapBtls: {
                  ...currentSubregion.dcapBtls,
                  [finding]: !currentSubregion.dcapBtls[finding],
                },
              },
            },
          },
        },
      };
    });
  }

  function updateBodySubregionNotes(
    region: ApolloBodyRegionKey,
    subregionId: string,
    notes: string,
  ) {
    onAssessmentFormChange((current) => {
      const currentSubregion =
        current.bodyMap.subregionFindings[region][subregionId];

      if (!currentSubregion) {
        return current;
      }

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
            [region]: false,
          },
          subregionFindings: {
            ...current.bodyMap.subregionFindings,
            [region]: {
              ...current.bodyMap.subregionFindings[region],
              [subregionId]: {
                ...currentSubregion,
                unremarkable: false,
                notes,
              },
            },
          },
        },
      };
    });
  }

  function updateBodySubregionCmsTp(
    region: ApolloBodyRegionKey,
    subregionId: string,
    field: AssessmentCmsTpField,
    fieldValue: string,
  ) {
    if (!isAssessmentExtremityRegion(region)) {
      return;
    }

    onAssessmentFormChange((current) => {
      const currentSubregion =
        current.bodyMap.subregionFindings[region][subregionId];

      if (!currentSubregion) {
        return current;
      }

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
            [region]: false,
          },
          subregionFindings: {
            ...current.bodyMap.subregionFindings,
            [region]: {
              ...current.bodyMap.subregionFindings[region],
              [subregionId]: {
                ...currentSubregion,
                unremarkable: false,
                cmsTp: {
                  ...currentSubregion.cmsTp,
                  [field]: fieldValue,
                },
              },
            },
          },
        },
      };
    });
  }

  function updateBodyRegionCmsTp(
    region: ApolloBodyRegionKey,
    field: AssessmentCmsTpField,
    fieldValue: string,
  ) {
    if (!isAssessmentExtremityRegion(region)) {
      return;
    }

    onAssessmentFormChange((current) => {
      const currentRegion = current.bodyMap.regionFindings[region];

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
            [region]: false,
          },
          regionFindings: {
            ...current.bodyMap.regionFindings,
            [region]: {
              ...currentRegion,
              cmsTp: {
                ...(currentRegion.cmsTp ?? createEmptyAssessmentCmsTp()),
                [field]: fieldValue,
              },
            },
          },
        },
      };
    });
  }

  function markBodyRegionUnremarkable(region: ApolloBodyRegionKey) {
    onAssessmentFormChange((current) => ({
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
          [region]: {
            dcapBtls: createEmptyDcapBtlsFindings(),
            cmsTp: createEmptyAssessmentCmsTp(),
            notes: '',
          },
        },
      },
    }));
  }

  function openAssessmentForBodyRegion(region: ApolloBodyRegionKey) {
    setSelectedAssessmentRegion(region);
    setExpandedBodySubregionId('');
    setExpandedRegionalAssessmentId('');
  }

  function handleAssessmentBodyRegionClick(region: ApolloBodyRegionKey) {
    setSelectedAssessmentRegions((current) => ({
      ...current,
      [region]: true,
    }));

    openAssessmentForBodyRegion(region);
  }

  function updateRevisedTraumaScore(
    field: keyof RevisedTraumaScoreForm,
    fieldValue: string,
  ) {
    setRevisedTraumaScore((current) => ({
      ...current,
      [field]: fieldValue,
    }));
  }

  function updateRespiratoryAssessment(
    field: keyof RespiratoryAssessmentForm,
    fieldValue: string,
  ) {
    setRespiratoryAssessment((current) => ({
      ...current,
      [field]: fieldValue,
    }));
  }

  function updateAlocAssessment(
    field: keyof AlocAssessmentForm,
    fieldValue: string,
  ) {
    setAlocAssessment((current) => ({
      ...current,
      [field]: fieldValue,
    }));
  }

  function updateEcgAssessment(
    field: keyof EcgAssessmentForm,
    fieldValue: EcgAssessmentForm[keyof EcgAssessmentForm],
  ) {
    setEcgAssessment((current) => ({
      ...current,
      [field]: fieldValue,
      ...(field === 'fourLeadInterpretation' ||
      field === 'twelveLeadInterpretation'
        ? { notIndicated: false }
        : {}),
    }));
  }


  useEffect(() => {
    const taskProgress = suggestedAssessmentTasks
      .filter(
        (task) =>
          task.id !== 'extremity-assessment' &&
          task.id !== 'trauma-assessment',
      )
      .map((task) => {
        const progress = getTaskProgress(task.id);

        return {
          title: task.title,
          completedFields: progress.completed,
          totalFields: progress.total,
        };
      });

    if (providerScope === 'ALS') {
      const ecgProgress = getTaskProgress('ecg-assessment');
      taskProgress.push({
        title: 'ECG Assessment',
        completedFields: ecgProgress.completed,
        totalFields: ecgProgress.total,
      });
    }

    onProgressChange({
      completedFields: taskProgress.reduce(
        (total, task) => total + task.completedFields,
        0,
      ),
      totalFields: taskProgress.reduce(
        (total, task) => total + task.totalFields,
        0,
      ),
      tasks: taskProgress,
    });
  }, [
    suggestedAssessmentTasks,
    primaryAssessment,
    clinicalHistory,
    consciousnessAssessment,
    painAssessment,
    gcsAssessment,
    gfastAssessment,
    respiratoryAssessment,
    alocAssessment,
    traumaAssessment,
    revisedTraumaScore,
    reassessment,
    ecgAssessment,
    providerScope,
    onProgressChange,
  ]);

  function getIntegratedAssessmentPresentation(taskId: string) {
    const progress = getTaskProgress(taskId);

    if (progress.completed >= progress.total) {
      return {
        label: 'Complete',
        badgeClass: 'bg-emerald-100 text-emerald-800',
        progress,
      };
    }

    if (progress.completed > 0) {
      return {
        label: 'In Progress',
        badgeClass: 'bg-amber-100 text-amber-800',
        progress,
      };
    }

    return {
      label: 'Not Started',
      badgeClass: 'bg-slate-100 text-slate-600',
      progress,
    };
  }

  function renderIntegratedRegionalAssessment(
    taskId: string,
    title: string,
    description: string,
  ) {
    const presentation = getIntegratedAssessmentPresentation(taskId);
    const expanded = expandedRegionalAssessmentId === taskId;

    return (
      <div className="overflow-hidden rounded-xl border border-indigo-200 bg-indigo-50">
        <button
          type="button"
          onClick={() =>
            setExpandedRegionalAssessmentId((current) =>
              current === taskId ? '' : taskId,
            )
          }
          className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
        >
          <div>
            <div className="text-sm font-black text-indigo-950">{title}</div>
            <p className="mt-1 text-xs font-semibold text-indigo-800">
              {description}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-xs font-black uppercase ${presentation.badgeClass}`}
            >
              {presentation.label}
              {presentation.progress.total > 1
                ? ` ${presentation.progress.completed}/${presentation.progress.total}`
                : ''}
            </span>
            <span className="text-lg font-black text-indigo-700">
              {expanded ? '−' : '+'}
            </span>
          </div>
        </button>

        {expanded && (
          <div className="border-t border-indigo-200 bg-white p-4">
            {renderTaskContent(taskId, title)}
          </div>
        )}
      </div>
    );
  }

  function renderTaskContent(taskId: string, title: string) {
    if (taskId === 'primary-assessment') {
      return (
        <PrimaryAssessmentCard
          value={primaryAssessment}
          onChange={updatePrimaryAssessment}
          onMarkUnremarkable={markPrimarySurveyUnremarkable}
        />
      );
    }

    if (taskId === 'consciousness-assessment') {
      return (
        <ConsciousnessAssessmentCard
          value={consciousnessAssessment}
          onChange={updateConsciousnessAssessment}
        />
      );
    }

    if (taskId === 'history-taking') {
      return (
        <ClinicalHistoryCard
          value={clinicalHistory}
          patientForm={patientForm}
          onChange={updateClinicalHistory}
          onPatientChange={onPatientChange}
        />
      );
    }

    if (taskId === 'pain-assessment') {
      return (
        <PainAssessmentCard
          value={painAssessment}
          onChange={updatePainAssessment}
        />
      );
    }

    if (taskId === 'neurological-assessment') {
      return (
        <GcsAssessmentCard value={gcsAssessment} onChange={updateGcsAssessment} />
      );
    }

    if (taskId === 'gfast-stroke-assessment') {
      return (
        <GfastAssessmentCard
          value={gfastAssessment}
          onChange={updateGfastAssessment}
        />
      );
    }

    if (taskId === 'extremity-assessment') {
      return (
        <ExtremityAssessmentCard
          value={extremityAssessment}
          initiallyExpanded={
            selectedAssessmentRegion === 'rightArm' ||
            selectedAssessmentRegion === 'leftArm' ||
            selectedAssessmentRegion === 'rightLeg' ||
            selectedAssessmentRegion === 'leftLeg'
              ? selectedAssessmentRegion
              : ''
          }
          onExtremityToggle={toggleExtremityAssessment}
          onChange={updateExtremityAssessment}
        />
      );
    }

    if (taskId === 'trauma-assessment') {
      return (
        <TraumaAssessmentCard
          value={traumaAssessment}
          onRegionChange={updateTraumaRegion}
          onFindingChange={updateTraumaFinding}
          onCmsChange={updateTraumaCms}
        />
      );
    }

    if (taskId === 'revised-trauma-score') {
      return (
        <RevisedTraumaScoreCard
          gcs={calculateGcsScore(primaryAssessment)}
          value={revisedTraumaScore}
          onChange={updateRevisedTraumaScore}
        />
      );
    }

    if (taskId === 'respiratory-assessment') {
      return (
        <RespiratoryAssessmentCard
          value={respiratoryAssessment}
          onChange={updateRespiratoryAssessment}
        />
      );
    }

    if (taskId === 'aloc-assessment') {
      return (
        <AlocAssessmentCard
          value={alocAssessment}
          primaryAssessment={primaryAssessment}
          onChange={updateAlocAssessment}
        />
      );
    }

    if (taskId === 'revised-trauma-score') {
      return (
        <RevisedTraumaScoreCard
          gcs={calculateGcsScore(primaryAssessment)}
          value={revisedTraumaScore}
          onChange={updateRevisedTraumaScore}
        />
      );
    }

    if (taskId === 'reassessment') {
      return (
        <ReassessmentCard
          value={reassessment}
          onChange={updateReassessment}
        />
      );
    }

    if (taskId === 'ecg-assessment') {
      return (
        <EcgAssessmentCard
          value={ecgAssessment}
          onChange={updateEcgAssessment}
        />
      );
    }

    return (
      <div className="rounded-lg border-2 border-dashed border-slate-300 p-10 text-center text-slate-500">
        {title} workflow coming next.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3 rounded-lg bg-blue-100 px-4 py-3 text-sm font-bold uppercase tracking-wide text-blue-900">
          Initial Assessment and History
        </div>

        <div className="space-y-4">
          {[
            {
              id: 'primary-assessment',
              title: 'Primary Assessment',
            },
            {
              id: 'history-taking',
              title: 'History Assessment / SAMPLE',
            },
          ].map((task) => {
            const progress = getTaskProgress(task.id);

            return (
              <PCRCard
                key={task.id}
                title={task.title}
                completedFields={progress.completed}
                totalFields={progress.total}
                expanded={expandedTaskId === task.id}
                onToggle={() =>
                  setExpandedTaskId(
                    expandedTaskId === task.id ? '' : task.id,
                  )
                }
              >
                {renderTaskContent(task.id, task.title)}
              </PCRCard>
            );
          })}
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <div className="mb-4">
          <h3 className="text-lg font-black text-blue-950">
            Physical Assessment
          </h3>
          <p className="mt-1 text-sm font-semibold text-blue-900">
            If the exam is normal, complete it in one tap. Otherwise, tap the
            affected region and document only what you find.
          </p>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <div>
            <div className="text-sm font-black uppercase tracking-wide text-emerald-950">
              Complete Normal Assessment
            </div>

            <p className="mt-1 text-xs font-semibold text-emerald-800">
              Mark every body region and subregion as unremarkable.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              const confirmed = window.confirm(
                'This will clear all documented Body Map findings and mark every body region and subregion as unremarkable. Continue?',
              );

              if (!confirmed) {
                return;
              }

              onAssessmentFormChange((current) =>
                markEntireAssessmentBodyUnremarkable(current),
              );
            }}
            className="rounded-lg border border-emerald-500 bg-emerald-600 px-4 py-2 text-xs font-black uppercase tracking-wide text-white transition hover:bg-emerald-700"
          >
            Mark Physical Assessment Unremarkable
          </button>
        </div>

        <ApolloBodyMap
          mode="assessment"
          patientSex={patientForm.gender}
          selectedRegions={selectedAssessmentRegions}
          focusedRegion={selectedAssessmentRegion}
          regionStatuses={assessmentBodyRegionStatuses}
          onRegionClick={handleAssessmentBodyRegionClick}
        />

        {selectedAssessmentRegion &&
          selectedAssessmentRegions[selectedAssessmentRegion] && (
          <div className="mt-4 rounded-xl border border-blue-200 bg-white p-4">
            <div className="mb-4 space-y-3">
              {[selectedAssessmentRegion]
                .map((region) => {
                  const regionSubregions =
                    assessmentForm.bodyMap.subregionFindings[region];

                  const regionStatus =
                    getBodyRegionAssessmentStatusFromSubregions(
                      regionSubregions,
                    );

                  const regionPresentation =
                    getAssessmentClinicalStatusPresentation(
                      regionStatus,
                    );

                  const regionExpanded = true;

                  return (
                    <div
                      key={region}
                      className={`overflow-hidden rounded-xl border ${regionPresentation.borderClass} ${regionPresentation.backgroundClass}`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedAssessmentRegion(region)}
                        className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left"
                      >
                        <div>
                          <div className="text-base font-black text-slate-900">
                            {getClinicalDisplayName(region)} Assessment
                          </div>

                          <div
                            className={`mt-1 text-xs font-black uppercase tracking-wide ${regionPresentation.textClass}`}
                          >
                            <span
                              className={regionPresentation.dotClass}
                            >
                              ●
                            </span>{' '}
                            {regionPresentation.label}
                          </div>
                        </div>

                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-black uppercase text-blue-800">
                          Focused Region
                        </span>
                      </button>

                      {regionExpanded && (
                        <div className="border-t border-slate-200 bg-white p-4">
                          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                            <div>
                              <div className="text-sm font-black uppercase tracking-wide text-slate-700">
                                {getClinicalDisplayName(region)} Subregions
                              </div>

                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                Address each anatomical subregion individually.
                              </p>
                            </div>

                            <div className="flex flex-wrap gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  onAssessmentFormChange((current) =>
                                    markAssessmentRegionUnremarkable(
                                      current,
                                      region,
                                    ),
                                  );
                                  setExpandedBodySubregionId('');
                                }}
                                className="rounded-lg border border-emerald-500 bg-emerald-600 px-3 py-2 text-xs font-black uppercase tracking-wide text-white hover:bg-emerald-700"
                              >
                                Mark Region Unremarkable
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedAssessmentRegions((current) => ({
                                    ...current,
                                    [region]: false,
                                  }));
                                  setSelectedAssessmentRegion('');
                                  setExpandedBodySubregionId('');
                                  setExpandedRegionalAssessmentId('');
                                }}
                                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black uppercase tracking-wide text-slate-700 hover:bg-slate-50"
                              >
                                Remove Region
                              </button>
                            </div>
                          </div>

                          <div className="mb-5 space-y-3">
                            <div>
                              <div className="text-sm font-black uppercase tracking-wide text-slate-700">
                                Region-Specific Assessments
                              </div>
                              <p className="mt-1 text-xs font-semibold text-slate-500">
                                Open only the clinical assessment needed for this
                                focused region.
                              </p>
                            </div>

                            {renderIntegratedRegionalAssessment(
                              'pain-assessment',
                              'Pain Assessment / OPQRST',
                              `Document pain associated with the ${getClinicalDisplayName(region).toLowerCase()} region.`,
                            )}

                            {region === 'head' &&
                              renderIntegratedRegionalAssessment(
                                'gfast-stroke-assessment',
                                'Stroke Assessment / GFAST',
                                'Complete the neurological stroke screen from the focused Head assessment.',
                              )}

                            {region === 'chest' &&
                              renderIntegratedRegionalAssessment(
                                'respiratory-assessment',
                                'Respiratory Assessment / PASTMED',
                                'Document respiratory findings and focused respiratory history.',
                              )}
                          </div>

                          <div className="space-y-3">
                            {apolloBodyRegionDetails[region].map(
                              (subregion) => {
                                const finding =
                                  regionSubregions[subregion.id];

                                const subregionStatus =
                                  getBodySubRegionAssessmentStatus(
                                    finding,
                                  );

                                const subregionPresentation =
                                  getAssessmentClinicalStatusPresentation(
                                    subregionStatus,
                                  );

                                const subregionExpanded =
                                  expandedBodySubregionId ===
                                  `${region}:${subregion.id}`;

                                return (
                                  <div
                                    key={subregion.id}
                                    className={`overflow-hidden rounded-xl border ${subregionPresentation.borderClass} ${subregionPresentation.backgroundClass}`}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setSelectedAssessmentRegion(
                                          region,
                                        );
                                        setExpandedBodySubregionId(
                                          (current) =>
                                            current ===
                                            `${region}:${subregion.id}`
                                              ? ''
                                              : `${region}:${subregion.id}`,
                                        );
                                      }}
                                      className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left"
                                    >
                                      <div>
                                        <div className="text-sm font-black text-slate-900">
                                          {subregion.label}
                                        </div>

                                        <div
                                          className={`mt-1 text-xs font-black uppercase tracking-wide ${subregionPresentation.textClass}`}
                                        >
                                          <span
                                            className={
                                              subregionPresentation.dotClass
                                            }
                                          >
                                            ●
                                          </span>{' '}
                                          {subregionPresentation.label}
                                        </div>
                                      </div>

                                      <span className="text-lg font-black text-slate-500">
                                        {subregionExpanded ? '−' : '+'}
                                      </span>
                                    </button>

                                    {subregionExpanded && (
                                      <div className="border-t border-slate-200 bg-white p-4">
                                        <div className="text-sm font-black uppercase tracking-wide text-slate-700">
                                          DCAP-BTLS Findings
                                        </div>

                                        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                                          {dcapBtlsFindings.map(
                                            (dcapFinding) => {
                                              const selected =
                                                finding.dcapBtls[
                                                  dcapFinding.field
                                                ];

                                              return (
                                                <button
                                                  key={
                                                    dcapFinding.field
                                                  }
                                                  type="button"
                                                  onClick={() =>
                                                    toggleBodySubregionDcapBtlsFinding(
                                                      region,
                                                      subregion.id,
                                                      dcapFinding.field,
                                                    )
                                                  }
                                                  className={`rounded-lg border px-3 py-3 text-left text-sm font-bold transition ${
                                                    selected
                                                      ? 'border-red-300 bg-red-50 text-red-900'
                                                      : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                                                  }`}
                                                >
                                                  {selected ? '✓ ' : ''}
                                                  {dcapFinding.label}
                                                </button>
                                              );
                                            },
                                          )}
                                        </div>

                                        {isAssessmentExtremityRegion(region) && (
                                          <div className="mt-5 border-t border-slate-200 pt-5">
                                            <div className="text-sm font-black uppercase tracking-wide text-slate-700">
                                              CMS-TP
                                            </div>

                                            <p className="mt-1 text-xs font-semibold text-slate-500">
                                              Document circulation, motor function,
                                              sensation, tenderness, pulses, skin,
                                              and capillary refill.
                                            </p>

                                            <div className="mt-4 grid gap-4 md:grid-cols-2">
                                              {cmsTpFields.map((cmsField) => (
                                                <label
                                                  key={cmsField.field}
                                                  className="block"
                                                >
                                                  <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                                    {cmsField.label}
                                                  </span>

                                                  <select
                                                    value={
                                                      finding.cmsTp[
                                                        cmsField.field
                                                      ]
                                                    }
                                                    onChange={(event) =>
                                                      updateBodySubregionCmsTp(
                                                        region,
                                                        subregion.id,
                                                        cmsField.field,
                                                        event.target.value,
                                                      )
                                                    }
                                                    className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                                                  >
                                                    <option value="" />

                                                    {cmsField.options.map(
                                                      (option) => (
                                                        <option
                                                          key={option}
                                                          value={option}
                                                        >
                                                          {option}
                                                        </option>
                                                      ),
                                                    )}
                                                  </select>
                                                </label>
                                              ))}
                                            </div>

                                            <label className="mt-4 block">
                                              <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                                CMS-TP Notes
                                              </span>

                                              <textarea
                                                value={finding.cmsTp.notes}
                                                onChange={(event) =>
                                                  updateBodySubregionCmsTp(
                                                    region,
                                                    subregion.id,
                                                    'notes',
                                                    event.target.value,
                                                  )
                                                }
                                                rows={3}
                                                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                                              />
                                            </label>
                                          </div>
                                        )}

                                        <label className="mt-4 block">
                                          <span className="text-xs font-black uppercase tracking-wide text-slate-500">
                                            Assessment Notes
                                          </span>

                                          <textarea
                                            value={finding.notes}
                                            onChange={(event) =>
                                              updateBodySubregionNotes(
                                                region,
                                                subregion.id,
                                                event.target.value,
                                              )
                                            }
                                            rows={3}
                                            className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-blue-500"
                                          />
                                        </label>

                                        <button
                                          type="button"
                                          onClick={() =>
                                            onAssessmentFormChange(
                                              (current) =>
                                                markAssessmentSubregionUnremarkable(
                                                  current,
                                                  region,
                                                  subregion.id,
                                                ),
                                            )
                                          }
                                          className="mt-4 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-black uppercase text-emerald-800 hover:bg-emerald-100"
                                        >
                                          {subregionStatus ===
                                          'unremarkable'
                                            ? '✓ Unremarkable'
                                            : 'Mark Unremarkable'}
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                );
                              },
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="mb-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-bold uppercase tracking-wide text-emerald-800">
          Suggested for This Patient
        </div>

        <div className="space-y-4">
          {providerScope === 'ALS' && (
            <PCRCard
              title="ECG Assessment"
              completedFields={getTaskProgress('ecg-assessment').completed}
              totalFields={getTaskProgress('ecg-assessment').total}
              expanded={expandedTaskId === 'ecg-assessment'}
              onToggle={() =>
                setExpandedTaskId(
                  expandedTaskId === 'ecg-assessment' ? '' : 'ecg-assessment',
                )
              }
            >
              {renderTaskContent('ecg-assessment', 'ECG Assessment')}
            </PCRCard>
          )}
          {suggestedTasks.map((task) => {
            const progress = getTaskProgress(task.id);

            return (
              <PCRCard
                key={task.id}
                title={task.title}
                completedFields={progress.completed}
                totalFields={progress.total}
                expanded={expandedTaskId === task.id}
                onToggle={() =>
                  setExpandedTaskId(expandedTaskId === task.id ? '' : task.id)
                }
              >
                {renderTaskContent(task.id, task.title)}
              </PCRCard>
            );
          })}
        </div>
      </div>

      <div>
        <div className="mb-3 rounded-lg bg-slate-200 px-4 py-3 text-sm font-bold uppercase tracking-wide text-slate-700">
          Additional Assessments
        </div>

        <div className="space-y-4">
          {additionalTasks.map((task) => {
            const progress = getTaskProgress(task.id);

            return (
              <PCRCard
                key={task.id}
                title={task.title}
                completedFields={progress.completed}
                totalFields={progress.total}
                expanded={expandedTaskId === task.id}
                onToggle={() =>
                  setExpandedTaskId(expandedTaskId === task.id ? '' : task.id)
                }
              >
                {renderTaskContent(task.id, task.title)}
              </PCRCard>
            );
          })}
        </div>
      </div>
    </div>
  );
}
