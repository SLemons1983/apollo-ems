'use client';

import { useState } from 'react';
import AssessmentWorkflowCard from '../clinical/components/assessment/AssessmentWorkflowCard';
import GcsAssessmentCard, {
  type GcsAssessmentForm,
} from '../clinical/components/assessment/cards/GcsAssessmentCard';
import GfastAssessmentCard, {
  type GfastAssessmentForm,
} from '../clinical/components/assessment/cards/GfastAssessmentCard';
import PrimaryAssessmentCard, {
  type PrimaryAssessmentForm,
} from '../clinical/components/assessment/cards/PrimaryAssessmentCard';
import {
  determineAssessmentMode,
  getAssessmentTasksForContext,
  type AssessmentStatus,
} from '../clinical/engine/assessment';

type AssessmentSectionProps = {
  clinicalCategory: string;
  suspectedStroke: boolean;
  possibleTrauma: boolean;
  behavioralHold: boolean;
  cardiacArrest: boolean;
};

export default function AssessmentSection({
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
  const tasks = getAssessmentTasksForContext(context);
  const [selectedTaskId, setSelectedTaskId] = useState(tasks[0]?.id ?? '');
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
  });

  const selectedTask = tasks.find((task) => task.id === selectedTaskId);

  function getTaskStatus(taskId: string): AssessmentStatus {
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

          <div className="divide-y">
            {tasks.map((task) => (
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

              {selectedTask.id === 'primary-assessment' ? (
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
