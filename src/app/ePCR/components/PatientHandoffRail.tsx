import type {
  CallForm,
  ComplaintForm,
  PatientForm,
} from '../types';
import { calculatePatientAge } from '../utils';

type PatientHandoffRailProps = {
  callForm: CallForm;
  patientForm: PatientForm;
  complaintForm: ComplaintForm;
};

function displayValue(
  value: string | null | undefined,
  fallback = 'Not documented',
) {
  const trimmedValue = value?.trim();

  return trimmedValue ? trimmedValue : fallback;
}

function formatPatientName(patientForm: PatientForm) {
  if (patientForm.unablePatientName) {
    return 'Unable to obtain';
  }

  const lastName = patientForm.lastName.trim();
  const firstName = patientForm.firstName.trim();
  const middleInitial = patientForm.middleInitial.trim();

  if (!lastName && !firstName && !middleInitial) {
    return 'Not documented';
  }

  const firstAndMiddle = [
    firstName,
    middleInitial
      ? `${middleInitial.replace(/\.$/, '')}.`
      : '',
  ]
    .filter(Boolean)
    .join(' ');

  if (lastName && firstAndMiddle) {
    return `${lastName}, ${firstAndMiddle}`;
  }

  return lastName || firstAndMiddle;
}

function formatPatientAge(patientForm: PatientForm) {
  if (patientForm.unableAge) {
    return 'Unable to obtain';
  }

  const calculatedAge = calculatePatientAge(
    patientForm.dateOfBirth,
  );

  return calculatedAge
    ? `${calculatedAge} Y`
    : 'Not documented';
}

function formatAllergies(patientForm: PatientForm) {
  const allergies = [
    patientForm.medicationAllergies.trim(),
    patientForm.environmentalAllergies.trim(),
  ].filter(Boolean);

  return allergies.length > 0
    ? allergies.join(' · ')
    : 'Not documented';
}

function formatHeight(heightInches: string) {
  const numericHeight = Number(heightInches);

  if (
    !heightInches.trim() ||
    !Number.isFinite(numericHeight) ||
    numericHeight <= 0
  ) {
    return 'Not documented';
  }

  const feet = Math.floor(numericHeight / 12);
  const inches = numericHeight % 12;

  return `${numericHeight} in (${feet} ft ${inches} in)`;
}

function formatWeight(weightPounds: string) {
  const numericWeight = Number(weightPounds);

  if (
    !weightPounds.trim() ||
    !Number.isFinite(numericWeight) ||
    numericWeight <= 0
  ) {
    return 'Not documented';
  }

  const kilograms = (
    numericWeight * 0.45359237
  ).toFixed(1);

  return `${numericWeight} lb (${kilograms} kg)`;
}

function HandoffField({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="border-b border-slate-200 py-2 last:border-b-0">
      <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-0.5 break-words text-sm font-bold text-slate-900">
        {value}
      </div>
    </div>
  );
}

function ScoreTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center">
      <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">
        {label}
      </div>

      <div className="mt-1 text-lg font-black text-slate-900">
        {value}
      </div>
    </div>
  );
}

export default function PatientHandoffRail({
  callForm,
  patientForm,
  complaintForm,
}: PatientHandoffRailProps) {
  return (
    <aside className="lg:sticky lg:top-4 lg:self-start">
      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
        <div className="border-b border-slate-300 bg-slate-900 px-4 py-3 text-white">
          <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-300">
            Patient Handoff
          </div>

          <div className="mt-1 text-lg font-black">
            Live Clinical Summary
          </div>
        </div>

        <div className="p-4">
          <div className="grid grid-cols-2 gap-x-4">
            <HandoffField
              label="Unit Number"
              value={displayValue(
                callForm.respondingUnitNumber,
              )}
            />

            <HandoffField
              label="EMS Number"
              value={displayValue(
                callForm.emsResponseNumber ||
                  callForm.emsIncidentNumber,
              )}
            />
          </div>

          <HandoffField
            label="Patient"
            value={formatPatientName(patientForm)}
          />

          <div className="grid grid-cols-2 gap-x-4">
            <HandoffField
              label="Age"
              value={formatPatientAge(patientForm)}
            />

            <HandoffField
              label="Sex"
              value={
                patientForm.unableGender
                  ? 'Unable to obtain'
                  : displayValue(patientForm.gender)
              }
            />
          </div>

          <HandoffField
            label="Chief Complaint"
            value={displayValue(
              complaintForm.chiefComplaint,
            )}
          />

          <HandoffField
            label="Allergies"
            value={formatAllergies(patientForm)}
          />

          <HandoffField
            label="Code Status"
            value={displayValue(patientForm.codeStatus)}
          />

          <div className="grid grid-cols-2 gap-x-4">
            <HandoffField
              label="Height"
              value={formatHeight(patientForm.heightInches)}
            />

            <HandoffField
              label="Weight"
              value={formatWeight(patientForm.weightPounds)}
            />
          </div>
        </div>

        <div className="border-t border-slate-300 bg-slate-50 p-4">
          <div className="mb-3 text-xs font-black uppercase tracking-wide text-slate-600">
            Clinical Scores
          </div>

          <div className="grid grid-cols-2 gap-2">
            <ScoreTile label="GCS" value="—" />
            <ScoreTile label="RTS" value="—" />
            <ScoreTile label="APGAR" value="—" />
            <ScoreTile label="Burn %" value="—" />
          </div>
        </div>

        <div className="border-t border-slate-300 p-4">
          <div className="mb-3 text-xs font-black uppercase tracking-wide text-slate-600">
            Last Set of Vitals
          </div>

          <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 px-3 py-4 text-center text-sm font-semibold text-slate-500">
            No vitals documented
          </div>
        </div>
      </div>
    </aside>
  );
}
