'use client';

import type { PatientForm } from '../../../../types';

type ClinicalHistoryForm = {
  eventsLeadingToIllness: string;
  additionalHistoryNotes: string;
};

type ClinicalHistoryCardProps = {
  value: ClinicalHistoryForm;
  patientForm: PatientForm;
  onChange: (field: keyof ClinicalHistoryForm, value: string) => void;
};

export default function ClinicalHistoryCard({
  value,
  patientForm,
  onChange,
}: ClinicalHistoryCardProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
        <h4 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-600">
          SAMPLE Imported From Patient Section
        </h4>

        <div className="grid gap-3 md:grid-cols-2">
          <div>
            <div className="text-xs font-bold uppercase text-slate-500">Signs / Symptoms</div>
            <p className="text-sm text-slate-800">Captured in Complaint and Assessment sections.</p>
          </div>

          <div>
            <div className="text-xs font-bold uppercase text-slate-500">Allergies</div>
            <p className="text-sm text-slate-800">Medication: {patientForm.medicationAllergies || 'Not documented'}</p>
            <p className="text-sm text-slate-800">Environmental: {patientForm.environmentalAllergies || 'Not documented'}</p>
          </div>

          <div>
            <div className="text-xs font-bold uppercase text-slate-500">Medications</div>
            <p className="text-sm text-slate-800">{patientForm.currentMedications || 'Not documented'}</p>
          </div>

          <div>
            <div className="text-xs font-bold uppercase text-slate-500">Past Medical / Surgical History</div>
            <p className="text-sm text-slate-800">Medical: {patientForm.medicalHistory || 'Not documented'}</p>
            <p className="text-sm text-slate-800">Surgical: {patientForm.surgicalHistory || 'Not documented'}</p>
          </div>

          <div>
            <div className="text-xs font-bold uppercase text-slate-500">Last Oral Intake</div>
            <p className="text-sm text-slate-800">{patientForm.lastOralIntake || 'Not documented'}</p>
          </div>
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-slate-700">
          Events Leading to Present Illness / Injury
        </span>
        <textarea
          value={value.eventsLeadingToIllness}
          onChange={(event) => onChange('eventsLeadingToIllness', event.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-slate-700">
          Additional History Notes
        </span>
        <textarea
          value={value.additionalHistoryNotes}
          onChange={(event) => onChange('additionalHistoryNotes', event.target.value)}
          rows={3}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
        />
      </label>
    </div>
  );
}

export type { ClinicalHistoryForm };
