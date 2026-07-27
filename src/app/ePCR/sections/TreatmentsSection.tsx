"use client";

import { useMemo, useState, type Dispatch, type SetStateAction } from "react";
import type {
  NoTreatmentReason,
  TreatmentRecord,
  TreatmentsForm,
} from "../clinical/treatments/treatments";
import { ccemsaProtocolPack } from "../reference/protocols/ccemsa/manifest";

type TreatmentsSectionProps = {
  treatmentsForm: TreatmentsForm;
  setTreatmentsForm: Dispatch<SetStateAction<TreatmentsForm>>;
  providerScope: "ALS" | "BLS";
};

type TreatmentOption = {
  category: string;
  name: string;
  scope: "ALS" | "BLS";
};

const treatmentOptions: TreatmentOption[] = [
  { category: "Airway", name: "Airway positioning", scope: "BLS" },
  { category: "Airway", name: "OPA / NPA", scope: "BLS" },
  { category: "Airway", name: "Suction", scope: "BLS" },
  { category: "Airway", name: "BVM ventilation", scope: "BLS" },
  { category: "Airway", name: "Supraglottic airway", scope: "ALS" },
  { category: "Airway", name: "Endotracheal intubation", scope: "ALS" },
  { category: "Breathing", name: "Oxygen therapy", scope: "BLS" },
  { category: "Breathing", name: "Nebulized medication", scope: "ALS" },
  { category: "Breathing", name: "CPAP", scope: "ALS" },
  { category: "Breathing", name: "Needle decompression", scope: "ALS" },
  { category: "Circulation", name: "Hemorrhage control", scope: "BLS" },
  { category: "Circulation", name: "Tourniquet", scope: "BLS" },
  { category: "Circulation", name: "IV access", scope: "ALS" },
  { category: "Circulation", name: "IO access", scope: "ALS" },
  { category: "Circulation", name: "Fluid administration", scope: "ALS" },
  { category: "Cardiac", name: "12-lead ECG", scope: "ALS" },
  { category: "Cardiac", name: "Cardiac monitoring", scope: "ALS" },
  { category: "Cardiac", name: "Defibrillation", scope: "ALS" },
  { category: "Cardiac", name: "Synchronized cardioversion", scope: "ALS" },
  { category: "Cardiac", name: "Transcutaneous pacing", scope: "ALS" },
  { category: "Medication", name: "Medication administration", scope: "ALS" },
  { category: "Trauma", name: "Spinal motion restriction", scope: "BLS" },
  { category: "Trauma", name: "Splinting", scope: "BLS" },
  { category: "Trauma", name: "Wound care", scope: "BLS" },
  { category: "Trauma", name: "Pelvic stabilization", scope: "BLS" },
  { category: "Resuscitation", name: "CPR", scope: "BLS" },
  { category: "Resuscitation", name: "AED", scope: "BLS" },
  { category: "Other", name: "Patient positioning", scope: "BLS" },
  { category: "Other", name: "Temperature management", scope: "BLS" },
  { category: "Other", name: "Other treatment / procedure", scope: "BLS" },
];

const statuses = [
  "Completed",
  "Successful",
  "Unsuccessful",
  "Attempted",
  "Discontinued",
  "Patient refused",
];

function toLocalDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString([], {
        dateStyle: "short",
        timeStyle: "short",
      });
}

export default function TreatmentsSection({
  treatmentsForm,
  setTreatmentsForm,
  providerScope,
}: TreatmentsSectionProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [name, setName] = useState("");
  const [performedAt, setPerformedAt] = useState(toLocalDateTimeValue());
  const [status, setStatus] = useState("Completed");
  const [notes, setNotes] = useState("");

  const availableTreatments = useMemo(
    () =>
      treatmentOptions.filter(
        (option) => providerScope === "ALS" || option.scope === "BLS",
      ),
    [providerScope],
  );
  const categories = [
    ...new Set(availableTreatments.map((item) => item.category)),
  ];
  const categoryTreatments = availableTreatments.filter(
    (item) => item.category === category,
  );

  function resetEditor() {
    setCategory("");
    setName("");
    setPerformedAt(toLocalDateTimeValue());
    setStatus("Completed");
    setNotes("");
  }

  function saveTreatment() {
    if (!category || !name || !performedAt || !status) return;

    const record: TreatmentRecord = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `treatment-${Date.now()}`,
      category,
      name,
      performedAt,
      status,
      notes: notes.trim(),
    };

    setTreatmentsForm((current) => ({
      ...current,
      records: [...current.records, record],
      noTreatmentReason: "",
      noTreatmentExplanation: "",
    }));
    resetEditor();
    setEditorOpen(false);
  }

  function removeTreatment(id: string) {
    setTreatmentsForm((current) => ({
      ...current,
      records: current.records.filter((record) => record.id !== id),
    }));
  }

  function toggleProtocol(id: string, name: string) {
    setTreatmentsForm((current) => {
      const selected = current.selectedProtocols.some(
        (protocol) => protocol.id === id,
      );
      return {
        ...current,
        selectedProtocols: selected
          ? current.selectedProtocols.filter((protocol) => protocol.id !== id)
          : [
              ...current.selectedProtocols,
              { id, name, selectedAt: new Date().toISOString() },
            ],
      };
    });
  }

  function setNoTreatmentReason(reason: NoTreatmentReason) {
    setTreatmentsForm((current) => ({
      ...current,
      noTreatmentReason: reason,
      noTreatmentExplanation:
        reason === "Other" ? current.noTreatmentExplanation : "",
    }));
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-black text-indigo-950">
              Treatments &amp; Procedures
            </h3>
            <p className="mt-1 text-sm font-semibold text-indigo-800">
              Document each intervention as it occurs. Entries are retained in
              chronological order for the final care narrative.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (editorOpen) {
                resetEditor();
              } else {
                setPerformedAt(toLocalDateTimeValue());
              }
              setEditorOpen((open) => !open);
            }}
            className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-black text-white shadow hover:bg-indigo-800"
          >
            {editorOpen ? "Cancel" : "+ Add Treatment"}
          </button>
        </div>
      </div>

      {editorOpen && (
        <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
          <h4 className="font-black text-slate-900">New Treatment</h4>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wide text-slate-600">
                Category *
              </span>
              <select
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                  setName("");
                }}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
              >
                <option value="">Select category</option>
                {categories.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wide text-slate-600">
                Treatment / Procedure *
              </span>
              <select
                value={name}
                disabled={!category}
                onChange={(event) => setName(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 disabled:bg-slate-100"
              >
                <option value="">Select treatment</option>
                {categoryTreatments.map((item) => (
                  <option key={item.name} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wide text-slate-600">
                Performed At *
              </span>
              <input
                type="datetime-local"
                value={performedAt}
                onChange={(event) => setPerformedAt(event.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-900"
              />
            </label>

            <label className="space-y-1">
              <span className="text-xs font-black uppercase tracking-wide text-slate-600">
                Result / Status *
              </span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900"
              >
                {statuses.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="mt-4 block space-y-1">
            <span className="text-xs font-black uppercase tracking-wide text-slate-600">
              Details / Response
            </span>
            <textarea
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={3}
              placeholder="Dose, route, site, device size, number of attempts, patient response, or other treatment details."
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
            />
          </label>

          <div className="mt-4 flex flex-wrap justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                resetEditor();
                setEditorOpen(false);
              }}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!category || !name || !performedAt || !status}
              onClick={saveTreatment}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-black text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Save Treatment
            </button>
          </div>
        </div>
      )}

      {treatmentsForm.records.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-black text-slate-900">Treatment Timeline</h4>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
              {treatmentsForm.records.length} documented
            </span>
          </div>
          {[...treatmentsForm.records]
            .sort(
              (left, right) =>
                new Date(left.performedAt).getTime() -
                new Date(right.performedAt).getTime(),
            )
            .map((record) => (
              <article
                key={record.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h5 className="font-black text-slate-900">
                        {record.name}
                      </h5>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black uppercase text-slate-600">
                        {record.category}
                      </span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-slate-500">
                      {formatDateTime(record.performedAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-black ${
                        record.status === "Unsuccessful" ||
                        record.status === "Discontinued"
                          ? "bg-red-100 text-red-800"
                          : record.status === "Attempted" ||
                              record.status === "Patient refused"
                            ? "bg-amber-100 text-amber-800"
                            : "bg-emerald-100 text-emerald-800"
                      }`}
                    >
                      {record.status}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeTreatment(record.id)}
                      className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-black text-red-700 hover:bg-red-50"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {record.notes && (
                  <p className="mt-3 rounded-lg bg-slate-50 p-3 text-sm leading-6 text-slate-700">
                    {record.notes}
                  </p>
                )}
              </article>
            ))}
        </div>
      ) : (
        <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-6 text-center">
          <p className="font-bold text-slate-700">No treatments documented</p>
          <p className="mt-1 text-sm text-slate-500">
            Add a treatment above or document why no treatment was provided.
          </p>
        </div>
      )}

      {treatmentsForm.records.length === 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <h4 className="font-black text-amber-950">No Treatment Provided</h4>
          <p className="mt-1 text-sm font-semibold text-amber-800">
            Select a reason to complete this section when no intervention was
            performed.
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {[
              "No treatment indicated",
              "Patient refused treatment",
              "Treatment completed prior to EMS arrival",
              "Other",
            ].map((reason) => (
              <button
                key={reason}
                type="button"
                onClick={() =>
                  setNoTreatmentReason(
                    treatmentsForm.noTreatmentReason === reason
                      ? ""
                      : (reason as NoTreatmentReason),
                  )
                }
                className={`rounded-lg border px-3 py-2 text-left text-sm font-bold ${
                  treatmentsForm.noTreatmentReason === reason
                    ? "border-amber-500 bg-amber-200 text-amber-950"
                    : "border-amber-200 bg-white text-slate-700 hover:bg-amber-100"
                }`}
              >
                {reason}
              </button>
            ))}
          </div>
          {treatmentsForm.noTreatmentReason === "Other" && (
            <textarea
              value={treatmentsForm.noTreatmentExplanation}
              onChange={(event) =>
                setTreatmentsForm((current) => ({
                  ...current,
                  noTreatmentExplanation: event.target.value,
                }))
              }
              rows={2}
              placeholder="Explain why no treatment was provided."
              className="mt-3 w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-slate-900"
            />
          )}
        </div>
      )}

      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
        <h4 className="font-black text-sky-950">Referenced Protocols</h4>
        <p className="mt-1 text-sm font-semibold text-sky-800">
          Select the protocols used to guide patient care. This records the
          reference; it does not replace clinical judgment or local policy.
        </p>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {ccemsaProtocolPack.protocols.map((protocol) => {
            const selected = treatmentsForm.selectedProtocols.some(
              (item) => item.id === protocol.id,
            );
            return (
              <button
                key={protocol.id}
                type="button"
                onClick={() =>
                  toggleProtocol(
                    protocol.id,
                    `${protocol.id} — ${protocol.title}`,
                  )
                }
                className={`rounded-lg border p-3 text-left ${
                  selected
                    ? "border-sky-500 bg-sky-200"
                    : "border-sky-200 bg-white hover:bg-sky-100"
                }`}
              >
                <span className="block text-xs font-black uppercase tracking-wide text-sky-700">
                  {protocol.category}
                </span>
                <span className="mt-1 block font-black text-slate-900">
                  {protocol.id} — {protocol.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <label className="block rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <span className="font-black text-slate-900">
          Treatments Clinical Note
        </span>
        <span className="mt-1 block text-sm text-slate-600">
          Add context that should flow into the treatment summary and final
          narrative.
        </span>
        <textarea
          value={treatmentsForm.clinicalNote}
          onChange={(event) =>
            setTreatmentsForm((current) => ({
              ...current,
              clinicalNote: event.target.value,
            }))
          }
          rows={4}
          placeholder="Document clinical reasoning, response to care, consultation, or details not captured above."
          className="mt-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
        />
      </label>
    </div>
  );
}
