'use client';

import { ChangeEvent, useMemo, useRef, useState } from 'react';
import PCRProgress from './PCRProgress';
import PCRSection from './PCRSection';
import CallSection from '../sections/CallSection';
import ComplaintSection from '../sections/ComplaintSection';
import PatientSection from '../sections/PatientSection';
import type { CallForm, ComplaintForm, PatientForm } from '../types';
import {
  createDefaultCallForm,
  createDefaultComplaintForm,
  createDefaultPatientForm,
  getCallRequiredFields,
  getComplaintRequiredFields,
  getPatientRequiredFields,
} from '../utils';

const sections = [
  'Call',
  'Patient',
  'Complaint',
  'Assessment',
  'Vitals',
  'Treatments',
  'Billing Information',
  'Narrative',
  'Signatures',
];

export default function EPCRClient() {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [expandedSection, setExpandedSection] = useState<string>('');
  const [fileStatus, setFileStatus] = useState('');

  const [callForm, setCallForm] = useState<CallForm>(() =>
    createDefaultCallForm(),
  );
  const [patientForm, setPatientForm] = useState<PatientForm>(() =>
    createDefaultPatientForm(),
  );
  const [complaintForm, setComplaintForm] = useState<ComplaintForm>(() =>
    createDefaultComplaintForm(),
  );

  const callRequiredFields = useMemo(
    () => getCallRequiredFields(callForm),
    [callForm],
  );

  const callCompletedRequiredFields = callRequiredFields.filter(Boolean).length;
  const callTotalRequiredFields = callRequiredFields.length;

  const patientRequiredFields = useMemo(
    () => getPatientRequiredFields(patientForm),
    [patientForm],
  );
  const patientCompletedRequiredFields =
    patientRequiredFields.filter(Boolean).length;
  const patientTotalRequiredFields = patientRequiredFields.length;

  const complaintRequiredFields = useMemo(
    () => getComplaintRequiredFields(complaintForm),
    [complaintForm],
  );
  const complaintCompletedRequiredFields =
    complaintRequiredFields.filter(Boolean).length;
  const complaintTotalRequiredFields = complaintRequiredFields.length;

  function updateCallForm(field: keyof CallForm, value: string | string[]) {
    setCallForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updatePatientForm(
    field: keyof PatientForm,
    value: string | boolean,
  ) {
    setPatientForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  function updateComplaintForm(
    field: keyof ComplaintForm,
    value:
      | string
      | string[]
      | ComplaintForm['primaryImpression']
      | ComplaintForm['otherAssociatedSymptoms'],
  ) {
    setComplaintForm((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      if (field === 'patientAcuity') {
        const acuity = value as string;
        const isTrauma =
          acuity === 'Non STAT Trauma' || acuity === 'STAT Trauma';
        const isCardiacArrest = acuity === 'Cardiac Arrest';

        next.possibleInjuryTrauma = isTrauma ? 'Yes' : '';
        next.cardiacArrest = isCardiacArrest
          ? 'Yes, Prior to EMS Contact'
          : '';
      }

      return next;
    });
  }

  const patientProgressTasks = [
    {
      title: 'Patient Demographics',
      completedFields: [
        patientForm.unablePatientName
          ? 'unable'
          : patientForm.firstName && patientForm.lastName,
        patientForm.unableDateOfBirth ? 'unable' : patientForm.dateOfBirth,
        patientForm.unableAge ? 'unable' : patientForm.dateOfBirth,
        patientForm.unablePatientAddress
          ? 'unable'
          : patientForm.patientStreet &&
            patientForm.patientCity &&
            patientForm.patientZip,
        patientForm.unableGender ? 'unable' : patientForm.gender,
        patientForm.unablePhoneNumber ? 'unable' : patientForm.phoneNumber,
        patientForm.unableSocialSecurityNumber
          ? 'unable'
          : patientForm.socialSecurityNumber,
        patientForm.unableRace ? 'unable' : patientForm.race,
      ].filter(Boolean).length,
      totalFields: 8,
    },
    {
      title: 'Medical Information',
      completedFields: [
        patientForm.medicalHistory,
        patientForm.surgicalHistory,
        patientForm.currentMedications,
        patientForm.lastOralIntake,
      ].filter(Boolean).length,
      totalFields: 4,
    },
    {
      title: 'Allergies',
      completedFields: [
        patientForm.medicationAllergies,
        patientForm.environmentalAllergies,
      ].filter(Boolean).length,
      totalFields: 2,
    },
    {
      title: 'Patient Belongings',
      completedFields: [
        patientForm.patientEffects,
        patientForm.patientEffectsLeftWith,
        ...(patientForm.patientEffectsLeftWith === 'Other Responding Agency'
          ? [patientForm.patientEffectsLeftWithOther]
          : []),
      ].filter(Boolean).length,
      totalFields:
        2 +
        (patientForm.patientEffectsLeftWith === 'Other Responding Agency'
          ? 1
          : 0),
    },
    {
      title: 'Patient Outcome',
      completedFields: [
        patientForm.disposition,
        ...(patientForm.disposition === 'Turnover Patient Care at Scene' ||
        patientForm.disposition === 'Canceled by Other Agency at Scene'
          ? [patientForm.dispositionExplanation]
          : []),
      ].filter(Boolean).length,
      totalFields:
        1 +
        (patientForm.disposition === 'Turnover Patient Care at Scene' ||
        patientForm.disposition === 'Canceled by Other Agency at Scene'
          ? 1
          : 0),
    },
  ];

  const callProgressTasks = [
    {
      title: 'Dispatch Information',
      completedFields: [
        callForm.emsResponseNumber,
        callForm.dispatchedPriority,
      ].filter(Boolean).length,
      totalFields: 2,
    },
    {
      title: 'Crew Information',
      completedFields: [
        callForm.respondingUnitNumber,
        callForm.pcrDocumentedBy,
        callForm.respondingCrew,
      ].filter(Boolean).length,
      totalFields: 3,
    },
    {
      title: 'Response Information',
      completedFields: [
        callForm.dispatchedNatureOfCall,
        callForm.typeOfServiceRequested,
        callForm.responseModeToScene,
      ].filter(Boolean).length,
      totalFields: 3,
    },
    {
      title: 'Location Information',
      completedFields: [
        callForm.incidentLocationType,
        ...(callForm.incidentLocationType === 'Other'
          ? [callForm.incidentLocationTypeOther]
          : []),
        callForm.incidentStreet,
        callForm.incidentCity,
        callForm.incidentZip,
        callForm.numberOfPatientsAtScene,
        callForm.firstEmsUnitOnScene,
        ...(callForm.otherAgenciesMode === 'Add'
          ? [callForm.otherAgenciesOnScene]
          : []),
        callForm.hazardousHealthExposures,
        ...(callForm.hazardousHealthExposures === 'Other Exposure'
          ? [callForm.hazardousHealthExposuresOther]
          : []),
        callForm.personalProtectiveEquipmentUsed.length > 0 ? 'selected' : '',
        ...(callForm.personalProtectiveEquipmentUsed.includes('Other')
          ? [callForm.personalProtectiveEquipmentOther]
          : []),
      ].filter(Boolean).length,
      totalFields:
        8 +
        (callForm.incidentLocationType === 'Other' ? 1 : 0) +
        (callForm.otherAgenciesMode === 'Add' ? 1 : 0) +
        (callForm.hazardousHealthExposures === 'Other Exposure' ? 1 : 0) +
        (callForm.personalProtectiveEquipmentUsed.includes('Other') ? 1 : 0),
    },
    {
      title: 'Times',
      completedFields: [
        callForm.callReceived,
        callForm.callDispatched,
        callForm.unitEnRoute,
        callForm.unitOnScene,
        callForm.patientContact,
        callForm.departScene,
        callForm.arrivedAtDestination,
        callForm.transferOfCare,
        callForm.unitBackInService,
      ].filter(Boolean).length,
      totalFields: 9,
    },
  ];

  const complaintProgressTasks = [
    {
      title: 'Complaint',
      completedFields: [
        complaintForm.primaryImpression,
        complaintForm.secondaryImpression,
        complaintForm.emsConditionCode,
        complaintForm.primarySymptom,
        complaintForm.otherAssociatedSymptoms.length > 0 ? 'selected' : '',
        complaintForm.symptomsBeganDateTime,
        complaintForm.lastSeenNormalDateTime,
      ].filter(Boolean).length,
      totalFields: 7,
    },
    {
      title: 'Circumstances',
      completedFields: [
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
          ? [
              complaintForm.drugAlcoholIndications.length > 0
                ? 'selected'
                : '',
            ]
          : []),
        ...(complaintForm.drugAlcoholIndications.some((item) =>
          item.toLowerCase().includes('drug'),
        )
          ? [complaintForm.suspectedDrug]
          : []),
        complaintForm.workRelatedIllnessInjury,
      ].filter(Boolean).length,
      totalFields:
        7 +
        (complaintForm.suspectedStrokeCva === 'Yes' ? 1 : 0) +
        (complaintForm.possibleDrugAlcoholUse === 'Yes' ? 1 : 0) +
        (complaintForm.drugAlcoholIndications.some((item) =>
          item.toLowerCase().includes('drug'),
        )
          ? 1
          : 0),
    },
  ];

  const progressSections = [
    {
      title: 'Call',
      completedFields: callCompletedRequiredFields,
      totalFields: callTotalRequiredFields,
      tasks: callProgressTasks,
    },
    {
      title: 'Patient',
      completedFields: patientCompletedRequiredFields,
      totalFields: patientTotalRequiredFields,
      tasks: patientProgressTasks,
    },
    {
      title: 'Complaint',
      completedFields: complaintCompletedRequiredFields,
      totalFields: complaintTotalRequiredFields,
      tasks: complaintProgressTasks,
    },
    ...sections
      .filter(
        (section) =>
          section !== 'Call' &&
          section !== 'Patient' &&
          section !== 'Complaint',
      )
      .map((section) => ({
        title: section,
        completedFields: 0,
        totalFields: 1,
      })),
  ];

  function savePCRToFile() {
    const savedPCR = {
      fileType: 'ApolloEMS Mock ePCR',
      fileVersion: 1,
      savedAt: new Date().toISOString(),
      expandedSection,
      chart: {
        call: callForm,
        patient: patientForm,
        complaint: complaintForm,
      },
    };

    const blob = new Blob([JSON.stringify(savedPCR, null, 2)], {
      type: 'application/json',
    });

    const downloadUrl = URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');

    downloadLink.href = downloadUrl;
    downloadLink.download = `ApolloEMS-ePCR-${callForm.emsResponseNumber}.apolloepcr`;
    downloadLink.click();

    URL.revokeObjectURL(downloadUrl);
    setFileStatus('PCR saved to local file.');
  }

  async function uploadPCRFromFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const fileText = await file.text();
      const parsed = JSON.parse(fileText) as {
        fileType?: string;
        fileVersion?: number;
        expandedSection?: string;
        chart?: {
          call?: CallForm;
          patient?: PatientForm;
          complaint?: ComplaintForm;
        };
        callForm?: CallForm;
        patientForm?: PatientForm;
        complaintForm?: ComplaintForm;
      };

      const uploadedCallForm = parsed.chart?.call ?? parsed.callForm;
      const uploadedPatientForm =
        parsed.chart?.patient ?? parsed.patientForm ?? createDefaultPatientForm();
      const uploadedComplaintForm =
        parsed.chart?.complaint ??
        parsed.complaintForm ??
        createDefaultComplaintForm();

      if (
        parsed.fileType !== 'ApolloEMS Mock ePCR' ||
        parsed.fileVersion !== 1 ||
        !uploadedCallForm
      ) {
        throw new Error('Invalid ApolloEMS ePCR file.');
      }

      setCallForm({
        ...uploadedCallForm,
        personalProtectiveEquipmentUsed: Array.isArray(
          uploadedCallForm.personalProtectiveEquipmentUsed,
        )
          ? uploadedCallForm.personalProtectiveEquipmentUsed
          : uploadedCallForm.personalProtectiveEquipmentUsed
            ? [uploadedCallForm.personalProtectiveEquipmentUsed]
            : [],
      });
      setPatientForm({
        ...createDefaultPatientForm(),
        ...uploadedPatientForm,
      });
      setComplaintForm({
        ...createDefaultComplaintForm(),
        ...uploadedComplaintForm,
      });
      setExpandedSection(parsed.expandedSection || 'Call');
      setFileStatus('PCR uploaded successfully.');
    } catch (error) {
      console.error(error);
      setFileStatus(
        'Unable to upload PCR file. Please select a valid ApolloEMS ePCR save file.',
      );
    } finally {
      event.target.value = '';
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 text-4xl font-bold text-slate-900">
          ApolloEMS ePCR
        </h1>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <p className="text-slate-600">
            Mock Electronic Patient Care Report Demonstration
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={savePCRToFile}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-slate-700"
            >
              Save PCR
            </button>

            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow hover:bg-slate-50"
            >
              Upload PCR
            </button>

            <input
              ref={uploadInputRef}
              type="file"
              accept=".apolloepcr,application/json"
              onChange={uploadPCRFromFile}
              className="hidden"
            />
          </div>
        </div>

        {fileStatus && (
          <div className="mb-6 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
            {fileStatus}
          </div>
        )}

        <PCRProgress sections={progressSections} />

        <div className="space-y-4">
          {sections.map((section) => {
            const sectionProgress = progressSections.find(
              (progressSection) => progressSection.title === section,
            ) ?? {
              title: section,
              completedFields: 0,
              totalFields: 1,
            };

            return (
              <PCRSection
                key={section}
                title={section}
                completedFields={sectionProgress.completedFields}
                totalFields={sectionProgress.totalFields}
                expanded={expandedSection === section}
                onToggle={() =>
                  setExpandedSection(
                    expandedSection === section ? '' : section,
                  )
                }
              >
                {section === 'Call' ? (
                  <CallSection
                    callForm={callForm}
                    setCallForm={setCallForm}
                    updateCallForm={updateCallForm}
                  />
                ) : section === 'Patient' ? (
                  <PatientSection
                    patientForm={patientForm}
                    callForm={callForm}
                    setPatientForm={setPatientForm}
                    updatePatientForm={updatePatientForm}
                  />
                ) : section === 'Complaint' ? (
                  <ComplaintSection
                    complaintForm={complaintForm}
                    updateComplaintForm={updateComplaintForm}
                  />
                ) : (
                  <div className="rounded-lg border-2 border-dashed border-slate-300 p-10 text-center text-slate-500">
                    {section} cards will be added here.
                  </div>
                )}
              </PCRSection>
            );
          })}        </div>
      </div>
    </main>
  );
}
