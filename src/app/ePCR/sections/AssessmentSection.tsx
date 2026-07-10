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
import type { ApolloBodyRegionKey } from '../clinical/components/body-map/bodyMapTypes';
import {
  determineAssessmentMode,
  getAdditionalAssessmentTasksForContext,
  getAssessmentTasksForContext,
} from '../clinical/engine/assessment';
import ClinicalHistoryCard, {
  type ClinicalHistoryForm,
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

type AssessmentSectionProps = {
  assessmentForm: AssessmentForm;
  onAssessmentFormChange: Dispatch<SetStateAction<AssessmentForm>>;
  patientForm: PatientForm;
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

  const mode = determineAssessmentMode(context);

  const suggestedTasks = useMemo(
    () => getAssessmentTasksForContext(context),
    [
      clinicalCategory,
      suspectedStroke,
      possibleTrauma,
      behavioralHold,
      cardiacArrest,
    ],
  );

  const additionalTasks = useMemo(
    () => getAdditionalAssessmentTasksForContext(context),
    [
      clinicalCategory,
      suspectedStroke,
      possibleTrauma,
      behavioralHold,
      cardiacArrest,
    ],
  );
  const [expandedTaskId, setExpandedTaskId] = useState('');
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

  const [consciousnessAssessment, setConsciousnessAssessment] =
    useState<ConsciousnessAssessmentForm>({
      avpu: '',
      orientation: '',
    });

  const [clinicalHistory, setClinicalHistory] = useState<ClinicalHistoryForm>({
    eventsLeadingToIllness: '',
    additionalHistoryNotes: '',
  });

  const [painAssessment, setPainAssessment] = useState<PainAssessmentForm>({
    painPresent: '',
    painScaleType: '',
    numericPainScore: '',
    facesPainScore: '',
    onset: '',
    provocation: '',
    quality: '',
    radiation: '',
    time: '',
  });

  const [primaryAssessment, setPrimaryAssessment] =
    useState<PrimaryAssessmentForm>({
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
    });

  const [gcsAssessment, setGcsAssessment] = useState<GcsAssessmentForm>({
    eyes: '',
    verbal: '',
    motor: '',
  });

  const [gfastAssessment, setGfastAssessment] = useState<GfastAssessmentForm>({
    gaze: '',
    face: '',
    arms: '',
    speech: '',
    time: '',
    bloodGlucose: '',
  });

  const emptyExtremityAssessment: ExtremityCmsTpAssessment = {
    selected: false,
    circulation: '',
    motor: '',
    sensation: '',
    tenderness: '',
    pulses: '',
    skin: '',
    capillaryRefill: '',
    notes: '',
  };

  const [extremityAssessment, setExtremityAssessment] =
    useState<ExtremityAssessmentForm>({
      rightArm: { ...emptyExtremityAssessment },
      leftArm: { ...emptyExtremityAssessment },
      rightLeg: { ...emptyExtremityAssessment },
      leftLeg: { ...emptyExtremityAssessment },
    });

  const emptyTraumaFindings = {
    deformity: false,
    contusions: false,
    abrasions: false,
    puncturesPenetrations: false,
    burns: false,
    tenderness: false,
    lacerations: false,
    swelling: false,
  };

  const emptyTraumaCms: TraumaCmsAssessment = {
    circulation: '',
    motor: '',
    sensation: '',
  };

  const [traumaAssessment, setTraumaAssessment] =
    useState<TraumaAssessmentForm>({
      regions: {
        head: {
          selected: false,
          findings: { ...emptyTraumaFindings },
          cms: { ...emptyTraumaCms },
        },
        face: {
          selected: false,
          findings: { ...emptyTraumaFindings },
          cms: { ...emptyTraumaCms },
        },
        neck: {
          selected: false,
          findings: { ...emptyTraumaFindings },
          cms: { ...emptyTraumaCms },
        },
        chest: {
          selected: false,
          findings: { ...emptyTraumaFindings },
          cms: { ...emptyTraumaCms },
        },
        abdomen: {
          selected: false,
          findings: { ...emptyTraumaFindings },
          cms: { ...emptyTraumaCms },
        },
        pelvis: {
          selected: false,
          findings: { ...emptyTraumaFindings },
          cms: { ...emptyTraumaCms },
        },
        back: {
          selected: false,
          findings: { ...emptyTraumaFindings },
          cms: { ...emptyTraumaCms },
        },
        rightArm: {
          selected: false,
          findings: { ...emptyTraumaFindings },
          cms: { ...emptyTraumaCms },
        },
        leftArm: {
          selected: false,
          findings: { ...emptyTraumaFindings },
          cms: { ...emptyTraumaCms },
        },
        rightLeg: {
          selected: false,
          findings: { ...emptyTraumaFindings },
          cms: { ...emptyTraumaCms },
        },
        leftLeg: {
          selected: false,
          findings: { ...emptyTraumaFindings },
          cms: { ...emptyTraumaCms },
        },
      },
    });

  const [reassessment, setReassessment] = useState<ReassessmentForm>({
    reason: '',
    patientCondition: '',
    mentalStatus: '',
    airwayBreathing: '',
    circulation: '',
    painChange: '',
    interventionsResponse: '',
    transportPriority: '',
    notes: '',
  });

  const [revisedTraumaScore, setRevisedTraumaScore] =
    useState<RevisedTraumaScoreForm>({
      respiratoryRate: '',
      systolicBloodPressure: '',
      notes: '',
    });

  const [respiratoryAssessment, setRespiratoryAssessment] =
    useState<RespiratoryAssessmentForm>({
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
    });

  const [alocAssessment, setAlocAssessment] = useState<AlocAssessmentForm>({
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
  });


  function getTaskProgress(taskId: string) {
    if (taskId === 'primary-assessment') {
      const completed = Object.values(primaryAssessment).filter(Boolean).length;
      return { completed, total: Object.keys(primaryAssessment).length };
    }

    if (taskId === 'consciousness-assessment') {
      const completed = Object.values(consciousnessAssessment).filter(Boolean).length;
      return { completed, total: Object.keys(consciousnessAssessment).length };
    }

    if (taskId === 'history-taking') {
      const completed = Object.values(clinicalHistory).filter(Boolean).length;
      return { completed, total: Object.keys(clinicalHistory).length };
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
    if (
      region === 'rightArm' ||
      region === 'leftArm' ||
      region === 'rightLeg' ||
      region === 'leftLeg'
    ) {
      return 'extremity-assessment';
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

  function getBodyRegionQueueStatus(region: ApolloBodyRegionKey) {
    if (bodyRegionUnremarkable[region]) {
      return {
        label: 'Unremarkable',
        dotClass: 'text-emerald-600',
        chipClass: 'border-emerald-200 bg-emerald-50 text-emerald-900',
        statusClass: 'text-emerald-700',
      };
    }

    if (
      region === 'rightArm' ||
      region === 'leftArm' ||
      region === 'rightLeg' ||
      region === 'leftLeg'
    ) {
      const extremity = extremityAssessment[region];
      const completedFields = [
        extremity.circulation,
        extremity.motor,
        extremity.sensation,
        extremity.tenderness,
        extremity.pulses,
        extremity.skin,
        extremity.capillaryRefill,
        extremity.notes,
      ].filter(Boolean).length;

      if (completedFields >= 7) {
        return {
          label: 'Complete',
          dotClass: 'text-emerald-600',
          chipClass: 'border-emerald-200 bg-emerald-50 text-emerald-900',
          statusClass: 'text-emerald-700',
        };
      }

      if (completedFields > 0) {
        return {
          label: 'In Progress',
          dotClass: 'text-amber-500',
          chipClass: 'border-amber-200 bg-amber-50 text-amber-900',
          statusClass: 'text-amber-700',
        };
      }
    }

    return {
      label: 'Pending',
      dotClass: 'text-blue-600',
      chipClass: 'border-blue-200 bg-blue-50 text-blue-900',
      statusClass: 'text-slate-400',
    };
  }

  function markBodyRegionUnremarkable(region: ApolloBodyRegionKey) {
    setSelectedAssessmentRegion(region);
    setSelectedAssessmentRegions((current) => ({
      ...current,
      [region]: true,
    }));
    setBodyRegionUnremarkable((current) => ({
      ...current,
      [region]: true,
    }));
  }

  function openAssessmentForBodyRegion(region: ApolloBodyRegionKey) {
    setSelectedAssessmentRegion(region);

    const targetTaskId = getAssessmentTaskForBodyRegion(region);
    setExpandedTaskId(targetTaskId);

    if (
      targetTaskId === 'extremity-assessment' &&
      (region === 'rightArm' ||
        region === 'leftArm' ||
        region === 'rightLeg' ||
        region === 'leftLeg')
    ) {
      toggleExtremityAssessment(region, true);
    }
  }

  function handleAssessmentBodyRegionClick(region: ApolloBodyRegionKey) {
    setSelectedAssessmentRegions((current) => ({
      ...current,
      [region]: !current[region],
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


  useEffect(() => {
    const taskProgress = suggestedTasks.map((task) => {
      const progress = getTaskProgress(task.id);

      return {
        title: task.title,
        completedFields: progress.completed,
        totalFields: progress.total,
      };
    });

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
    suggestedTasks,
    primaryAssessment,
    clinicalHistory,
    painAssessment,
    gcsAssessment,
    gfastAssessment,
    traumaAssessment,
    revisedTraumaScore,
    reassessment,
    onProgressChange,
  ]);

  function renderTaskContent(taskId: string, title: string) {
    if (taskId === 'primary-assessment') {
      return (
        <PrimaryAssessmentCard
          value={primaryAssessment}
          onChange={updatePrimaryAssessment}
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

    return (
      <div className="rounded-lg border-2 border-dashed border-slate-300 p-10 text-center text-slate-500">
        {title} workflow coming next.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-slate-50 p-5">
        <h3 className="text-xl font-bold text-slate-900">
          Apollo Clinical Intelligence
        </h3>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div>
            <div className="text-xs font-bold uppercase text-slate-500">
              Assessment Mode
            </div>
            <div className="text-lg font-semibold capitalize text-slate-900">
              {mode.replace('-', ' ')}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase text-slate-500">
              Clinical Category
            </div>
            <div className="text-lg font-semibold text-slate-900">
              {clinicalCategory || 'Not Yet Selected'}
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase text-slate-500">
              Documenting Provider Scope
            </div>
            <div className="text-lg font-semibold text-slate-900">
              {providerScope}
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-blue-200 bg-blue-50 p-5">
        <div className="mb-4">
          <h3 className="text-lg font-black text-blue-950">
            Body Map Assessment Navigator
          </h3>
          <p className="mt-1 text-sm font-semibold text-blue-900">
            Select an anatomical region to open the most relevant assessment workflow.
            Apollo routes the clinician to the assessment area without making clinical decisions.
          </p>
        </div>

        <ApolloBodyMap
          mode="assessment"
          selectedRegions={selectedAssessmentRegions}
          onRegionClick={handleAssessmentBodyRegionClick}
        />

        <div className="mt-4 rounded-xl border border-blue-200 bg-white p-4">
          <div className="mb-2 text-xs font-black uppercase tracking-wide text-blue-800">
            Assessment Queue
          </div>

          <div className="mb-3 text-sm text-slate-600">
            Regions selected on the Body Map become your active assessment queue.
            Complete each assessment as you perform your head-to-toe exam.
          </div>

          <div className="mb-3 rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-sm font-bold text-blue-950">
            Current Focus:{' '}
            {selectedAssessmentRegion
              ? getClinicalDisplayName(selectedAssessmentRegion)
              : 'None'}
          </div>

          {selectedAssessmentRegion && (
            <div className="mb-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
              <div className="mb-2 text-xs font-black uppercase tracking-wide text-slate-500">
                Region Detail
              </div>

              <div className="flex flex-wrap gap-2">
                {apolloBodyRegionDetails[selectedAssessmentRegion].map((subRegion) => (
                  <span
                    key={subRegion.id}
                    className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-700 ring-1 ring-slate-200"
                  >
                    {subRegion.label}
                  </span>
                ))}
              </div>

              <button
                type="button"
                onClick={() => markBodyRegionUnremarkable(selectedAssessmentRegion)}
                className="mt-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-black uppercase text-emerald-800 hover:bg-emerald-100"
              >
                Mark Region Unremarkable
              </button>
            </div>
          )}

          {Object.entries(selectedAssessmentRegions).filter(([, selected]) => selected)
            .length > 0 ? (
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                {Object.entries(selectedAssessmentRegions)
                  .filter(([, selected]) => selected)
                  .map(([region]) => {
                    const typedRegion = region as ApolloBodyRegionKey;
                    const queueStatus = getBodyRegionQueueStatus(typedRegion);

                    return (
                      <button
                        key={region}
                        type="button"
                        onClick={() => openAssessmentForBodyRegion(typedRegion)}
                        className={`flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-black uppercase hover:opacity-90 ${queueStatus.chipClass}`}
                      >
                        <span className={queueStatus.dotClass}>●</span>

                        {getClinicalDisplayName(typedRegion)}

                        <span className={queueStatus.statusClass}>
                          {queueStatus.label}
                        </span>
                      </button>
                    );
                  })}
              </div>

              <button
                type="button"
                onClick={() => {
                  setBodyRegionUnremarkable((current) => {
                    const updated = { ...current };

                    Object.entries(selectedAssessmentRegions).forEach(
                      ([region, selected]) => {
                        if (selected) {
                          updated[region as ApolloBodyRegionKey] = true;
                        }
                      },
                    );

                    return updated;
                  });
                }}
                className="mr-2 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-xs font-black uppercase text-emerald-800 hover:bg-emerald-100"
              >
                Mark Selected Unremarkable
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedAssessmentRegion('');
                  setSelectedAssessmentRegions({
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
                  });
                  setBodyRegionUnremarkable({
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
                  });
                }}
                className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-black uppercase text-slate-700 hover:bg-slate-50"
              >
                Clear Selected Regions
              </button>
            </div>
          ) : (
            <div className="text-sm font-semibold text-slate-500">
              No body regions selected yet.
            </div>
          )}
        </div>
      </div>

      <div>
        <div className="mb-3 rounded-lg bg-emerald-50 px-4 py-3 text-sm font-bold uppercase tracking-wide text-emerald-800">
          Suggested for This Patient
        </div>

        <div className="space-y-4">
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
