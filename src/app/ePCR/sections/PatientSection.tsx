'use client';

import { Dispatch, SetStateAction, useState } from 'react';
import PCRCard from '../components/PCRCard';
import type { CallForm, PatientForm } from '../types';
import { calculatePatientAge } from '../utils';

const genderOptions = ['Male', 'Female', 'Undetermined'];

const codeStatusOptions = [
  'Full Code',
  'Do Not Resuscitate',
  'Limited Interventions',
  'Comfort Measures Only',
  'Unknown',
];

const raceOptions = [
  'American Indian or Alaska Native',
  'Asian',
  'Black or African American',
  'Native Hawaiian or Other Pacific Islander',
  'White',
  'Other Race',
  'Unable to Determine',
];

const patientEffectsLeftWithOptions = [
  'At Destination with Patient',
  "At Destination with Patient's Family",
  'At Destination with Staff',
  "At Incident Location with Patient's Family",
  'At Incident Location with Law Enforcement',
  'Other Responding Agency',
];

const dispositionOptions = [
  'Transported',
  'RMCT',
  'Obvious Death',
  'Death Pronounced at Scene',
  'Turnover Patient Care at Scene',
  'Canceled by Other Agency at Scene',
];

const transportedToOptions = [
  'AMC Bakersfield',
  'AMC Hanford',
  'AMC Reedley',
  'AMC Selma',
  'AMC Tulare',
  'Clovis Community Medical Center',
  'Community Regional Medical Center',
  'CSC Adult',
  'CSC Youth',
  'Doctors Medical Center',
  'Emanuel Medical Center',
  'John C. Fremont Hospital',
  'Kaiser Permanente Modesto Medical Center',
  'Kaweah Health Medical Center',
  'Madera Community Hospital',
  'Memorial Hospital Los Banos',
  'Memorial Medical Center',
  'Merced College Hospital',
  'Mercy Medical Center Merced',
  'Saint Agnes Medical Center',
  'Sierra View Medical Center',
  'VA Medical Center',
  'Valley Children’s Hospital',
];

const refusalTypeOptions = [
  'Refused All Assessment and Treatment',
  'Refused Assessment',
  'Refused Specific Treatment',
  'Refused Ambulance Transport',
  'Refused Recommended Destination',
  'Refused After Receiving Treatment',
  'Refused Against Medical Advice',
];

const obviousDeathCriteriaOptions = [
  'Advanced Decomposition',
  'Decapitation',
  'Incineration',
  'Injuries Incompatible With Life',
  'Massive Destruction of the Brain',
  'Massive Destruction of the Heart or Thorax',
  'Rigor Mortis',
  'Transection of the Torso',
  'Other Obvious Death Finding',
];

const basisForPronouncementOptions = [
  'Obvious Death Criteria Met',
  'Resuscitation Attempted and Terminated',
  'Valid DNR/POLST Honored',
  'Hospice or Comfort-Care Patient',
  'Medical-Control Order',
  'Other',
];

const turnoverExplanationOptions = [
  'Care Transferred to ALS Ambulance',
  'Care Transferred to BLS Ambulance',
  'Care Transferred to Critical Care Transport Team',
  'Care Transferred to Fire Department Personnel',
  'Care Transferred to Flight Medical Crew',
  'Care Transferred to Law Enforcement',
  'Care Transferred to Another EMS Agency',
  'Care Transferred to Another Unit From the Same Agency',
  'Care Transferred to On-Scene Healthcare Provider',
  'Care Transferred to Specialty Response Team',
  'Other Authorized Transfer of Care',
];

const canceledExplanationOptions = [
  'Another EMS Unit Handling the Patient',
  'EMS Evaluation Not Requested',
  'False or Accidental Activation',
  'Incident Resolved Before EMS Arrival',
  'No Patient Found',
  'No Reported Injury or Illness',
  'Patient Left Before EMS Arrival',
  'Request Was a Duplicate Assignment',
  'Scene Determined Safe With No EMS Need',
  'Standby Assignment Completed',
  'Transporting Unit Already on Scene',
  'Unable to Locate Reported Incident',
  'Other',
];

type PatientSectionProps = {
  patientForm: PatientForm;
  callForm: CallForm;
  setPatientForm: Dispatch<SetStateAction<PatientForm>>;
  updatePatientForm: (
    field: keyof PatientForm,
    value: string | boolean,
  ) => void;
};

function normalizeDateInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 8);

  if (digits.length <= 2) {
    return digits;
  }

  if (digits.length <= 4) {
    return `${digits.slice(0, 2)}/${digits.slice(2)}`;
  }

  return `${digits.slice(0, 2)}/${digits.slice(2, 4)}/${digits.slice(4)}`;
}

function normalizePhoneInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 10);

  if (digits.length <= 3) {
    return digits ? `(${digits}` : '';
  }

  if (digits.length <= 6) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  }

  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

function normalizeSsnInput(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 9);

  if (digits.length <= 3) {
    return digits;
  }

  if (digits.length <= 5) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function UnableButton({
  active,
  onClick,
}: {
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`mt-2 rounded-lg border px-3 py-1 text-xs font-semibold ${
        active
          ? 'border-slate-900 bg-slate-900 text-white'
          : 'border-slate-300 bg-white text-slate-700'
      }`}
    >
      Unable to Complete
    </button>
  );
}

function OutcomeSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
      >
        <option value=""></option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

export default function PatientSection({
  patientForm,
  callForm,
  setPatientForm,
  updatePatientForm,
}: PatientSectionProps) {
  const [expandedCard, setExpandedCard] = useState('');

  function toggleCard(cardTitle: string) {
    setExpandedCard((current) => (current === cardTitle ? '' : cardTitle));
  }

  const calculatedAge = calculatePatientAge(patientForm.dateOfBirth);

  const totalHeightInches = Number(patientForm.heightInches) || 0;

  const heightFeet = patientForm.heightInches
    ? String(Math.floor(totalHeightInches / 12))
    : '';

  const heightRemainingInches = patientForm.heightInches
    ? String(totalHeightInches % 12)
    : '';

  const calculatedWeightKilograms = patientForm.weightPounds
    ? (Number(patientForm.weightPounds) * 0.45359237).toFixed(1)
    : '';

  const demographicsFields = [
    patientForm.unablePatientName
      ? 'unable'
      : patientForm.firstName && patientForm.lastName,
    patientForm.unableDateOfBirth ? 'unable' : patientForm.dateOfBirth,
    patientForm.unableAge ? 'unable' : calculatedAge,
    patientForm.unablePatientAddress
      ? 'unable'
      : patientForm.patientStreet && patientForm.patientCity && patientForm.patientZip,
    patientForm.unableGender ? 'unable' : patientForm.gender,
    patientForm.heightInches,
    patientForm.weightPounds,
    patientForm.unablePhoneNumber ? 'unable' : patientForm.phoneNumber,
    patientForm.unableSocialSecurityNumber
      ? 'unable'
      : patientForm.socialSecurityNumber,
    patientForm.unableRace ? 'unable' : patientForm.race,
  ];

  const medicalFields = [
    patientForm.medicalHistory,
    patientForm.surgicalHistory,
    patientForm.currentMedications,
    patientForm.lastOralIntake,
    patientForm.codeStatus,
  ];

  const allergyFields = [
    patientForm.medicationAllergies,
    patientForm.environmentalAllergies,
  ];

  const nkdaSelected =
    patientForm.medicationAllergies.trim().toUpperCase() === 'NKDA';

  const noEnvironmentalAllergiesSelected =
    patientForm.environmentalAllergies.trim().toUpperCase() ===
    'NO ENVIRONMENTAL ALLERGIES';

  const belongingsFields = [
    patientForm.patientEffects,
    patientForm.patientEffectsLeftWith,
    ...(patientForm.patientEffectsLeftWith === 'Other Responding Agency'
      ? [patientForm.patientEffectsLeftWithOther]
      : []),
  ];

  const outcomeFields = [
    patientForm.disposition,
    ...(patientForm.disposition === 'Transported'
      ? [patientForm.transportedTo]
      : []),
    ...(patientForm.disposition === 'RMCT'
      ? [patientForm.refusalType]
      : []),
    ...(patientForm.disposition === 'Obvious Death'
      ? [patientForm.obviousDeathCriteria]
      : []),
    ...(patientForm.disposition === 'Death Pronounced at Scene'
      ? [patientForm.basisForPronouncement]
      : []),
    ...(patientForm.disposition === 'Turnover Patient Care at Scene' ||
    patientForm.disposition === 'Canceled by Other Agency at Scene'
      ? [patientForm.dispositionExplanation]
      : []),
  ];

  function copyIncidentAddress() {
    setPatientForm((current) => ({
      ...current,
      patientStreet: callForm.incidentStreet,
      patientApartment: callForm.incidentApartment,
      patientCity: callForm.incidentCity,
      patientZip: callForm.incidentZip,
      unablePatientAddress: false,
    }));
  }

  function toggleNkda() {
    setPatientForm((current) => ({
      ...current,
      medicationAllergies: nkdaSelected ? '' : 'NKDA',
    }));
  }

  function toggleNoEnvironmentalAllergies() {
    setPatientForm((current) => ({
      ...current,
      environmentalAllergies: noEnvironmentalAllergiesSelected
        ? ''
        : 'No Environmental Allergies',
    }));
  }

  function updateAllergy(
    field: 'medicationAllergies' | 'environmentalAllergies',
    value: string,
  ) {
    updatePatientForm(field, value);
  }

  function updateDisposition(value: string) {
    setPatientForm((current) => ({
      ...current,
      disposition: value,
      transportedTo: '',
      refusalType: '',
      obviousDeathCriteria: '',
      basisForPronouncement: '',
      dispositionExplanation: '',
    }));
  }

  return (
    <div className="space-y-4">
      <PCRCard
        title="Patient Demographics"
        completedFields={demographicsFields.filter(Boolean).length}
        totalFields={demographicsFields.length}
        expanded={expandedCard === 'Patient Demographics'}
        onToggle={() => toggleCard('Patient Demographics')}
      >
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-3">
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ['First Name', 'firstName'],
                ['MI', 'middleInitial'],
                ['Last Name', 'lastName'],
              ].map(([label, field]) => (
                <label key={field} className="block">
                  <span className="mb-1 block text-sm font-semibold text-slate-700">
                    {label}
                  </span>
                  <input
                    type="text"
                    value={patientForm[field as 'firstName' | 'middleInitial' | 'lastName']}
                    maxLength={field === 'middleInitial' ? 1 : undefined}
                    disabled={patientForm.unablePatientName}
                    onChange={(event) =>
                      updatePatientForm(
                        field as 'firstName' | 'middleInitial' | 'lastName',
                        event.target.value,
                      )
                    }
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm disabled:bg-slate-100"
                  />
                </label>
              ))}
            </div>
            <UnableButton
              active={patientForm.unablePatientName}
              onClick={() =>
                updatePatientForm(
                  'unablePatientName',
                  !patientForm.unablePatientName,
                )
              }
            />
          </div>

          <div>
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Date of Birth
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={patientForm.dateOfBirth}
              disabled={patientForm.unableDateOfBirth}
              onChange={(event) =>
                updatePatientForm(
                  'dateOfBirth',
                  normalizeDateInput(event.target.value),
                )
              }
              maxLength={10}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm disabled:bg-slate-100"
            />
            <UnableButton
              active={patientForm.unableDateOfBirth}
              onClick={() =>
                updatePatientForm(
                  'unableDateOfBirth',
                  !patientForm.unableDateOfBirth,
                )
              }
            />
          </div>

          <div>
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Age
            </span>
            <input
              type="text"
              value={patientForm.unableAge ? '' : calculatedAge}
              readOnly
              disabled={patientForm.unableAge}
              className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-slate-700 shadow-sm"
            />
            <UnableButton
              active={patientForm.unableAge}
              onClick={() =>
                updatePatientForm('unableAge', !patientForm.unableAge)
              }
            />
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Gender
            </span>
            <select
              value={patientForm.gender}
              disabled={patientForm.unableGender}
              onChange={(event) =>
                updatePatientForm('gender', event.target.value)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm disabled:bg-slate-100"
            >
              <option value=""></option>
              {genderOptions.map((gender) => (
                <option key={gender} value={gender}>
                  {gender}
                </option>
              ))}
            </select>
            <UnableButton
              active={patientForm.unableGender}
              onClick={() =>
                updatePatientForm('unableGender', !patientForm.unableGender)
              }
            />
          </label>

          <div className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Height
            </span>

            <div className="grid grid-cols-2 gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-500">
                  Feet
                </span>

                <input
                  type="text"
                  inputMode="numeric"
                  value={heightFeet}
                  onChange={(event) => {
                    const feet = event.target.value
                      .replace(/\D/g, '')
                      .slice(0, 1);

                    const nextTotalInches =
                      (Number(feet) || 0) * 12 +
                      (Number(heightRemainingInches) || 0);

                    updatePatientForm(
                      'heightInches',
                      feet || heightRemainingInches
                        ? String(nextTotalInches)
                        : '',
                    );
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
                />
              </label>

              <label className="block">
                <span className="mb-1 block text-xs font-semibold text-slate-500">
                  Inches
                </span>

                <input
                  type="text"
                  inputMode="numeric"
                  value={heightRemainingInches}
                  onChange={(event) => {
                    const rawInches = event.target.value
                      .replace(/\D/g, '')
                      .slice(0, 2);

                    const inches = Math.min(
                      Number(rawInches) || 0,
                      11,
                    );

                    const nextTotalInches =
                      (Number(heightFeet) || 0) * 12 +
                      inches;

                    updatePatientForm(
                      'heightInches',
                      heightFeet || rawInches
                        ? String(nextTotalInches)
                        : '',
                    );
                  }}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
                />
              </label>
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Weight (pounds)
            </span>

            <input
              type="text"
              inputMode="decimal"
              value={patientForm.weightPounds}
              onChange={(event) =>
                updatePatientForm(
                  'weightPounds',
                  event.target.value
                    .replace(/[^0-9.]/g, '')
                    .replace(/(\..*)\./g, '$1'),
                )
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Weight (kilograms)
            </span>

            <input
              type="text"
              value={calculatedWeightKilograms}
              readOnly
              className="w-full rounded-lg border border-slate-300 bg-slate-100 px-3 py-2 text-slate-700 shadow-sm"
            />
          </label>

          <div className="md:col-span-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <span className="block text-sm font-semibold text-slate-700">
                Patient Address
              </span>
              <button
                type="button"
                onClick={copyIncidentAddress}
                disabled={patientForm.unablePatientAddress}
                className="rounded-lg border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 disabled:bg-slate-100"
              >
                Same as Incident Address
              </button>
            </div>

            <div className="grid gap-3 md:grid-cols-4">
              <input
                type="text"
                value={patientForm.patientStreet}
                disabled={patientForm.unablePatientAddress}
                onChange={(event) =>
                  updatePatientForm('patientStreet', event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm disabled:bg-slate-100 md:col-span-2"
              />
              <input
                type="text"
                value={patientForm.patientApartment}
                disabled={patientForm.unablePatientAddress}
                onChange={(event) =>
                  updatePatientForm('patientApartment', event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm disabled:bg-slate-100"
              />
              <input
                type="text"
                value={patientForm.patientCity}
                disabled={patientForm.unablePatientAddress}
                onChange={(event) =>
                  updatePatientForm('patientCity', event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm disabled:bg-slate-100"
              />
              <input
                type="text"
                inputMode="numeric"
                value={patientForm.patientZip}
                disabled={patientForm.unablePatientAddress}
                onChange={(event) =>
                  updatePatientForm(
                    'patientZip',
                    event.target.value.replace(/\D/g, '').slice(0, 5),
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm disabled:bg-slate-100"
              />
            </div>
            <UnableButton
              active={patientForm.unablePatientAddress}
              onClick={() =>
                updatePatientForm(
                  'unablePatientAddress',
                  !patientForm.unablePatientAddress,
                )
              }
            />
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Phone Number
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={patientForm.phoneNumber}
              disabled={patientForm.unablePhoneNumber}
              onChange={(event) =>
                updatePatientForm(
                  'phoneNumber',
                  normalizePhoneInput(event.target.value),
                )
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm disabled:bg-slate-100"
            />
            <UnableButton
              active={patientForm.unablePhoneNumber}
              onClick={() =>
                updatePatientForm(
                  'unablePhoneNumber',
                  !patientForm.unablePhoneNumber,
                )
              }
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Social Security Number
            </span>
            <input
              type="text"
              inputMode="numeric"
              value={patientForm.socialSecurityNumber}
              disabled={patientForm.unableSocialSecurityNumber}
              onChange={(event) =>
                updatePatientForm(
                  'socialSecurityNumber',
                  normalizeSsnInput(event.target.value),
                )
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm disabled:bg-slate-100"
            />
            <UnableButton
              active={patientForm.unableSocialSecurityNumber}
              onClick={() =>
                updatePatientForm(
                  'unableSocialSecurityNumber',
                  !patientForm.unableSocialSecurityNumber,
                )
              }
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Race
            </span>
            <select
              value={patientForm.race}
              disabled={patientForm.unableRace}
              onChange={(event) => updatePatientForm('race', event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm disabled:bg-slate-100"
            >
              <option value=""></option>
              {raceOptions.map((race) => (
                <option key={race} value={race}>
                  {race}
                </option>
              ))}
            </select>
            <UnableButton
              active={patientForm.unableRace}
              onClick={() =>
                updatePatientForm('unableRace', !patientForm.unableRace)
              }
            />
          </label>
        </div>
      </PCRCard>

      <PCRCard
        title="Medical Information"
        completedFields={medicalFields.filter(Boolean).length}
        totalFields={medicalFields.length}
        expanded={expandedCard === 'Medical Information'}
        onToggle={() => toggleCard('Medical Information')}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Code Status
            </span>

            <select
              value={patientForm.codeStatus}
              onChange={(event) =>
                updatePatientForm('codeStatus', event.target.value)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
            >
              <option value=""></option>

              {codeStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </label>

          {([
            ['medicalHistory', 'Medical History'],
            ['surgicalHistory', 'Surgical History'],
            ['currentMedications', 'Current Medications'],
          ] satisfies [keyof PatientForm, string][]).map(([field, label]) => (
            <label key={field} className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                {label}
              </span>
              <textarea
                value={patientForm[field as keyof PatientForm] as string}
                onChange={(event) =>
                  updatePatientForm(
                    field as keyof PatientForm,
                    event.target.value,
                  )
                }
                className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
              />
            </label>
          ))}

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Last Oral Intake
            </span>
            <input
              type="datetime-local"
              value={patientForm.lastOralIntake}
              onChange={(event) =>
                updatePatientForm('lastOralIntake', event.target.value)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
            />
          </label>
        </div>
      </PCRCard>

      <PCRCard
        title="Allergies"
        completedFields={allergyFields.filter(Boolean).length}
        totalFields={allergyFields.length}
        expanded={expandedCard === 'Allergies'}
        onToggle={() => toggleCard('Allergies')}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Medication Allergies
            </span>
            <button
              type="button"
              aria-pressed={nkdaSelected}
              onClick={toggleNkda}
              className={`mb-2 w-full rounded-xl border px-4 py-3 text-sm font-bold transition ${
                nkdaSelected
                  ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-500 hover:bg-emerald-100'
              }`}
            >
              {nkdaSelected
                ? '✓ NKDA — No Known Drug Allergies'
                : 'NKDA — No Known Drug Allergies'}
            </button>
            <textarea
              value={patientForm.medicationAllergies}
              onChange={(event) =>
                updateAllergy('medicationAllergies', event.target.value)
              }
              className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
            />
            <p className="mt-2 text-xs text-slate-500">
              Entering a medication allergy replaces this selection.
            </p>
          </div>

          <div>
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Environmental Allergies
            </span>
            <button
              type="button"
              aria-pressed={noEnvironmentalAllergiesSelected}
              onClick={toggleNoEnvironmentalAllergies}
              className={`mb-2 w-full rounded-xl border px-4 py-3 text-sm font-bold transition ${
                noEnvironmentalAllergiesSelected
                  ? 'border-emerald-700 bg-emerald-700 text-white shadow-sm'
                  : 'border-emerald-300 bg-emerald-50 text-emerald-800 hover:border-emerald-500 hover:bg-emerald-100'
              }`}
            >
              {noEnvironmentalAllergiesSelected
                ? '✓ No Environmental Allergies'
                : 'No Environmental Allergies'}
            </button>
            <textarea
              value={patientForm.environmentalAllergies}
              onChange={(event) =>
                updateAllergy('environmentalAllergies', event.target.value)
              }
              className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
            />
            <p className="mt-2 text-xs text-slate-500">
              Entering an environmental allergy replaces this selection.
            </p>
          </div>
        </div>
      </PCRCard>

      <PCRCard
        title="Patient Belongings"
        completedFields={belongingsFields.filter(Boolean).length}
        totalFields={belongingsFields.length}
        expanded={expandedCard === 'Patient Belongings'}
        onToggle={() => toggleCard('Patient Belongings')}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Patient&apos;s Effects
            </span>
            <textarea
              value={patientForm.patientEffects}
              onChange={(event) =>
                updatePatientForm('patientEffects', event.target.value)
              }
              className="min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Patient&apos;s Effects Left With
            </span>
            <select
              value={patientForm.patientEffectsLeftWith}
              onChange={(event) =>
                updatePatientForm('patientEffectsLeftWith', event.target.value)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
            >
              <option value=""></option>
              {patientEffectsLeftWithOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>

            {patientForm.patientEffectsLeftWith ===
              'Other Responding Agency' && (
              <div className="mt-3">
                <span className="mb-1 block text-sm font-semibold text-slate-700">
                  Other Responding Agency Explanation
                </span>
                <input
                  type="text"
                  value={patientForm.patientEffectsLeftWithOther}
                  onChange={(event) =>
                    updatePatientForm(
                      'patientEffectsLeftWithOther',
                      event.target.value,
                    )
                  }
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
                />
              </div>
            )}
          </label>
        </div>
      </PCRCard>

      <PCRCard
        title="Patient Outcome"
        completedFields={outcomeFields.filter(Boolean).length}
        totalFields={outcomeFields.length}
        expanded={expandedCard === 'Patient Outcome'}
        onToggle={() => toggleCard('Patient Outcome')}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Disposition
            </span>
            <select
              value={patientForm.disposition}
              onChange={(event) => updateDisposition(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
            >
              <option value=""></option>
              {dispositionOptions.map((disposition) => (
                <option key={disposition} value={disposition}>
                  {disposition}
                </option>
              ))}
            </select>
          </label>

          {patientForm.disposition === 'Transported' && (
            <OutcomeSelect
              label="Transported To"
              value={patientForm.transportedTo}
              options={transportedToOptions}
              onChange={(value) => updatePatientForm('transportedTo', value)}
            />
          )}

          {patientForm.disposition === 'RMCT' && (
            <OutcomeSelect
              label="Refusal Type"
              value={patientForm.refusalType}
              options={refusalTypeOptions}
              onChange={(value) => updatePatientForm('refusalType', value)}
            />
          )}

          {patientForm.disposition === 'Obvious Death' && (
            <OutcomeSelect
              label="Criteria"
              value={patientForm.obviousDeathCriteria}
              options={obviousDeathCriteriaOptions}
              onChange={(value) =>
                updatePatientForm('obviousDeathCriteria', value)
              }
            />
          )}

          {patientForm.disposition === 'Death Pronounced at Scene' && (
            <OutcomeSelect
              label="Basis for Pronouncement"
              value={patientForm.basisForPronouncement}
              options={basisForPronouncementOptions}
              onChange={(value) =>
                updatePatientForm('basisForPronouncement', value)
              }
            />
          )}

          {(patientForm.disposition === 'Turnover Patient Care at Scene' ||
            patientForm.disposition ===
              'Canceled by Other Agency at Scene') && (
            <OutcomeSelect
              label="Disposition Explanation"
              value={patientForm.dispositionExplanation}
              options={
                patientForm.disposition === 'Turnover Patient Care at Scene'
                  ? turnoverExplanationOptions
                  : canceledExplanationOptions
              }
              onChange={(value) =>
                updatePatientForm('dispositionExplanation', value)
              }
            />
          )}
        </div>
      </PCRCard>
    </div>
  );
}
