'use client';

import {
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import ReassessmentCard, {
  createEmptyReassessmentForm,
  type ReassessmentForm,
  type ReassessmentRecord,
} from '../clinical/components/assessment/cards/ReassessmentCard';
import type { AssessmentForm } from '../clinical/assessment/assessmentForm';
import VitalSetForm from '../clinical/components/vitals/VitalSetForm';
import type {
  ProviderScope,
  VitalSetDraft,
  VitalSetRecord,
  VitalsForm,
} from '../clinical/vitals/vitals';
import {
  createEmptyVitalSet,
  updateVitalDraftField,
  toLocalDateTimeValue as vitalTimeValue,
} from '../clinical/vitals/vitals';

type QuickToolsPanelProps = {
  assessmentForm: AssessmentForm;
  onAssessmentFormChange: Dispatch<SetStateAction<AssessmentForm>>;
  vitalsForm: VitalsForm;
  onVitalsFormChange: Dispatch<SetStateAction<VitalsForm>>;
  providerScope: ProviderScope;
};

function toLocalDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatReassessmentTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString([], {
        dateStyle: 'short',
        timeStyle: 'short',
      });
}

export default function QuickToolsPanel({
  assessmentForm,
  onAssessmentFormChange,
  vitalsForm,
  onVitalsFormChange,
  providerScope,
}: QuickToolsPanelProps) {
  const [reassessmentOpen, setReassessmentOpen] = useState(false);
  const [vitalsOpen, setVitalsOpen] = useState(false);
  const reassessmentDraft = assessmentForm.clinical.reassessment;
  const reassessments = assessmentForm.clinical.reassessments;

  function setDraft(
    nextValue:
      | ReassessmentForm
      | ((current: ReassessmentForm) => ReassessmentForm),
  ) {
    onAssessmentFormChange((current) => {
      const currentDraft = current.clinical.reassessment;
      const resolved =
        typeof nextValue === 'function'
          ? nextValue(currentDraft)
          : nextValue;

      return {
        ...current,
        clinical: {
          ...current.clinical,
          reassessment: resolved,
        },
      };
    });
  }

  function openNewReassessment() {
    setDraft(createEmptyReassessmentForm(toLocalDateTimeValue()));
    setReassessmentOpen(true);
  }

  function updateDraft(field: keyof ReassessmentForm, value: string) {
    setDraft((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function cancelReassessment() {
    setDraft(createEmptyReassessmentForm());
    setReassessmentOpen(false);
  }

  function saveReassessment() {
    const createdAt = new Date().toISOString();
    const record: ReassessmentRecord = {
      ...reassessmentDraft,
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `reassessment-${Date.now()}`,
      createdAt,
    };

    onAssessmentFormChange((current) => ({
      ...current,
      clinical: {
        ...current.clinical,
        reassessment: createEmptyReassessmentForm(),
        reassessments: [...current.clinical.reassessments, record],
      },
    }));
    setReassessmentOpen(false);
  }

  const requiredValues = [
    reassessmentDraft.assessedAt,
    reassessmentDraft.reason,
    reassessmentDraft.patientCondition,
    reassessmentDraft.mentalStatus,
    reassessmentDraft.airwayBreathing,
    reassessmentDraft.circulation,
    reassessmentDraft.interventionsResponse,
    reassessmentDraft.transportPriority,
  ];
  const saveDisabled = requiredValues.some((value) => !value);

  function openNewVitals() {
    onVitalsFormChange((current) => ({
      ...current,
      draft: createEmptyVitalSet(vitalTimeValue()),
    }));
    setVitalsOpen(true);
  }

  function updateVitalDraft(field: keyof VitalSetDraft, value: string) {
    onVitalsFormChange((current) => ({
      ...current,
      draft: {
        ...updateVitalDraftField(current.draft, field, value),
      },
    }));
  }

  function cancelVitals() {
    onVitalsFormChange((current) => ({
      ...current,
      draft: createEmptyVitalSet(),
    }));
    setVitalsOpen(false);
  }

  function saveVitals() {
    const record: VitalSetRecord = {
      ...vitalsForm.draft,
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `vital-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    onVitalsFormChange((current) => ({
      draft: createEmptyVitalSet(),
      sets: [...current.sets, record],
    }));
    setVitalsOpen(false);
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-indigo-200 bg-white">
        <button
          type="button"
          onClick={
            reassessmentOpen
              ? () => setReassessmentOpen(false)
              : openNewReassessment
          }
          className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-indigo-50"
        >
          <div>
            <h3 className="font-bold text-slate-900">Reassessment</h3>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Add a timestamped patient reassessment after treatment, intervention, or a change in condition.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-indigo-100 px-2.5 py-1 text-xs font-black text-indigo-800">
            {reassessments.length}
          </span>
        </button>

        {reassessmentOpen && (
          <div className="border-t border-indigo-200 p-4">
            <ReassessmentCard
              value={reassessmentDraft}
              onChange={updateDraft}
              onSave={saveReassessment}
              onCancel={cancelReassessment}
              saveDisabled={saveDisabled}
            />
            {saveDisabled && (
              <p className="mt-3 text-xs font-semibold text-amber-700">
                Complete the date/time, reason, condition, mental status, airway/breathing, circulation, response, and priority to save.
              </p>
            )}
          </div>
        )}
      </div>

      {reassessments.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-black uppercase tracking-wide text-slate-500">
            Saved Reassessments
          </div>
          {[...reassessments].reverse().map((entry, index) => (
            <div
              key={entry.id}
              className="rounded-xl border border-slate-200 bg-slate-50 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-900">
                    {entry.reason || 'Reassessment'}
                  </div>
                  <div className="mt-1 text-xs font-semibold text-slate-500">
                    {formatReassessmentTime(entry.assessedAt)}
                  </div>
                </div>
                <span className="rounded-full bg-white px-2 py-1 text-[10px] font-black uppercase text-slate-600">
                  #{reassessments.length - index}
                </span>
              </div>
              <div className="mt-2 text-sm font-semibold text-slate-700">
                {entry.patientCondition} · {entry.interventionsResponse}
              </div>
              {entry.notes && (
                <p className="mt-2 text-sm leading-5 text-slate-600">
                  {entry.notes}
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-sky-200 bg-white">
        <button
          type="button"
          onClick={vitalsOpen ? () => setVitalsOpen(false) : openNewVitals}
          className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-sky-50"
        >
          <div>
            <h3 className="font-bold text-slate-900">Quick Vitals</h3>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Add a complete vital-sign set directly to the central Vitals timeline.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-sky-100 px-2.5 py-1 text-xs font-black text-sky-800">
            {vitalsForm.sets.length}
          </span>
        </button>
        {vitalsOpen && (
          <div className="border-t border-sky-200 p-4">
            <VitalSetForm
              value={vitalsForm.draft}
              providerScope={providerScope}
              compact
              onChange={updateVitalDraft}
              onSave={saveVitals}
              onCancel={cancelVitals}
            />
          </div>
        )}
      </div>

      {[
        ['Dosing Calculator', 'Weight-based medication and infusion calculations.'],
        ['Clinical Timer', 'Track CPR, stroke, medication, contraction, or procedure times.'],
      ].map(([title, description]) => (
        <div key={title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 flex items-start justify-between gap-3">
            <h3 className="font-bold text-slate-900">{title}</h3>
            <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
              Coming Soon
            </span>
          </div>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
        </div>
      ))}
    </div>
  );
}
