'use client';

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import PCRProgress from './PCRProgress';
import PCRSection from './PCRSection';
import PatientHandoffRail from './PatientHandoffRail';
import AssessmentSection from '../sections/AssessmentSection';
import CallSection from '../sections/CallSection';
import ComplaintSection from '../sections/ComplaintSection';
import PatientSection from '../sections/PatientSection';
import type { CallForm, ComplaintForm, PatientForm } from '../types';
import {
  createDefaultAssessmentForm,
  type AssessmentForm,
} from '../clinical/assessment/assessmentForm';
import { determineAssessmentMode } from '../clinical/engine/assessment';
import { getCcemsaGfastConsiderations } from '../clinical/engine/protocols/ccemsaStroke';
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

function mergeAssessmentWithDefaults(
  uploadedAssessment: unknown,
): AssessmentForm {
  function mergeValue(defaultValue: unknown, uploadedValue: unknown): unknown {
    if (Array.isArray(defaultValue)) {
      return Array.isArray(uploadedValue) ? uploadedValue : defaultValue;
    }

    if (
      defaultValue !== null &&
      typeof defaultValue === 'object' &&
      !Array.isArray(defaultValue)
    ) {
      const uploadedRecord =
        uploadedValue !== null &&
        typeof uploadedValue === 'object' &&
        !Array.isArray(uploadedValue)
          ? (uploadedValue as Record<string, unknown>)
          : {};

      const mergedRecord: Record<string, unknown> = {
        ...uploadedRecord,
      };

      Object.entries(defaultValue as Record<string, unknown>).forEach(
        ([key, nestedDefault]) => {
          mergedRecord[key] = mergeValue(
            nestedDefault,
            uploadedRecord[key],
          );
        },
      );

      return mergedRecord;
    }

    return typeof uploadedValue === typeof defaultValue
      ? uploadedValue
      : defaultValue;
  }

  return mergeValue(
    createDefaultAssessmentForm(),
    uploadedAssessment,
  ) as AssessmentForm;
}

export default function EPCRClient() {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [expandedSection, setExpandedSection] = useState<string>('');
  const [fileStatus, setFileStatus] = useState('');
  const [patientSummaryOpen, setPatientSummaryOpen] = useState(false);
  const [quickToolsOpen, setQuickToolsOpen] = useState(false);
  const [clinicalIntelligenceOpen, setClinicalIntelligenceOpen] =
    useState(true);
  const [
    clinicalIntelligencePreferenceLoaded,
    setClinicalIntelligencePreferenceLoaded,
  ] = useState(false);
  const [mobileDrawer, setMobileDrawer] = useState<
    'patient-summary' | 'quick-tools' | null
  >(null);

  useEffect(() => {
    const savedPatientSummary = window.localStorage.getItem(
      'apollo-epcr-patient-summary-open',
    );
    const savedQuickTools = window.localStorage.getItem(
      'apollo-epcr-quick-tools-open',
    );
    const savedClinicalIntelligence = window.localStorage.getItem(
      'apollo-epcr-clinical-intelligence-open',
    );

    if (savedPatientSummary !== null) {
      setPatientSummaryOpen(savedPatientSummary === 'true');
    }

    if (savedQuickTools !== null) {
      setQuickToolsOpen(savedQuickTools === 'true');
    }

    if (savedClinicalIntelligence !== null) {
      setClinicalIntelligenceOpen(savedClinicalIntelligence === 'true');
    }

    setClinicalIntelligencePreferenceLoaded(true);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      'apollo-epcr-patient-summary-open',
      String(patientSummaryOpen),
    );
  }, [patientSummaryOpen]);

  useEffect(() => {
    window.localStorage.setItem(
      'apollo-epcr-quick-tools-open',
      String(quickToolsOpen),
    );
  }, [quickToolsOpen]);

  useEffect(() => {
    if (!clinicalIntelligencePreferenceLoaded) {
      return;
    }

    window.localStorage.setItem(
      'apollo-epcr-clinical-intelligence-open',
      String(clinicalIntelligenceOpen),
    );
  }, [clinicalIntelligenceOpen, clinicalIntelligencePreferenceLoaded]);

  const [callForm, setCallForm] = useState<CallForm>(() =>
    createDefaultCallForm(),
  );
  const [patientForm, setPatientForm] = useState<PatientForm>(() =>
    createDefaultPatientForm(),
  );
  const [complaintForm, setComplaintForm] = useState<ComplaintForm>(() =>
    createDefaultComplaintForm(),
  );
  const [assessmentForm, setAssessmentForm] = useState<AssessmentForm>(() =>
    createDefaultAssessmentForm(),
  );
  const [assessmentProgress, setAssessmentProgress] = useState({
    completedFields: 0,
    totalFields: 0,
    tasks: [] as {
      title: string;
      completedFields: number;
      totalFields: number;
    }[],
  });

  const documentingProviderCertification =
    callForm.crewMembers.find((member) => member.isDocumentingPcr)
      ?.certification;
  const documentingProviderScope =
    documentingProviderCertification === 'Paramedic' ? 'ALS' : 'BLS';
  const assessmentMode = determineAssessmentMode({
    clinicalCategory: complaintForm.clinicalCategory,
    suspectedStroke: complaintForm.suspectedStrokeCva === 'Yes',
    possibleTrauma: complaintForm.possibleInjuryTrauma === 'Yes',
    behavioralHold: complaintForm.patientPlacedOn5150Hold === 'Yes',
    cardiacArrest:
      complaintForm.cardiacArrest !== '' &&
      complaintForm.cardiacArrest !== 'No',
  });
  const hasGfastDocumentation = Object.values(
    assessmentForm.clinical.gfast,
  ).some(Boolean);
  const clinicalIntelligenceFeedback =
    callForm.lemsa === 'CCEMSA' &&
    (complaintForm.suspectedStrokeCva === 'Yes' || hasGfastDocumentation)
      ? getCcemsaGfastConsiderations({
          gaze: assessmentForm.clinical.gfast.gaze,
          face: assessmentForm.clinical.gfast.face,
          arms: assessmentForm.clinical.gfast.arms,
          speech: assessmentForm.clinical.gfast.speech,
          lastKnownNormal: assessmentForm.clinical.gfast.time,
          bloodGlucose: assessmentForm.clinical.gfast.bloodGlucose,
        })
      : [];

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

  const handleAssessmentProgressChange = useCallback(
    (nextProgress: {
      completedFields: number;
      totalFields: number;
      tasks: {
        title: string;
        completedFields: number;
        totalFields: number;
      }[];
    }) => {
      setAssessmentProgress((currentProgress) => {
        const sameTaskProgress =
          currentProgress.tasks.length === nextProgress.tasks.length &&
          currentProgress.tasks.every((currentTask, index) => {
            const nextTask = nextProgress.tasks[index];

            return (
              nextTask &&
              currentTask.title === nextTask.title &&
              currentTask.completedFields === nextTask.completedFields &&
              currentTask.totalFields === nextTask.totalFields
            );
          });

        if (
          currentProgress.completedFields === nextProgress.completedFields &&
          currentProgress.totalFields === nextProgress.totalFields &&
          sameTaskProgress
        ) {
          return currentProgress;
        }

        return nextProgress;
      });
    },
    [],
  );

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
      ].filter(Boolean).length,
      totalFields:
        1 +
        (patientForm.disposition === 'Transported' ||
        patientForm.disposition === 'RMCT' ||
        patientForm.disposition === 'Obvious Death' ||
        patientForm.disposition === 'Death Pronounced at Scene' ||
        patientForm.disposition === 'Turnover Patient Care at Scene' ||
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
        callForm.emsIncidentNumber,
        callForm.dispatchedPriority,
      ].filter(Boolean).length,
      totalFields: 3,
    },
    {
      title: 'Crew Information',
      completedFields: [
        callForm.respondingUnitNumber,
        callForm.lemsa,
        callForm.crewMembers.length > 0 &&
        callForm.crewMembers.every(
          (member) => member.name && member.certification && member.role,
        )
          ? 'crew-complete'
          : '',
        callForm.crewMembers.some((member) => member.isDocumentingPcr)
          ? 'documentor-selected'
          : '',
      ].filter(Boolean).length,
      totalFields: 4,
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
        complaintForm.clinicalCategory,
        complaintForm.primaryImpression,
        complaintForm.secondaryImpression,
        complaintForm.emsConditionCode,
        complaintForm.primarySymptom,
        complaintForm.otherAssociatedSymptoms.length > 0 ? 'selected' : '',
        complaintForm.symptomsBeganDateTime,
        complaintForm.lastSeenNormalDateTime,
      ].filter(Boolean).length,
      totalFields: 8,
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
    {
      title: 'Assessment',
      completedFields: assessmentProgress.completedFields,
      totalFields: assessmentProgress.totalFields || 1,
      tasks: assessmentProgress.tasks,
    },
    ...sections
      .filter(
        (section) =>
          section !== 'Call' &&
          section !== 'Patient' &&
          section !== 'Complaint' &&
          section !== 'Assessment',
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
        assessment: assessmentForm,
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
          assessment?: AssessmentForm;
        };
        callForm?: CallForm;
        patientForm?: PatientForm;
        complaintForm?: ComplaintForm;
        assessmentForm?: AssessmentForm;
      };

      const uploadedCallForm = parsed.chart?.call ?? parsed.callForm;
      const uploadedPatientForm =
        parsed.chart?.patient ?? parsed.patientForm ?? createDefaultPatientForm();
      const uploadedComplaintForm =
        parsed.chart?.complaint ??
        parsed.complaintForm ??
        createDefaultComplaintForm();
      const uploadedAssessmentForm =
        parsed.chart?.assessment ?? parsed.assessmentForm;

      if (
        parsed.fileType !== 'ApolloEMS Mock ePCR' ||
        parsed.fileVersion !== 1 ||
        !uploadedCallForm
      ) {
        throw new Error('Invalid ApolloEMS ePCR file.');
      }

      setCallForm({
        ...createDefaultCallForm(),
        ...uploadedCallForm,
        lemsa: uploadedCallForm.lemsa ?? '',
        crewMembers:
          uploadedCallForm.crewMembers && uploadedCallForm.crewMembers.length > 0
            ? uploadedCallForm.crewMembers
            : [
                {
                  id: 'crew-1',
                  name:
                    uploadedCallForm.pcrDocumentedBy ||
                    uploadedCallForm.respondingCrew ||
                    '',
                  certification: 'EMT',
                  role: 'Primary Care Giver',
                  isDocumentingPcr: true,
                },
              ],
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
      setAssessmentForm(
        mergeAssessmentWithDefaults(uploadedAssessmentForm),
      );
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
    <main className="min-h-screen bg-slate-100 px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-[1600px]">
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

        <div className="mb-4 flex items-center justify-between gap-3 xl:hidden">
          <button
            type="button"
            onClick={() => setMobileDrawer('patient-summary')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            ☰ Patient Summary
          </button>
          <button
            type="button"
            onClick={() => setMobileDrawer('quick-tools')}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
          >
            Quick Tools ☰
          </button>
        </div>

        <div
          className="grid items-start gap-4 transition-all duration-300"
          style={{
            gridTemplateColumns: `minmax(0, 1fr)`,
          }}
        >
          <div
            className="hidden items-start gap-4 xl:grid"
            style={{
              gridTemplateColumns: `${
                patientSummaryOpen ? 'minmax(280px, 320px)' : '52px'
              } minmax(0, 1fr) ${
                quickToolsOpen ? 'minmax(280px, 320px)' : '52px'
              }`,
            }}
          >
            <aside className="sticky top-4 min-w-0">
              {patientSummaryOpen ? (
                <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-lg">
                  <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                        Live Clinical Summary
                      </p>
                      <h2 className="font-bold">Patient Handoff</h2>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPatientSummaryOpen(false)}
                      className="rounded-lg border border-white/20 px-2.5 py-1.5 font-bold hover:bg-white/10"
                      aria-label="Collapse patient summary"
                    >
                      ◀
                    </button>
                  </div>
                  <div className="p-3">
                    <PatientHandoffRail
                      callForm={callForm}
                      patientForm={patientForm}
                      complaintForm={complaintForm}
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPatientSummaryOpen(true)}
                  className="flex min-h-[240px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-2 py-4 shadow-md hover:bg-slate-50"
                  aria-label="Expand patient summary"
                >
                  <span className="font-black">▶</span>
                  <span
                    className="text-xs font-bold uppercase tracking-[0.16em]"
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                  >
                    Patient Summary
                  </span>
                </button>
              )}
            </aside>

            <div className="min-w-0 space-y-4">
              {sections.map((section) => {
                const sectionProgress = progressSections.find(
                  (progressSection) => progressSection.title === section,
                ) ?? { title: section, completedFields: 0, totalFields: 1 };

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
                    ) : section === 'Assessment' ? (
                      <AssessmentSection
                        assessmentForm={assessmentForm}
                        onAssessmentFormChange={setAssessmentForm}
                        patientForm={patientForm}
                        onPatientChange={updatePatientForm}
                        providerScope={documentingProviderScope}
                        clinicalCategory={complaintForm.clinicalCategory}
                        suspectedStroke={complaintForm.suspectedStrokeCva === 'Yes'}
                        possibleTrauma={complaintForm.possibleInjuryTrauma === 'Yes'}
                        behavioralHold={complaintForm.patientPlacedOn5150Hold === 'Yes'}
                        cardiacArrest={
                          complaintForm.cardiacArrest !== '' &&
                          complaintForm.cardiacArrest !== 'No'
                        }
                        onProgressChange={handleAssessmentProgressChange}
                      />
                    ) : (
                      <div className="rounded-lg border-2 border-dashed border-slate-300 p-10 text-center text-slate-500">
                        {section} cards will be added here.
                      </div>
                    )}
                  </PCRSection>
                );
              })}
            </div>

            <aside className="sticky top-4 min-w-0">
              {quickToolsOpen ? (
                <div className="overflow-hidden rounded-2xl border border-slate-300 bg-white shadow-lg">
                  <div className="flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
                    <button
                      type="button"
                      onClick={() => setQuickToolsOpen(false)}
                      className="rounded-lg border border-white/20 px-2.5 py-1.5 font-bold hover:bg-white/10"
                      aria-label="Collapse quick tools"
                    >
                      ▶
                    </button>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                        Clinical Utilities
                      </p>
                      <h2 className="font-bold">Quick Tools</h2>
                    </div>
                  </div>
                  <div className="space-y-3 p-4">
                    {[
                      ['Quick Vitals', 'Rapidly add a new vital-sign set without leaving the current section.'],
                      ['Dosing Calculator', 'Weight-based medication and infusion calculations.'],
                      ['Clinical Timer', 'Track CPR, stroke, medication, contraction, or procedure times.'],
                    ].map(([title, description]) => (
                      <div key={title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                        <div className="mb-2 flex items-start justify-between gap-3">
                          <h3 className="font-bold text-slate-900">{title}</h3>
                          <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                            Coming Soon
                          </span>
                        </div>
                        <p className="text-sm leading-6 text-slate-600">{description}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setQuickToolsOpen(true)}
                  className="flex min-h-[240px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-slate-300 bg-white px-2 py-4 shadow-md hover:bg-slate-50"
                  aria-label="Expand quick tools"
                >
                  <span className="font-black">◀</span>
                  <span
                    className="text-xs font-bold uppercase tracking-[0.16em]"
                    style={{ writingMode: 'vertical-rl' }}
                  >
                    Quick Tools
                  </span>
                </button>
              )}
            </aside>
          </div>

          <div className="min-w-0 space-y-4 xl:hidden">
            {sections.map((section) => {
              const sectionProgress = progressSections.find(
                (progressSection) => progressSection.title === section,
              ) ?? { title: section, completedFields: 0, totalFields: 1 };

              return (
                <PCRSection
                  key={section}
                  title={section}
                  completedFields={sectionProgress.completedFields}
                  totalFields={sectionProgress.totalFields}
                  expanded={expandedSection === section}
                  onToggle={() =>
                    setExpandedSection(expandedSection === section ? '' : section)
                  }
                >
                  {section === 'Call' ? (
                    <CallSection callForm={callForm} setCallForm={setCallForm} updateCallForm={updateCallForm} />
                  ) : section === 'Patient' ? (
                    <PatientSection patientForm={patientForm} callForm={callForm} setPatientForm={setPatientForm} updatePatientForm={updatePatientForm} />
                  ) : section === 'Complaint' ? (
                    <ComplaintSection complaintForm={complaintForm} updateComplaintForm={updateComplaintForm} />
                  ) : section === 'Assessment' ? (
                    <AssessmentSection
                      assessmentForm={assessmentForm}
                      onAssessmentFormChange={setAssessmentForm}
                      patientForm={patientForm}
                      onPatientChange={updatePatientForm}
                      providerScope={documentingProviderScope}
                      clinicalCategory={complaintForm.clinicalCategory}
                      suspectedStroke={complaintForm.suspectedStrokeCva === 'Yes'}
                      possibleTrauma={complaintForm.possibleInjuryTrauma === 'Yes'}
                      behavioralHold={complaintForm.patientPlacedOn5150Hold === 'Yes'}
                      cardiacArrest={complaintForm.cardiacArrest !== '' && complaintForm.cardiacArrest !== 'No'}
                      onProgressChange={handleAssessmentProgressChange}
                    />
                  ) : (
                    <div className="rounded-lg border-2 border-dashed border-slate-300 p-10 text-center text-slate-500">
                      {section} cards will be added here.
                    </div>
                  )}
                </PCRSection>
              );
            })}
          </div>
        </div>

        <footer className="sticky bottom-0 z-30 mt-6 rounded-t-2xl border border-amber-300 bg-amber-50/95 shadow-[0_-8px_24px_rgba(15,23,42,0.14)] backdrop-blur">
          <button
            type="button"
            onClick={() =>
              setClinicalIntelligenceOpen((currentOpen) => !currentOpen)
            }
            aria-expanded={clinicalIntelligenceOpen}
            aria-controls="apollo-clinical-intelligence-content"
            className={`flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-amber-100/70 ${
              clinicalIntelligenceOpen ? 'border-b border-amber-200' : ''
            }`}
          >
            <span className="flex items-center gap-2">
              <span
                aria-hidden="true"
                className="text-sm font-black text-amber-800"
              >
                {clinicalIntelligenceOpen ? '▼' : '▲'}
              </span>
              <span className="font-black text-amber-950">
                Apollo Clinical Intelligence
              </span>
            </span>
            <span className="flex items-center gap-3">
              <span className="text-xs font-bold uppercase tracking-wide text-amber-800">
                {callForm.lemsa
                  ? `${callForm.lemsa} protocols selected`
                  : 'Select a LEMSA to enable protocol guidance'}
              </span>
              <span className="text-[10px] font-black uppercase tracking-wide text-amber-700">
                {clinicalIntelligenceOpen ? 'Collapse' : 'Expand'}
              </span>
            </span>
          </button>

          {clinicalIntelligenceOpen && (
            <div id="apollo-clinical-intelligence-content">
              <div className="border-b border-amber-200 px-4 py-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wide text-amber-700">
                      Assessment Mode
                    </div>
                    <div className="text-sm font-bold capitalize text-slate-900">
                      {assessmentMode.replace('-', ' ')}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wide text-amber-700">
                      Clinical Category
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {complaintForm.clinicalCategory || 'Not Yet Selected'}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-wide text-amber-700">
                      Documenting Provider Scope
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      {documentingProviderScope}
                    </div>
                  </div>
                </div>
              </div>

              <div className="max-h-36 overflow-y-auto px-4 py-3">
                {!callForm.lemsa ? (
                  <p className="text-sm font-semibold text-amber-900">
                    No protocol references are active. Select the applicable
                    LEMSA in Crew Information.
                  </p>
                ) : clinicalIntelligenceFeedback.length > 0 ? (
                  <div className="space-y-1.5">
                    {clinicalIntelligenceFeedback.map((feedback) => (
                      <p key={feedback} className="text-sm text-amber-950">
                        • {feedback}
                      </p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm font-semibold text-amber-900">
                    {callForm.lemsa === 'Merced County'
                      ? 'Merced County is selected. No Merced County protocol-specific guidance is loaded for the current assessment.'
                      : 'No protocol-specific feedback is active for the current documentation.'}
                  </p>
                )}
              </div>
            </div>
          )}
        </footer>

        {mobileDrawer && (
          <div className="fixed inset-0 z-50 xl:hidden">
            <button
              type="button"
              aria-label="Close drawer"
              onClick={() => setMobileDrawer(null)}
              className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            />
            <aside
              className={`absolute inset-y-0 w-[min(92vw,360px)] overflow-y-auto bg-slate-100 shadow-2xl ${
                mobileDrawer === 'patient-summary' ? 'left-0' : 'right-0'
              }`}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between bg-slate-900 px-4 py-3 text-white">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                    {mobileDrawer === 'patient-summary' ? 'Live Clinical Summary' : 'Clinical Utilities'}
                  </p>
                  <h2 className="text-lg font-bold">
                    {mobileDrawer === 'patient-summary' ? 'Patient Handoff' : 'Quick Tools'}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setMobileDrawer(null)}
                  className="rounded-lg border border-white/20 px-3 py-2 font-bold hover:bg-white/10"
                  aria-label="Close drawer"
                >
                  ✕
                </button>
              </div>
              <div className="p-4">
                {mobileDrawer === 'patient-summary' ? (
                  <PatientHandoffRail
                    callForm={callForm}
                    patientForm={patientForm}
                    complaintForm={complaintForm}
                  />
                ) : (
                  <div className="space-y-3">
                    {['Quick Vitals', 'Dosing Calculator', 'Clinical Timer'].map((tool) => (
                      <div key={tool} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <h3 className="font-bold text-slate-900">{tool}</h3>
                          <span className="rounded-full bg-slate-200 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-slate-600">
                            Coming Soon
                          </span>
                        </div>
                        <p className="text-sm text-slate-600">
                          This Quick Tool will be added in a future phase.
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
