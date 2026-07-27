"use client";

import {
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import type { CrewMember } from "../types";
import {
  MEDICATION_CATEGORY,
  treatmentCatalog,
  type MedicationDetails,
  type NoTreatmentReason,
  type TreatmentRecord,
  type TreatmentsForm,
} from "../clinical/treatments/treatments";
import { ccemsaProtocolPack } from "../reference/protocols/ccemsa/manifest";

type Props = {
  treatmentsForm: TreatmentsForm;
  setTreatmentsForm: Dispatch<SetStateAction<TreatmentsForm>>;
  providerScope: "ALS" | "BLS";
  crewMembers: CrewMember[];
};

const statuses = [
  "Completed",
  "Successful",
  "Unsuccessful",
  "Attempted",
  "Discontinued",
  "Patient refused",
];
const routes = [
  "PO",
  "SL",
  "IN",
  "IM",
  "IV",
  "IO",
  "SC",
  "Nebulized",
  "Topical",
  "Rectal",
  "ET",
  "Other",
];
const units = [
  "mcg",
  "mg",
  "g",
  "mL",
  "units",
  "tablet(s)",
  "spray(s)",
  "mg/kg",
  "mcg/kg",
  "Other",
];
const authorizations = [
  "Standing order / protocol",
  "Base / medical control order",
  "Patient-assisted medication",
  "Other",
];

function localDateTime(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

function formatDateTime(value: string) {
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? value
    : parsed.toLocaleString([], { dateStyle: "short", timeStyle: "short" });
}

const emptyMedication = (): MedicationDetails => ({
  medication: "",
  indication: "",
  dose: "",
  unit: "",
  concentration: "",
  route: "",
  authorizationType: "Standing order / protocol",
  orderingPhysician: "",
});

export default function TreatmentsSection({
  treatmentsForm,
  setTreatmentsForm,
  providerScope,
  crewMembers,
}: Props) {
  const [editorOpen, setEditorOpen] = useState(false);
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [name, setName] = useState("");
  const [performedAt, setPerformedAt] = useState(localDateTime());
  const [status, setStatus] = useState("Completed");
  const [performedById, setPerformedById] = useState("");
  const [assistedByIds, setAssistedByIds] = useState<string[]>([]);
  const [otherProviderName, setOtherProviderName] = useState("");
  const [otherProviderAgency, setOtherProviderAgency] = useState("");
  const [attempts, setAttempts] = useState("");
  const [patientResponse, setPatientResponse] = useState("");
  const [complications, setComplications] = useState("");
  const [notes, setNotes] = useState("");
  const [medication, setMedication] = useState(emptyMedication());

  const available = useMemo(
    () =>
      treatmentCatalog.filter(
        (item) => providerScope === "ALS" || item.scope === "BLS",
      ),
    [providerScope],
  );
  const categories = [...new Set(available.map((item) => item.category))];
  const subcategories = [
    ...new Set(
      available
        .filter((item) => item.category === category)
        .map((item) => item.subcategory),
    ),
  ];
  const treatments = available.filter(
    (item) => item.category === category && item.subcategory === subcategory,
  );
  const selectedCatalogItem = treatments.find((item) => item.name === name);
  const selectedCrew = crewMembers.find(
    (member) => member.id === performedById,
  );
  const isOtherProvider = performedById === "other-provider";
  const isMedication = category === MEDICATION_CATEGORY;
  const canSave = Boolean(
    category &&
      subcategory &&
      name &&
      performedAt &&
      status &&
      performedById &&
      (!isOtherProvider || otherProviderName.trim()) &&
      (!isMedication ||
        (medication.medication.trim() &&
          medication.dose.trim() &&
          medication.unit &&
          medication.route)),
  );

  function resetEditor() {
    setCategory("");
    setSubcategory("");
    setName("");
    setPerformedAt(localDateTime());
    setStatus("Completed");
    setPerformedById("");
    setAssistedByIds([]);
    setOtherProviderName("");
    setOtherProviderAgency("");
    setAttempts("");
    setPatientResponse("");
    setComplications("");
    setNotes("");
    setMedication(emptyMedication());
  }

  function updateMedication(field: keyof MedicationDetails, value: string) {
    setMedication((current) => ({ ...current, [field]: value }));
  }

  function saveTreatment() {
    if (!canSave) return;
    const assistants = crewMembers.filter((member) =>
      assistedByIds.includes(member.id),
    );
    const record: TreatmentRecord = {
      id:
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `treatment-${Date.now()}`,
      category,
      subcategory,
      name,
      performedAt,
      status,
      performedById,
      performedByName: isOtherProvider
        ? otherProviderName.trim()
        : selectedCrew?.name,
      providerLevel: isOtherProvider
        ? "Other Provider"
        : selectedCrew?.certification,
      assistedByIds,
      assistedByNames: assistants.map((member) => member.name),
      otherProviderName: isOtherProvider ? otherProviderName.trim() : "",
      otherProviderAgency: isOtherProvider ? otherProviderAgency.trim() : "",
      attempts: attempts.trim(),
      patientResponse: patientResponse.trim(),
      complications: complications.trim(),
      medication: isMedication
        ? {
            ...medication,
            medication:
              name === "Other medication" ? medication.medication.trim() : name,
          }
        : undefined,
      protocolIds: selectedCatalogItem?.protocolKeywords ?? [],
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

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="font-black text-indigo-950">
              Treatments &amp; Procedures
            </h3>
            <p className="mt-1 text-sm font-semibold text-indigo-800">
              Select Category → Subcategory → Treatment / Procedure, then
              document who performed it and the patient response.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              if (editorOpen) resetEditor();
              else setPerformedAt(localDateTime());
              setEditorOpen(!editorOpen);
            }}
            className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-black text-white shadow hover:bg-indigo-800"
          >
            {editorOpen ? "Cancel" : "+ Add Treatment"}
          </button>
        </div>
      </div>

      {editorOpen && (
        <div className="rounded-xl border border-slate-300 bg-white p-4 shadow-sm">
          <h4 className="font-black text-slate-900">
            New Treatment / Procedure
          </h4>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            <Select
              label="Category *"
              value={category}
              placeholder="Select category"
              options={categories}
              onChange={(value) => {
                setCategory(value);
                setSubcategory("");
                setName("");
                setMedication(emptyMedication());
              }}
            />
            <Select
              label="Subcategory *"
              value={subcategory}
              placeholder="Select subcategory"
              options={subcategories}
              disabled={!category}
              onChange={(value) => {
                setSubcategory(value);
                setName("");
              }}
            />
            <Select
              label="Treatment / Procedure *"
              value={name}
              placeholder="Select treatment / procedure"
              options={treatments.map((item) => item.name)}
              disabled={!subcategory}
              onChange={(value) => {
                setName(value);
                if (
                  category === MEDICATION_CATEGORY &&
                  value !== "Other medication"
                )
                  updateMedication("medication", value);
              }}
            />
          </div>

          {isMedication && name && (
            <div className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4">
              <h5 className="font-black text-violet-950">
                Medication Administration
              </h5>
              <div className="mt-3 grid gap-4 md:grid-cols-3">
                <Field
                  label="Medication *"
                  value={
                    name === "Other medication" ? medication.medication : name
                  }
                  disabled={name !== "Other medication"}
                  onChange={(v) => updateMedication("medication", v)}
                />
                <Field
                  label="Indication"
                  value={medication.indication}
                  onChange={(v) => updateMedication("indication", v)}
                />
                <Field
                  label="Dose *"
                  value={medication.dose}
                  onChange={(v) => updateMedication("dose", v)}
                />
                <Select
                  label="Unit *"
                  value={medication.unit}
                  placeholder="Select unit"
                  options={units}
                  onChange={(v) => updateMedication("unit", v)}
                />
                <Field
                  label="Concentration"
                  value={medication.concentration}
                  placeholder="Example: 1 mg/mL"
                  onChange={(v) => updateMedication("concentration", v)}
                />
                <Select
                  label="Route *"
                  value={medication.route}
                  placeholder="Select route"
                  options={routes}
                  onChange={(v) => updateMedication("route", v)}
                />
                <Select
                  label="Authorization *"
                  value={medication.authorizationType}
                  placeholder="Select authorization"
                  options={authorizations}
                  onChange={(v) => updateMedication("authorizationType", v)}
                />
                {medication.authorizationType ===
                  "Base / medical control order" && (
                  <Field
                    label="Ordering Physician"
                    value={medication.orderingPhysician}
                    onChange={(v) => updateMedication("orderingPhysician", v)}
                  />
                )}
              </div>
            </div>
          )}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-1">
              <Label>Performed At *</Label>
              <input
                type="datetime-local"
                value={performedAt}
                onChange={(e) => setPerformedAt(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold"
              />
            </label>
            <Select
              label={isMedication ? "Administered By *" : "Performed By *"}
              value={performedById}
              placeholder="Select assigned crew member"
              options={[
                ...crewMembers.map((member) => ({
                  value: member.id,
                  label: `${member.name} — ${member.certification}`,
                })),
                { value: "other-provider", label: "Other Provider / Agency" },
              ]}
              onChange={setPerformedById}
            />
            {isOtherProvider && (
              <>
                <Field
                  label="Other Provider Name *"
                  value={otherProviderName}
                  onChange={setOtherProviderName}
                />
                <Field
                  label="Other Provider Agency"
                  value={otherProviderAgency}
                  onChange={setOtherProviderAgency}
                />
              </>
            )}
            <Select
              label="Result / Status *"
              value={status}
              placeholder="Select status"
              options={statuses}
              onChange={setStatus}
            />
            <Field
              label="Number of Attempts"
              value={attempts}
              placeholder="Example: 1"
              onChange={setAttempts}
            />
          </div>

          {crewMembers.length > 1 && (
            <fieldset className="mt-4">
              <Label>Assisted By (optional)</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {crewMembers
                  .filter((m) => m.id !== performedById)
                  .map((member) => (
                    <label
                      key={member.id}
                      className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold"
                    >
                      <input
                        type="checkbox"
                        checked={assistedByIds.includes(member.id)}
                        onChange={(e) =>
                          setAssistedByIds((current) =>
                            e.target.checked
                              ? [...current, member.id]
                              : current.filter((id) => id !== member.id),
                          )
                        }
                      />
                      {member.name} — {member.certification}
                    </label>
                  ))}
              </div>
            </fieldset>
          )}

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Area
              label="Patient Response"
              value={patientResponse}
              onChange={setPatientResponse}
            />
            <Area
              label="Complications"
              value={complications}
              placeholder="None, or describe complications."
              onChange={setComplications}
            />
          </div>
          <Area
            className="mt-4"
            label="Additional Notes"
            value={notes}
            placeholder="Site, device size, technique, consultation, or other details."
            onChange={setNotes}
          />
          {crewMembers.length === 0 && (
            <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm font-bold text-amber-900">
              Add the assigned crew in Call → Crew Information before saving a
              treatment.
            </p>
          )}
          <div className="mt-4 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                resetEditor();
                setEditorOpen(false);
              }}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-bold"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={!canSave}
              onClick={saveTreatment}
              className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-black text-white disabled:bg-slate-300"
            >
              Save Treatment
            </button>
          </div>
        </div>
      )}

      {treatmentsForm.records.length ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-black">Treatment Timeline</h4>
            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-black text-emerald-800">
              {treatmentsForm.records.length} documented
            </span>
          </div>
          {[...treatmentsForm.records]
            .sort(
              (a, b) =>
                new Date(a.performedAt).getTime() -
                new Date(b.performedAt).getTime(),
            )
            .map((record) => (
              <article
                key={record.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap justify-between gap-3">
                  <div>
                    <h5 className="font-black">{record.name}</h5>
                    <p className="mt-1 text-xs font-bold uppercase text-slate-500">
                      {record.category}
                      {record.subcategory ? ` → ${record.subcategory}` : ""}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-slate-600">
                      {formatDateTime(record.performedAt)}
                      {record.performedByName
                        ? ` • ${isMedicationRecord(record) ? "Administered" : "Performed"} by ${record.performedByName}${record.providerLevel ? `, ${record.providerLevel}` : ""}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-black text-emerald-800">
                      {record.status}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setTreatmentsForm((current) => ({
                          ...current,
                          records: current.records.filter(
                            (item) => item.id !== record.id,
                          ),
                        }))
                      }
                      className="rounded-lg border border-red-200 px-2.5 py-1 text-xs font-black text-red-700"
                    >
                      Remove
                    </button>
                  </div>
                </div>
                {record.medication && (
                  <p className="mt-3 rounded-lg bg-violet-50 p-3 text-sm font-bold text-violet-900">
                    {record.medication.dose} {record.medication.unit} via{" "}
                    {record.medication.route}
                    {record.medication.concentration
                      ? ` • ${record.medication.concentration}`
                      : ""}
                  </p>
                )}
                {(record.assistedByNames?.length ||
                  record.patientResponse ||
                  record.complications ||
                  record.notes) && (
                  <div className="mt-3 space-y-1 rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                    {!!record.assistedByNames?.length && (
                      <p>
                        <b>Assisted by:</b> {record.assistedByNames.join(", ")}
                      </p>
                    )}
                    {record.patientResponse && (
                      <p>
                        <b>Response:</b> {record.patientResponse}
                      </p>
                    )}
                    {record.complications && (
                      <p>
                        <b>Complications:</b> {record.complications}
                      </p>
                    )}
                    {record.notes && (
                      <p>
                        <b>Notes:</b> {record.notes}
                      </p>
                    )}
                  </div>
                )}
              </article>
            ))}
        </div>
      ) : (
        <NoTreatment
          treatmentsForm={treatmentsForm}
          setTreatmentsForm={setTreatmentsForm}
        />
      )}

      <div className="rounded-xl border border-sky-200 bg-sky-50 p-4">
        <h4 className="font-black text-sky-950">Referenced Protocols</h4>
        <p className="mt-1 text-sm font-semibold text-sky-800">
          Select the active Merced County or CCEMSA protocol used to guide care.
          Provider scope remains controlled by local authorization.
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
                className={`rounded-lg border p-3 text-left ${selected ? "border-sky-500 bg-sky-200" : "border-sky-200 bg-white hover:bg-sky-100"}`}
              >
                <span className="block text-xs font-black uppercase text-sky-700">
                  {protocol.category}
                </span>
                <span className="mt-1 block font-black">
                  {protocol.id} — {protocol.title}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <Area
        label="Treatments Clinical Note"
        value={treatmentsForm.clinicalNote}
        placeholder="Clinical reasoning, consultation, response to care, or details for the final narrative."
        onChange={(value) =>
          setTreatmentsForm((current) => ({ ...current, clinicalNote: value }))
        }
      />
    </div>
  );
}

function isMedicationRecord(record: TreatmentRecord) {
  return record.category === MEDICATION_CATEGORY;
}
function Label({ children }: { children: ReactNode }) {
  return (
    <span className="text-xs font-black uppercase tracking-wide text-slate-600">
      {children}
    </span>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-1">
      <Label>{label}</Label>
      <input
        value={value}
        disabled={disabled}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold disabled:bg-slate-100"
      />
    </label>
  );
}
function Area({
  label,
  value,
  onChange,
  placeholder,
  className = "",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <Label>{label}</Label>
      <textarea
        rows={3}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
      />
    </label>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
  placeholder,
  disabled = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<string | { value: string; label: string }>;
  placeholder: string;
  disabled?: boolean;
}) {
  return (
    <label className="space-y-1">
      <Label>{label}</Label>
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold disabled:bg-slate-100"
      >
        <option value="">{placeholder}</option>
        {options.map((item) => {
          const option =
            typeof item === "string" ? { value: item, label: item } : item;
          return (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          );
        })}
      </select>
    </label>
  );
}
function NoTreatment({
  treatmentsForm,
  setTreatmentsForm,
}: {
  treatmentsForm: TreatmentsForm;
  setTreatmentsForm: Dispatch<SetStateAction<TreatmentsForm>>;
}) {
  const reasons: Exclude<NoTreatmentReason, "">[] = [
    "No treatment indicated",
    "Patient refused treatment",
    "Treatment completed prior to EMS arrival",
    "Other",
  ];
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
      <h4 className="font-black text-amber-950">No Treatment Provided</h4>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {reasons.map((reason) => (
          <button
            key={reason}
            type="button"
            onClick={() =>
              setTreatmentsForm((current) => ({
                ...current,
                noTreatmentReason:
                  current.noTreatmentReason === reason ? "" : reason,
                noTreatmentExplanation:
                  reason === "Other" ? current.noTreatmentExplanation : "",
              }))
            }
            className={`rounded-lg border px-3 py-2 text-left text-sm font-bold ${treatmentsForm.noTreatmentReason === reason ? "border-amber-500 bg-amber-200" : "border-amber-200 bg-white"}`}
          >
            {reason}
          </button>
        ))}
      </div>
      {treatmentsForm.noTreatmentReason === "Other" && (
        <Area
          className="mt-3"
          label="Explanation"
          value={treatmentsForm.noTreatmentExplanation}
          onChange={(value) =>
            setTreatmentsForm((current) => ({
              ...current,
              noTreatmentExplanation: value,
            }))
          }
        />
      )}
    </div>
  );
}
