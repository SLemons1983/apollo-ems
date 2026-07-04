'use client';

import { useState } from 'react';
import ClinicalHistoryCard, {
  type ClinicalHistoryForm,
} from '../clinical/components/assessment/cards/ClinicalHistoryCard';
import AssessmentWorkflowCard from '../clinical/components/assessment/AssessmentWorkflowCard';
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
import {
  determineAssessmentMode,
  getAdditionalAssessmentTasksForContext,
  getAssessmentTasksForContext,
  type AssessmentStatus,
} from '../clinical/engine/assessment';

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
  const tasks = [...suggestedTasks, ...additionalTasks];
  const [selectedTaskId, setSelectedTaskId] = useState(
    suggestedTasks[0]?.id ?? tasks[0]?.id ?? '',
  );
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

  const selectedTask = tasks.find((task) => task.id === selectedTaskId);

  function getTaskStatus(taskId: string): AssessmentStatus {
    if (taskId === 'history-taking') {
      const completedFields = Object.values(clinicalHistory).filter(Boolean).length;

      if (completedFields === Object.keys(clinicalHistory).length) return 'complete';
      if (completedFields > 0) return 'in-progress';
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

      const completedFields = requiredFields.filter(Boolean).length;

      if (completedFields === requiredFields.length) {
        return 'complete';
      }

      if (completedFields > 0) {
        return 'in-progress';
      }
    }

    if (taskId === 'history-taking') {
      const completedFields = Object.values(clinicalHistory).filter(Boolean).length;

      if (completedFields === Object.keys(clinicalHistory).length) {
        return 'complete';
      }

      if (completedFields > 0) {
        return 'in-progress';
      }
    }

    if (taskId === 'primary-assessment') {
      const completedFields = Object.values(primaryAssessment).filter(Boolean).length;

      if (completedFields === Object.keys(primaryAssessment).length) {
        return 'complete';
      }

      if (completedFields > 0) {
        return 'in-progress';
      }
    }

    if (taskId === 'neurological-assessment') {
      const completedFields = Object.values(gcsAssessment).filter(Boolean).length;

      if (completedFields === Object.keys(gcsAssessment).length) {
        return 'complete';
      }

      if (completedFields > 0) {
        return 'in-progress';
      }
    }

    if (taskId === 'gfast-stroke-assessment') {
      const completedFields = Object.values(gfastAssessment).filter(Boolean).length;

      if (completedFields === Object.keys(gfastAssessment).length) {
        return 'complete';
      }

      if (completedFields > 0) {
        return 'in-progress';
      }
    }

    if (taskId === selectedTaskId) {
      return 'in-progress';
    }

    return 'not-started';
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

      <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
        <div className="overflow-hidden rounded-xl border bg-white">
          <div className="border-b px-5 py-4">
            <h3 className="text-lg font-bold text-slate-900">
              Assessment Workflow
            </h3>
          </div>

          <div>
            <div className="bg-emerald-50 px-5 py-2 text-xs font-bold uppercase tracking-wide text-emerald-800">
              Suggested for This Patient
            </div>

            <div className="divide-y">
              {suggestedTasks.map((task) => (
                <AssessmentWorkflowCard
                  key={task.id}
                  title={task.title}
                  status={getTaskStatus(task.id)}
                  selected={selectedTaskId === task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                />
              ))}
            </div>

            <div className="bg-slate-100 px-5 py-2 text-xs font-bold uppercase tracking-wide text-slate-600">
              Additional Assessments
            </div>

            <div className="divide-y">
              {additionalTasks.map((task) => (
                <AssessmentWorkflowCard
                  key={task.id}
                  title={task.title}
                  status={getTaskStatus(task.id)}
                  selected={selectedTaskId === task.id}
                  onClick={() => setSelectedTaskId(task.id)}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-xl border bg-white p-5">
          {selectedTask ? (
            <>
              <div className="mb-4">
                <h3 className="text-xl font-bold text-slate-900">
                  {selectedTask.title}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Assessment card will be built here.
                </p>
              </div>

              {selectedTask.id === 'history-taking' ? (
                <ClinicalHistoryCard
                  value={clinicalHistory}
                  patientForm={patientForm}
                  onChange={updateClinicalHistory}
                />
              ) : selectedTask.id === 'pain-assessment' ? (
                <PainAssessmentCard
                  value={painAssessment}
                  onChange={updatePainAssessment}
                />
              ) : selectedTask.id === 'history-taking' ? (
                <ClinicalHistoryCard
                  value={clinicalHistory}
                  patientForm={patientForm}
                  onChange={updateClinicalHistory}
                />
              ) : selectedTask.id === 'primary-assessment' ? (
                <PrimaryAssessmentCard
                  value={primaryAssessment}
                  onChange={updatePrimaryAssessment}
                />
              ) : selectedTask.id === 'neurological-assessment' ? (
                <GcsAssessmentCard
                  value={gcsAssessment}
                  onChange={updateGcsAssessment}
                />
              ) : selectedTask.id === 'gfast-stroke-assessment' ? (
                <GfastAssessmentCard
                  value={gfastAssessment}
                  onChange={updateGfastAssessment}
                />
              ) : (
                <div className="rounded-lg border-2 border-dashed border-slate-300 p-10 text-center text-slate-500">
                  {selectedTask.title} workflow coming next.
                </div>
              )}
            </>
          ) : (
            <div className="rounded-lg border-2 border-dashed border-slate-300 p-10 text-center text-slate-500">
              Select an assessment workflow to begin.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
