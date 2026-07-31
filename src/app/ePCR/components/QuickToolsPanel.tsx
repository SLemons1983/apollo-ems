"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import ReassessmentCard, {
  createEmptyReassessmentForm,
  type ReassessmentForm,
  type ReassessmentRecord,
} from "../clinical/components/assessment/cards/ReassessmentCard";
import type { AssessmentForm } from "../clinical/assessment/assessmentForm";
import VitalSetForm from "../clinical/components/vitals/VitalSetForm";
import type {
  ProviderScope,
  VitalSetDraft,
  VitalSetRecord,
  VitalsForm,
} from "../clinical/vitals/vitals";
import {
  createEmptyVitalSet,
  updateVitalDraftField,
  toLocalDateTimeValue as vitalTimeValue,
} from "../clinical/vitals/vitals";
import type {
  TreatmentRecord,
  TreatmentsForm,
} from "../clinical/treatments/treatments";

type QuickToolsPanelProps = {
  assessmentForm: AssessmentForm;
  onAssessmentFormChange: Dispatch<SetStateAction<AssessmentForm>>;
  vitalsForm: VitalsForm;
  onVitalsFormChange: Dispatch<SetStateAction<VitalsForm>>;
  treatmentsForm: TreatmentsForm;
  onTreatmentsFormChange: Dispatch<SetStateAction<TreatmentsForm>>;
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
        dateStyle: "short",
        timeStyle: "short",
      });
}

export default function QuickToolsPanel({
  assessmentForm,
  onAssessmentFormChange,
  vitalsForm,
  onVitalsFormChange,
  treatmentsForm,
  onTreatmentsFormChange,
  providerScope,
}: QuickToolsPanelProps) {
  const [reassessmentOpen, setReassessmentOpen] = useState(false);
  const [vitalsOpen, setVitalsOpen] = useState(false);
  const [treatmentOpen, setTreatmentOpen] = useState(false);
  const [quickTreatmentName, setQuickTreatmentName] = useState("");
  const [quickTreatmentStatus, setQuickTreatmentStatus] = useState("Completed");
  const [quickTreatmentNotes, setQuickTreatmentNotes] = useState("");
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
        typeof nextValue === "function" ? nextValue(currentDraft) : nextValue;

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
        typeof crypto !== "undefined" && "randomUUID" in crypto
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
        typeof crypto !== "undefined" && "randomUUID" in crypto
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

  function saveQuickTreatment() {
    if (!quickTreatmentName.trim()) return;
    const record: TreatmentRecord = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `treatment-${Date.now()}`,
      category: "Quick Entry",
      name: quickTreatmentName.trim(),
      performedAt: toLocalDateTimeValue(),
      status: quickTreatmentStatus,
      notes: quickTreatmentNotes.trim(),
    };
    onTreatmentsFormChange((current) => ({
      ...current,
      records: [...current.records, record],
      noTreatmentReason: "",
      noTreatmentExplanation: "",
    }));
    setQuickTreatmentName("");
    setQuickTreatmentStatus("Completed");
    setQuickTreatmentNotes("");
    setTreatmentOpen(false);
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
              Add a timestamped patient reassessment after treatment,
              intervention, or a change in condition.
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
                Complete the date/time, reason, condition, mental status,
                airway/breathing, circulation, response, and priority to save.
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
                    {entry.reason || "Reassessment"}
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
              Add a complete vital-sign set directly to the central Vitals
              timeline.
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

      <div className="overflow-hidden rounded-xl border border-emerald-200 bg-white">
        <button
          type="button"
          onClick={() => setTreatmentOpen((open) => !open)}
          className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-emerald-50"
        >
          <div>
            <h3 className="font-bold text-slate-900">Quick Treatment</h3>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              Add a timestamped intervention to the Treatments timeline.
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800">
            {treatmentsForm.records.length}
          </span>
        </button>
        {treatmentOpen && (
          <div className="space-y-3 border-t border-emerald-200 p-4">
            <label className="block space-y-1">
              <span className="text-xs font-black uppercase tracking-wide text-slate-600">
                Treatment / Procedure
              </span>
              <input
                value={quickTreatmentName}
                onChange={(event) => setQuickTreatmentName(event.target.value)}
                placeholder="e.g., Oxygen therapy"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-black uppercase tracking-wide text-slate-600">
                Result / Status
              </span>
              <select
                value={quickTreatmentStatus}
                onChange={(event) =>
                  setQuickTreatmentStatus(event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
              >
                {[
                  "Completed",
                  "Successful",
                  "Unsuccessful",
                  "Attempted",
                  "Discontinued",
                  "Patient refused",
                ].map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-black uppercase tracking-wide text-slate-600">
                Details / Response
              </span>
              <textarea
                value={quickTreatmentNotes}
                onChange={(event) => setQuickTreatmentNotes(event.target.value)}
                rows={2}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setTreatmentOpen(false)}
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-bold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!quickTreatmentName.trim()}
                onClick={saveQuickTreatment}
                className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-black text-white disabled:bg-slate-300"
              >
                Save Treatment
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
