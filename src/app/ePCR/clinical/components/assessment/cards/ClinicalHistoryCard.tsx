'use client';

import type { PatientForm } from '../../../../types';

type ClinicalHistoryForm = {
  eventsLeadingToIllness: string;
  additionalHistoryNotes: string;
};

type EditablePatientHistoryField =
  | 'medicationAllergies'
  | 'environmentalAllergies'
  | 'currentMedications'
  | 'medicalHistory'
  | 'surgicalHistory'
  | 'lastOralIntake';

type ClinicalHistoryCardProps = {
  value: ClinicalHistoryForm;
  patientForm: PatientForm;
  onChange: (field: keyof ClinicalHistoryForm, value: string) => void;
  onPatientChange: (field: EditablePatientHistoryField, value: string) => void;
};

type HistoryFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  rows?: number;
  onChange: (value: string) => void;
  quickChoice?: {
    label: string;
    value: string;
  };
};

function HistoryField({
  label,
  value,
  placeholder,
  rows = 2,
  onChange,
  quickChoice,
}: HistoryFieldProps) {
  const isComplete = value.trim().length > 0;

  if (isComplete) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="mb-1 flex items-center justify-between gap-3">
          <h5 className="text-xs font-bold uppercase tracking-wide text-emerald-800">
            {label}
          </h5>
          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
            Documented
          </span>
        </div>
        <p className="whitespace-pre-wrap text-sm text-slate-800">{value}</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 p-4">
      <div className="mb-2 flex items-center justify-between gap-3">
        <h5 className="text-xs font-bold uppercase tracking-wide text-amber-900">
          {label}
        </h5>
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-bold text-amber-900">
          Missing
        </span>
      </div>

      {quickChoice ? (
        <button
          type="button"
          onClick={() => onChange(quickChoice.value)}
          className="mb-2 w-full rounded-lg border border-amber-400 bg-white px-3 py-2 text-sm font-bold text-amber-900 shadow-sm transition hover:bg-amber-100"
        >
          {quickChoice.label}
        </button>
      ) : null}

      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={rows}
        placeholder={placeholder}
        className="w-full rounded-lg border border-amber-300 bg-white px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400"
      />
    </div>
  );
}

export default function ClinicalHistoryCard({
  value,
  patientForm,
  onChange,
  onPatientChange,
}: ClinicalHistoryCardProps) {
  return (
    <div className="space-y-6">
      <div>
        <div className="mb-3">
          <h4 className="text-sm font-bold uppercase tracking-wide text-slate-700">
            Connected SAMPLE History
          </h4>
          <p className="mt-1 text-sm text-slate-600">
            Documented history is shown below. Only missing information requires entry,
            and changes update the Patient section automatically.
          </p>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 md:col-span-2">
            <div className="text-xs font-bold uppercase tracking-wide text-sky-800">
              Signs / Symptoms
            </div>
            <p className="mt-1 text-sm text-slate-800">
              Connected from the Complaint and focused Assessment workflows.
            </p>
          </div>

          <HistoryField
            label="Medication Allergies"
            value={patientForm.medicationAllergies}
            placeholder="Enter medication allergies"
            onChange={(nextValue) =>
              onPatientChange('medicationAllergies', nextValue)
            }
            quickChoice={{
              label: 'NKDA — No Known Drug Allergies',
              value: 'NKDA',
            }}
          />

          <HistoryField
            label="Environmental Allergies"
            value={patientForm.environmentalAllergies}
            placeholder="Enter environmental or food allergies"
            onChange={(nextValue) =>
              onPatientChange('environmentalAllergies', nextValue)
            }
            quickChoice={{
              label: 'No Environmental Allergies',
              value: 'No Environmental Allergies',
            }}
          />

          <HistoryField
            label="Current Medications"
            value={patientForm.currentMedications}
            placeholder="Enter current medications or document none"
            onChange={(nextValue) =>
              onPatientChange('currentMedications', nextValue)
            }
          />

          <HistoryField
            label="Medical History"
            value={patientForm.medicalHistory}
            placeholder="Enter pertinent medical history or document none"
            onChange={(nextValue) =>
              onPatientChange('medicalHistory', nextValue)
            }
          />

          <HistoryField
            label="Surgical History"
            value={patientForm.surgicalHistory}
            placeholder="Enter pertinent surgical history or document none"
            onChange={(nextValue) =>
              onPatientChange('surgicalHistory', nextValue)
            }
          />

          <HistoryField
            label="Last Oral Intake"
            value={patientForm.lastOralIntake}
            placeholder="Enter last oral intake or document unknown"
            onChange={(nextValue) =>
              onPatientChange('lastOralIntake', nextValue)
            }
          />
        </div>
      </div>

      <label className="block rounded-xl border border-slate-300 bg-white p-4">
        <span className="mb-1 block text-sm font-bold text-slate-800">
          Events Leading to Present Illness / Injury
        </span>
        <span className="mb-3 block text-sm text-slate-600">
          Briefly document what happened immediately before EMS was requested.
        </span>
        <textarea
          value={value.eventsLeadingToIllness}
          onChange={(event) =>
            onChange('eventsLeadingToIllness', event.target.value)
          }
          rows={3}
          placeholder="Example: Patient developed worsening shortness of breath while walking to the bathroom."
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm placeholder:text-slate-400"
        />
      </label>
    </div>
  );
}

export type { ClinicalHistoryForm, EditablePatientHistoryField };
