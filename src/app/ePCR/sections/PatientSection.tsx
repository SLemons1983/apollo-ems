'use client';

import { Dispatch, SetStateAction, useState } from 'react';
import PCRCard from '../components/PCRCard';
import type { CallForm, PatientForm } from '../types';
import { calculatePatientAge } from '../utils';

const genderOptions = ['Male', 'Female', 'Undetermined'];

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
  return value.replace(/\D/g, '').slice(0, 10);
}

function normalizeSsnInput(value: string) {
  return value.replace(/\D/g, '').slice(0, 9);
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

export default function PatientSection({
  patientForm,
  callForm,
  setPatientForm,
  updatePatientForm,
}: PatientSectionProps) {
  const [expandedCard, setExpandedCard] = useState('Patient Demographics');

  function toggleCard(cardTitle: string) {
    setExpandedCard((current) => (current === cardTitle ? '' : cardTitle));
  }

  const calculatedAge = calculatePatientAge(patientForm.dateOfBirth);

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
  ];

  const allergyFields = [
    patientForm.medicationAllergies,
    patientForm.environmentalAllergies,
  ];

  const belongingsFields = [
    patientForm.patientEffects,
    patientForm.patientEffectsLeftWith,
    ...(patientForm.patientEffectsLeftWith === 'Other Responding Agency'
      ? [patientForm.patientEffectsLeftWithOther]
      : []),
  ];

  const outcomeFields = [
    patientForm.disposition,
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
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Patient Name
            </span>
            <div className="grid gap-3 md:grid-cols-3">
              <input
                type="text"
                value={patientForm.firstName}
                disabled={patientForm.unablePatientName}
                onChange={(event) =>
                  updatePatientForm('firstName', event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm disabled:bg-slate-100"
              />
              <input
                type="text"
                value={patientForm.middleInitial}
                disabled={patientForm.unablePatientName}
                onChange={(event) =>
                  updatePatientForm('middleInitial', event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm disabled:bg-slate-100"
              />
              <input
                type="text"
                value={patientForm.lastName}
                disabled={patientForm.unablePatientName}
                onChange={(event) =>
                  updatePatientForm('lastName', event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm disabled:bg-slate-100"
              />
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
          {[
            ['medicalHistory', 'Medical History'],
            ['surgicalHistory', 'Surgical History'],
            ['currentMedications', 'Current Medications'],
            ['lastOralIntake', 'Last Oral Intake'],
          ].map(([field, label]) => (
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
          {[
            ['medicationAllergies', 'Medication Allergies'],
            ['environmentalAllergies', 'Environmental Allergies'],
          ].map(([field, label]) => (
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
              onChange={(event) =>
                updatePatientForm('disposition', event.target.value)
              }
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

          {(patientForm.disposition === 'Turnover Patient Care at Scene' ||
            patientForm.disposition ===
              'Canceled by Other Agency at Scene') && (
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Disposition Explanation
              </span>
              <input
                type="text"
                value={patientForm.dispositionExplanation}
                onChange={(event) =>
                  updatePatientForm(
                    'dispositionExplanation',
                    event.target.value,
                  )
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
              />
            </label>
          )}
        </div>
      </PCRCard>
    </div>
  );
}
