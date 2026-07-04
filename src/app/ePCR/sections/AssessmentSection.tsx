'use client';

import { useState } from 'react';
import PCRCard from '../components/PCRCard';
import {
  determineAssessmentMode,
  getAdditionalAssessmentTasksForContext,
  getAssessmentTasksForContext,
} from '../clinical/engine/assessment';
import ClinicalHistoryCard, {
  type ClinicalHistoryForm,
} from '../clinical/components/assessment/cards/ClinicalHistoryCard';
import ConsciousnessAssessmentCard, {
  type ConsciousnessAssessmentForm,
} from '../clinical/components/assessment/cards/ConsciousnessAssessmentCard';
import GcsAssessmentCard, {
  type GcsAssessmentForm,
} from '../clinical/components/assessment/cards/GcsAssessmentCard';
import GfastAssessmentCard, {
  type GfastAssessmentForm,
} from '../clinical/components/assessment/cards/GfastAssessmentCard';
import PainAssessmentCard, {
  type PainAssessmentForm,
} from '../clinical/components/assessment/cards/PainAssessmentCard';
import PrimaryAssessmentCard, {
  type PrimaryAssessmentForm,
} from '../clinical/components/assessment/cards/PrimaryAssessmentCard';
import type { PatientForm } from '../types';

type AssessmentSectionProps = {
  patientForm: PatientForm;
  clinicalCategory: string;
  suspectedStroke: boolean;
  possibleTrauma: boolean;
  behavioralHold: boolean;
  cardiacArrest: boolean;
};

export default function AssessmentSection({
  patientForm,
  clinicalCategory,
  suspectedStroke,
  possibleTrauma,
  behavioralHold,
  cardiacArrest,
}: AssessmentSectionProps) {
  const context = {
    clinicalCategory,
    suspectedStroke,
    possibleTrauma,
    behavioralHold,
    cardiacArrest,
  };

  const mode = determineAssessmentMode(context);
  const suggestedTasks = getAssessmentTasksForContext(context);
  const additionalTasks = getAdditionalAssessmentTasksForContext(context);
  const [expandedTaskId, setExpandedTaskId] = useState('');

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
