'use client';

import { useState } from 'react';
import PCRCard from '../components/PCRCard';
import ClinicalCategoryPicker from '../clinical/components/ClinicalCategoryPicker';
import ClinicalCombobox from '../clinical/components/ClinicalCombobox';
import type { CodedSelection, ComplaintForm } from '../types';
import { commonDrugOptions } from '../reference/drugs';

const acuityOptions = [
  'Non STAT Medical',
  'Non STAT Trauma',
  'STAT Medical',
  'STAT Trauma',
  'Cardiac Arrest',
  'Death',
];

const yesNoOptions = ['Yes', 'No'];

const cardiacArrestOptions = [
  'Yes, After EMS Contact',
  'Yes, Prior to EMS Contact',
  'No',
];

const strokeResolvedOptions = [
  'No',
  'Yes, Prior to EMS Contact',
  'Yes, During EMS Contact',
];

const drugAlcoholIndicationOptions = [
  'Containers/Paraphernalia at Scene',
  'Drug Paraphernalia at Scene',
  'Patients Admitted to Alcohol Use',
  'Patients Admitted to Drug Use',
  'Smell of Alcohol on Breath',
  'Information Provided by Law Enforcement or Other Qualified Personnel',
];

const workRelatedOptions = ['Yes', 'No', 'Unknown'];

type ComplaintSectionProps = {
  complaintForm: ComplaintForm;
  updateComplaintForm: (
    field: keyof ComplaintForm,
    value: string | string[] | CodedSelection | CodedSelection[] | null,
  ) => void;
};

function toggleStringSelection(current: string[], value: string) {
  return current.includes(value)
    ? current.filter((item) => item !== value)
    : [...current, value];
}

function toggleCodedSelection(current: CodedSelection[], value: CodedSelection) {
  return current.some((item) => item.code === value.code)
    ? current.filter((item) => item.code !== value.code)
    : [...current, value];
}

function normalizeClinicalDescription(value: string) {
  return value.trim().toLowerCase();
}

function codedSelectionsMatch(
  left: CodedSelection | null,
  right: CodedSelection | null,
) {
  if (!left || !right) return false;

  if (left.code && right.code) {
    return left.code === right.code;
  }

  return (
    normalizeClinicalDescription(left.description) ===
    normalizeClinicalDescription(right.description)
  );
}

export default function ComplaintSection({
  complaintForm,
  updateComplaintForm,
}: ComplaintSectionProps) {
  const [expandedCard, setExpandedCard] = useState('Chief Complaint & History');
  const [associatedSymptomDraft, setAssociatedSymptomDraft] =
    useState<CodedSelection | null>(null);

  function toggleCard(cardTitle: string) {
    setExpandedCard((current) => (current === cardTitle ? '' : cardTitle));
  }

  const complaintFields = [
    complaintForm.chiefComplaint,
    complaintForm.clinicalCategory,
    complaintForm.primaryImpression,
    complaintForm.secondaryImpression,
    complaintForm.primarySymptom,
    complaintForm.otherAssociatedSymptoms.length > 0 ? 'selected' : '',
    complaintForm.symptomsBeganDateTime,
    complaintForm.lastSeenNormalDateTime,
  ];

  const circumstancesFields = [
    complaintForm.patientAcuity,
    complaintForm.possibleInjuryTrauma,
    complaintForm.cardiacArrest,
    complaintForm.suspectedStrokeCva,
    ...(complaintForm.suspectedStrokeCva === 'Yes'
      ? [complaintForm.strokeCvaSymptomsResolved]
      : []),
    complaintForm.patientPlacedOn5150Hold,
    complaintForm.possibleDrugAlcoholUse,
    ...(complaintForm.possibleDrugAlcoholUse === 'Yes'
      ? [complaintForm.drugAlcoholIndications.length > 0 ? 'selected' : '']
      : []),
    ...(complaintForm.drugAlcoholIndications.some((item) =>
      item.toLowerCase().includes('drug'),
    )
      ? [complaintForm.suspectedDrug]
      : []),
    complaintForm.workRelatedIllnessInjury,
  ];

  function handleAcuityChange(value: string) {
    const isTrauma = value === 'Non STAT Trauma' || value === 'STAT Trauma';
    const isCardiacArrest = value === 'Cardiac Arrest';

    updateComplaintForm('patientAcuity', value);
    updateComplaintForm('possibleInjuryTrauma', isTrauma ? 'Yes' : '');
    updateComplaintForm(
      'cardiacArrest',
      isCardiacArrest ? 'Yes, Prior to EMS Contact' : '',
    );
  }

  const drugIndicationSelected = complaintForm.drugAlcoholIndications.some(
    (item) => item.toLowerCase().includes('drug'),
  );

  return (
    <div className="space-y-4">
      <PCRCard
        title="Chief Complaint & History"
        completedFields={complaintFields.filter(Boolean).length}
        totalFields={complaintFields.length}
        expanded={expandedCard === 'Chief Complaint & History'}
        onToggle={() => toggleCard('Chief Complaint & History')}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block md:col-span-2">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Chief Complaint
            </span>

            <input
              type="text"
              value={complaintForm.chiefComplaint}
              onChange={(event) =>
                updateComplaintForm(
                  'chiefComplaint',
                  event.target.value,
                )
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
            />
          </label>

          <ClinicalCategoryPicker
            label="Clinical Category"
            listType="impression"
            value={complaintForm.clinicalCategory}
            onChange={(value) => {
              updateComplaintForm('clinicalCategory', value);
              updateComplaintForm('primaryImpression', null);
              updateComplaintForm('secondaryImpression', null);
              updateComplaintForm('primarySymptom', null);
              updateComplaintForm('otherAssociatedSymptoms', []);
              setAssociatedSymptomDraft(null);
            }}
          />

          <ClinicalCombobox
            label="Clinical Differential"
            listType="impression"
            category={complaintForm.clinicalCategory}
            value={complaintForm.primaryImpression}
            excludedValues={
              complaintForm.secondaryImpression
                ? [complaintForm.secondaryImpression]
                : []
            }
            onChange={(value) => {
              updateComplaintForm('primaryImpression', value);

              if (
                codedSelectionsMatch(
                  value,
                  complaintForm.secondaryImpression,
                )
              ) {
                updateComplaintForm('secondaryImpression', null);
              }
            }}
          />

          <ClinicalCombobox
            label="Secondary Differential"
            listType="impression"
            category={complaintForm.clinicalCategory}
            value={complaintForm.secondaryImpression}
            excludedValues={
              complaintForm.primaryImpression
                ? [complaintForm.primaryImpression]
                : []
            }
            onChange={(value) => {
              updateComplaintForm('secondaryImpression', value);

              if (
                codedSelectionsMatch(
                  value,
                  complaintForm.primaryImpression,
                )
              ) {
                updateComplaintForm('primaryImpression', null);
              }
            }}
          />

          <ClinicalCombobox
            label="Primary Symptom"
            listType="symptom"
            category={complaintForm.clinicalCategory}
            value={complaintForm.primarySymptom}
            excludedValues={complaintForm.otherAssociatedSymptoms}
            onChange={(value) => {
              updateComplaintForm('primarySymptom', value);

              if (value) {
                updateComplaintForm(
                  'otherAssociatedSymptoms',
                  complaintForm.otherAssociatedSymptoms.filter(
                    (symptom) => !codedSelectionsMatch(symptom, value),
                  ),
                );

                if (codedSelectionsMatch(associatedSymptomDraft, value)) {
                  setAssociatedSymptomDraft(null);
                }
              }
            }}
          />

          <div className="md:col-span-2">
            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
              <ClinicalCombobox
                label="Associated Symptom"
                listType="symptom"
                category={complaintForm.clinicalCategory}
                value={associatedSymptomDraft}
                excludedValues={[
                  ...(complaintForm.primarySymptom
                    ? [complaintForm.primarySymptom]
                    : []),
                  ...complaintForm.otherAssociatedSymptoms,
                ]}
                onChange={setAssociatedSymptomDraft}
              />

              <button
                type="button"
                disabled={!associatedSymptomDraft}
                onClick={() => {
                  if (!associatedSymptomDraft) return;

                  const alreadySelected =
                    complaintForm.otherAssociatedSymptoms.some((symptom) =>
                      codedSelectionsMatch(
                        symptom,
                        associatedSymptomDraft,
                      ),
                    );

                  if (!alreadySelected) {
                    updateComplaintForm('otherAssociatedSymptoms', [
                      ...complaintForm.otherAssociatedSymptoms,
                      associatedSymptomDraft,
                    ]);
                  }

                  setAssociatedSymptomDraft(null);
                }}
                className="rounded-lg border border-slate-900 bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm disabled:cursor-not-allowed disabled:border-slate-300 disabled:bg-slate-200 disabled:text-slate-500"
              >
                Add Associated Symptom
              </button>
            </div>

            {complaintForm.otherAssociatedSymptoms.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {complaintForm.otherAssociatedSymptoms.map((symptom) => (
                  <button
                    key={symptom.code}
                    type="button"
                    onClick={() =>
                      updateComplaintForm(
                        'otherAssociatedSymptoms',
                        complaintForm.otherAssociatedSymptoms.filter(
                          (item) => !codedSelectionsMatch(item, symptom),
                        ),
                      )
                    }
                    className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50"
                    title={`Remove ${symptom.description}`}
                  >
                    {symptom.description}
                    <span className="ml-2 text-slate-400">×</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Symptom Onset
            </span>
            <input
              type="datetime-local"
              value={complaintForm.symptomsBeganDateTime}
              onChange={(event) =>
                updateComplaintForm(
                  'symptomsBeganDateTime',
                  event.target.value,
                )
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Last Known Well
            </span>
            <input
              type="datetime-local"
              value={complaintForm.lastSeenNormalDateTime}
              onChange={(event) =>
                updateComplaintForm(
                  'lastSeenNormalDateTime',
                  event.target.value,
                )
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
            />
          </label>
        </div>
      </PCRCard>

      <PCRCard
        title="Circumstances"
        completedFields={circumstancesFields.filter(Boolean).length}
        totalFields={circumstancesFields.length}
        expanded={expandedCard === 'Circumstances'}
        onToggle={() => toggleCard('Circumstances')}
      >
        <div className="grid gap-5 md:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Patient Acuity
            </span>
            <select
              value={complaintForm.patientAcuity}
              onChange={(event) => handleAcuityChange(event.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
            >
              <option value=""></option>
              {acuityOptions.map((acuity) => (
                <option key={acuity} value={acuity}>
                  {acuity}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Possible Injury or Trauma
            </span>
            <select
              value={complaintForm.possibleInjuryTrauma}
              onChange={(event) =>
                updateComplaintForm('possibleInjuryTrauma', event.target.value)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
            >
              <option value=""></option>
              {yesNoOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Cardiac Arrest
            </span>
            <select
              value={complaintForm.cardiacArrest}
              onChange={(event) =>
                updateComplaintForm('cardiacArrest', event.target.value)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
            >
              <option value=""></option>
              {cardiacArrestOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Suspected Stroke/CVA
            </span>
            <select
              value={complaintForm.suspectedStrokeCva}
              onChange={(event) =>
                updateComplaintForm('suspectedStrokeCva', event.target.value)
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
            >
              <option value=""></option>
              {yesNoOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {complaintForm.suspectedStrokeCva === 'Yes' && (
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Stroke/CVA Symptoms Resolved
              </span>
              <select
                value={complaintForm.strokeCvaSymptomsResolved}
                onChange={(event) =>
                  updateComplaintForm(
                    'strokeCvaSymptomsResolved',
                    event.target.value,
                  )
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
              >
                <option value=""></option>
                {strokeResolvedOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Patient Placed on a 5150 Hold
            </span>
            <select
              value={complaintForm.patientPlacedOn5150Hold}
              onChange={(event) =>
                updateComplaintForm(
                  'patientPlacedOn5150Hold',
                  event.target.value,
                )
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
            >
              <option value=""></option>
              {yesNoOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Possible or Suspected Drug or Alcohol Use
            </span>
            <select
              value={complaintForm.possibleDrugAlcoholUse}
              onChange={(event) =>
                updateComplaintForm(
                  'possibleDrugAlcoholUse',
                  event.target.value,
                )
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
            >
              <option value=""></option>
              {yesNoOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>

          {complaintForm.possibleDrugAlcoholUse === 'Yes' && (
            <div className="md:col-span-2">
              <span className="mb-2 block text-sm font-semibold text-slate-700">
                Indications of Suspicion
              </span>
              <div className="flex flex-wrap gap-2">
                {drugAlcoholIndicationOptions.map((option) => {
                  const selected =
                    complaintForm.drugAlcoholIndications.includes(option);

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() =>
                        updateComplaintForm(
                          'drugAlcoholIndications',
                          toggleStringSelection(
                            complaintForm.drugAlcoholIndications,
                            option,
                          ),
                        )
                      }
                      className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
                        selected
                          ? 'border-slate-900 bg-slate-900 text-white'
                          : 'border-slate-300 bg-white text-slate-700'
                      }`}
                    >
                      {selected ? `✓ ${option}` : option}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {drugIndicationSelected && (
            <label className="block">
              <span className="mb-1 block text-sm font-semibold text-slate-700">
                Suspected Drug
              </span>
              <select
                value={complaintForm.suspectedDrug}
                onChange={(event) =>
                  updateComplaintForm('suspectedDrug', event.target.value)
                }
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
              >
                <option value=""></option>
                {commonDrugOptions.map((drug) => (
                  <option key={drug} value={drug}>
                    {drug}
                  </option>
                ))}
              </select>
            </label>
          )}

          <label className="block">
            <span className="mb-1 block text-sm font-semibold text-slate-700">
              Work Related Illness or Injury
            </span>
            <select
              value={complaintForm.workRelatedIllnessInjury}
              onChange={(event) =>
                updateComplaintForm(
                  'workRelatedIllnessInjury',
                  event.target.value,
                )
              }
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
            >
              <option value=""></option>
              {workRelatedOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        </div>
      </PCRCard>
    </div>
  );
}
