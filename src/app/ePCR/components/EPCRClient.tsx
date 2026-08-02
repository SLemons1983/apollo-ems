"use client";

import {
  ChangeEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PCRProgress from "./PCRProgress";
import PCRSection from "./PCRSection";
import PatientHandoffRail from "./PatientHandoffRail";
import QuickToolsPanel from "./QuickToolsPanel";
import ReportReviewActions from "@/components/epcr/ReportReviewActions";
import AciSuggestionFooter from "../clinical/components/intelligence/AciSuggestionFooter";
import AssessmentSection from "../sections/AssessmentSection";
import BillingSection from "../sections/BillingSection";
import CallSection from "../sections/CallSection";
import ComplaintSection from "../sections/ComplaintSection";
import PatientSection from "../sections/PatientSection";
import TreatmentsSection from "../sections/TreatmentsSection";
import VitalsSection from "../sections/VitalsSection";
import NarrativeSection from "../sections/NarrativeSection";
import SignatureSection, { createDefaultSignatureForm, type SignatureForm } from "../sections/SignatureSection";
import { createDefaultNarrativeForm, generateNarrative, getNarrativeReviewIssues, narrativeFingerprint, type NarrativeForm, type NarrativeFormat } from "../clinical/narrative/narrative";
import type { CallForm, ComplaintForm, PatientForm } from "../types";
import {
  getBillingProgress,
  mergeBillingWithDefaults,
  type BillingForm,
} from "../clinical/billing/billing";
import {
  createDefaultAssessmentForm,
  type AssessmentForm,
} from "../clinical/assessment/assessmentForm";
import type {
  ReassessmentForm,
  ReassessmentRecord,
} from "../clinical/components/assessment/cards/ReassessmentCard";
import { determineAssessmentMode } from "../clinical/engine/assessment";
import { getCcemsaGfastConsiderations } from "../clinical/engine/protocols/ccemsaStroke";
import {
  createDefaultCallForm,
  createDefaultComplaintForm,
  createDefaultPatientForm,
  getCallRequiredFields,
  getComplaintRequiredFields,
  getPatientRequiredFields,
} from "../utils";
import {
  getAciVitalAlerts,
  getVitalsProgress,
  mergeVitalsWithDefaults,
  type VitalsForm,
} from "../clinical/vitals/vitals";
import {
  getTreatmentsProgress,
  mergeTreatmentsWithDefaults,
  type TreatmentsForm,
} from "../clinical/treatments/treatments";

const sections = [
  "Call",
  "Patient",
  "Complaint",
  "Assessment",
  "Vitals",
  "Treatments",
  "Billing Information",
  "Narrative",
  "Signatures",
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
      typeof defaultValue === "object" &&
      !Array.isArray(defaultValue)
    ) {
      const uploadedRecord =
        uploadedValue !== null &&
        typeof uploadedValue === "object" &&
        !Array.isArray(uploadedValue)
          ? (uploadedValue as Record<string, unknown>)
          : {};

      const mergedRecord: Record<string, unknown> = {
        ...uploadedRecord,
      };

      Object.entries(defaultValue as Record<string, unknown>).forEach(
        ([key, nestedDefault]) => {
          mergedRecord[key] = mergeValue(nestedDefault, uploadedRecord[key]);
        },
      );

      return mergedRecord;
    }

    return typeof uploadedValue === typeof defaultValue
      ? uploadedValue
      : defaultValue;
  }

  const merged = mergeValue(
    createDefaultAssessmentForm(),
    uploadedAssessment,
  ) as AssessmentForm;

  const uploadedClinical =
    uploadedAssessment !== null &&
    typeof uploadedAssessment === "object" &&
    !Array.isArray(uploadedAssessment) &&
    (uploadedAssessment as { clinical?: unknown }).clinical !== null &&
    typeof (uploadedAssessment as { clinical?: unknown }).clinical === "object"
      ? (uploadedAssessment as { clinical: Record<string, unknown> }).clinical
      : {};
  const legacyReassessment = uploadedClinical.reassessment as
    | Partial<ReassessmentForm>
    | undefined;
  const uploadedReassessments = uploadedClinical.reassessments;

  if (
    !Array.isArray(uploadedReassessments) &&
    legacyReassessment &&
    Object.entries(legacyReassessment).some(
      ([key, value]) => key !== "assessedAt" && Boolean(value),
    )
  ) {
    const migratedAt = new Date().toISOString();
    merged.clinical.reassessments = [
      {
        ...merged.clinical.reassessment,
        assessedAt: legacyReassessment.assessedAt || migratedAt.slice(0, 16),
        id: `legacy-reassessment-${Date.now()}`,
        createdAt: migratedAt,
      } as ReassessmentRecord,
    ];
    merged.clinical.reassessment =
      createDefaultAssessmentForm().clinical.reassessment;
  }

  return merged;
}

type EditableReport = {
  id: string;
  status: string;
  chart: Record<string, unknown>;
} | null;

export default function EPCRClient({ initialReport = null, reviewMode = false, reviewStatus = '' }: { initialReport?: EditableReport; reviewMode?: boolean; reviewStatus?: string }) {
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const [expandedSection, setExpandedSection] = useState<string>("");
  const [fileStatus, setFileStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [reportId, setReportId] = useState(initialReport?.id ?? '');
  const reportIdRef = useRef(initialReport?.id ?? '');
  const chartRef = useRef<Record<string, unknown>>({});
  const lastSavedRef = useRef('');
  const [patientSummaryOpen, setPatientSummaryOpen] = useState(false);
  const [quickToolsOpen, setQuickToolsOpen] = useState(false);
  const [clinicalIntelligenceOpen, setClinicalIntelligenceOpen] =
    useState(false);
  const [mobileDrawer, setMobileDrawer] = useState<
    "patient-summary" | "quick-tools" | null
  >(null);

  useEffect(() => {
    const savedPatientSummary = window.localStorage.getItem(
      "apollo-epcr-patient-summary-open",
    );
    const savedQuickTools = window.localStorage.getItem(
      "apollo-epcr-quick-tools-open",
    );
    const restorePreferences = window.setTimeout(() => {
      if (savedPatientSummary !== null) {
        setPatientSummaryOpen(savedPatientSummary === "true");
      }
      if (savedQuickTools !== null) {
        setQuickToolsOpen(savedQuickTools === "true");
      }
    }, 0);
    return () => window.clearTimeout(restorePreferences);
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      "apollo-epcr-patient-summary-open",
      String(patientSummaryOpen),
    );
  }, [patientSummaryOpen]);

  useEffect(() => {
    window.localStorage.setItem(
      "apollo-epcr-quick-tools-open",
      String(quickToolsOpen),
    );
  }, [quickToolsOpen]);

  const [callForm, setCallForm] = useState<CallForm>(() =>
    ({ ...createDefaultCallForm(), ...((initialReport?.chart.call as Partial<CallForm>) ?? {}) }),
  );
  const [patientForm, setPatientForm] = useState<PatientForm>(() =>
    ({ ...createDefaultPatientForm(), ...((initialReport?.chart.patient as Partial<PatientForm>) ?? {}) }),
  );
  const [complaintForm, setComplaintForm] = useState<ComplaintForm>(() =>
    ({ ...createDefaultComplaintForm(), ...((initialReport?.chart.complaint as Partial<ComplaintForm>) ?? {}) }),
  );
  const [assessmentForm, setAssessmentForm] = useState<AssessmentForm>(() =>
    mergeAssessmentWithDefaults(initialReport?.chart.assessment),
  );
  const [vitalsForm, setVitalsForm] = useState<VitalsForm>(() =>
    mergeVitalsWithDefaults(initialReport?.chart.vitals),
  );
  const [treatmentsForm, setTreatmentsForm] = useState<TreatmentsForm>(() =>
    mergeTreatmentsWithDefaults(initialReport?.chart.treatments),
  );
  const [billingForm, setBillingForm] = useState<BillingForm>(() =>
    mergeBillingWithDefaults(initialReport?.chart.billing),
  );
  const [narrativeForm, setNarrativeForm] = useState<NarrativeForm>(() => ({ ...createDefaultNarrativeForm(), ...((initialReport?.chart.narrative as Partial<NarrativeForm>) ?? {}) }));
  const [signatureForm, setSignatureForm] = useState<SignatureForm>(() => ({ ...createDefaultSignatureForm(), ...((initialReport?.chart.signature as Partial<SignatureForm>) ?? {}) }));
  const [assessmentProgress, setAssessmentProgress] = useState({
    completedFields: 0,
    totalFields: 0,
    tasks: [] as {
      title: string;
      completedFields: number;
      totalFields: number;
    }[],
  });

  const documentingProviderCertification = callForm.crewMembers.find(
    (member) => member.isDocumentingPcr,
  )?.certification;
  const documentingProviderScope =
    documentingProviderCertification === "Paramedic" ? "ALS" : "BLS";
  const patientAge = useMemo(() => {
    if (!patientForm.dateOfBirth) return null;
    const birthDate = new Date(`${patientForm.dateOfBirth}T00:00:00`);
    if (Number.isNaN(birthDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDifference = today.getMonth() - birthDate.getMonth();
    if (
      monthDifference < 0 ||
      (monthDifference === 0 && today.getDate() < birthDate.getDate())
    ) {
      age -= 1;
    }
    return Math.max(age, 0);
  }, [patientForm.dateOfBirth]);
  const assessmentMode = determineAssessmentMode({
    clinicalCategory: complaintForm.clinicalCategory,
    suspectedStroke: complaintForm.suspectedStrokeCva === "Yes",
    possibleTrauma: complaintForm.possibleInjuryTrauma === "Yes",
    behavioralHold: complaintForm.patientPlacedOn5150Hold === "Yes",
    cardiacArrest:
      complaintForm.cardiacArrest !== "" &&
      complaintForm.cardiacArrest !== "No",
  });
  const hasGfastDocumentation = Object.values(
    assessmentForm.clinical.gfast,
  ).some(Boolean);
  const protocolClinicalIntelligenceFeedback =
    callForm.lemsa === "CCEMSA" &&
    (complaintForm.suspectedStrokeCva === "Yes" || hasGfastDocumentation)
      ? getCcemsaGfastConsiderations({
          gaze: assessmentForm.clinical.gfast.gaze,
          face: assessmentForm.clinical.gfast.face,
          arms: assessmentForm.clinical.gfast.arms,
          speech: assessmentForm.clinical.gfast.speech,
          lastKnownNormal: assessmentForm.clinical.gfast.time,
          bloodGlucose: assessmentForm.clinical.gfast.bloodGlucose,
        })
      : [];
  const vitalClinicalIntelligenceFeedback = useMemo(
    () =>
      vitalsForm.sets.flatMap((vitalSet, index) =>
        getAciVitalAlerts(vitalSet, patientAge).map((alert) => ({
          id: `vital-${vitalSet.id}-${alert.id}`,
          severity: alert.severity,
          message: `Vital Set #${index + 1}: ${alert.label} — ${alert.explanation}`,
        })),
      ),
    [patientAge, vitalsForm.sets],
  );
  const clinicalIntelligenceFeedback = [
    ...protocolClinicalIntelligenceFeedback.map((message, index) => ({
      id: `protocol-${index}-${message}`,
      severity: "protocol" as const,
      message,
    })),
    ...vitalClinicalIntelligenceFeedback,
  ];

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
      | ComplaintForm["primaryImpression"]
      | ComplaintForm["otherAssociatedSymptoms"],
  ) {
    setComplaintForm((current) => {
      const next = {
        ...current,
        [field]: value,
      };

      if (field === "patientAcuity") {
        const acuity = value as string;
        const isTrauma =
          acuity === "Non STAT Trauma" || acuity === "STAT Trauma";
        const isCardiacArrest = acuity === "Cardiac Arrest";

        next.possibleInjuryTrauma = isTrauma ? "Yes" : "";
        next.cardiacArrest = isCardiacArrest ? "Yes, Prior to EMS Contact" : "";
      }

      return next;
    });
  }

  const patientProgressTasks = [
    {
      title: "Patient Demographics",
      completedFields: [
        patientForm.unablePatientName
          ? "unable"
          : patientForm.firstName && patientForm.lastName,
        patientForm.unableDateOfBirth ? "unable" : patientForm.dateOfBirth,
        patientForm.unableAge ? "unable" : patientForm.dateOfBirth,
        patientForm.unablePatientAddress
          ? "unable"
          : patientForm.patientStreet &&
            patientForm.patientCity &&
            patientForm.patientZip,
        patientForm.unableGender ? "unable" : patientForm.gender,
        patientForm.unablePhoneNumber ? "unable" : patientForm.phoneNumber,
        patientForm.unableSocialSecurityNumber
          ? "unable"
          : patientForm.socialSecurityNumber,
        patientForm.unableRace ? "unable" : patientForm.race,
      ].filter(Boolean).length,
      totalFields: 8,
    },
    {
      title: "Medical Information",
      completedFields: [
        patientForm.medicalHistory,
        patientForm.surgicalHistory,
        patientForm.currentMedications,
        patientForm.lastOralIntake,
      ].filter(Boolean).length,
      totalFields: 4,
    },
    {
      title: "Allergies",
      completedFields: [
        patientForm.medicationAllergies,
        patientForm.environmentalAllergies,
      ].filter(Boolean).length,
      totalFields: 2,
    },
    {
      title: "Patient Belongings",
      completedFields: [
        patientForm.patientEffects,
        patientForm.patientEffectsLeftWith,
        ...(patientForm.patientEffectsLeftWith === "Other Responding Agency"
          ? [patientForm.patientEffectsLeftWithOther]
          : []),
      ].filter(Boolean).length,
      totalFields:
        2 +
        (patientForm.patientEffectsLeftWith === "Other Responding Agency"
          ? 1
          : 0),
    },
    {
      title: "Patient Outcome",
      completedFields: [
        patientForm.disposition,
        ...(patientForm.disposition === "Transported"
          ? [patientForm.transportedTo]
          : []),
        ...(patientForm.disposition === "RMCT"
          ? [patientForm.refusalType]
          : []),
        ...(patientForm.disposition === "Obvious Death"
          ? [patientForm.obviousDeathCriteria]
          : []),
        ...(patientForm.disposition === "Death Pronounced at Scene"
          ? [patientForm.basisForPronouncement]
          : []),
        ...(patientForm.disposition === "Turnover Patient Care at Scene" ||
        patientForm.disposition === "Canceled by Other Agency at Scene"
          ? [patientForm.dispositionExplanation]
          : []),
      ].filter(Boolean).length,
      totalFields:
        1 +
        (patientForm.disposition === "Transported" ||
        patientForm.disposition === "RMCT" ||
        patientForm.disposition === "Obvious Death" ||
        patientForm.disposition === "Death Pronounced at Scene" ||
        patientForm.disposition === "Turnover Patient Care at Scene" ||
        patientForm.disposition === "Canceled by Other Agency at Scene"
          ? 1
          : 0),
    },
  ];

  const callProgressTasks = [
    {
      title: "Dispatch Information",
      completedFields: [
        callForm.emsResponseNumber,
        callForm.emsIncidentNumber,
        callForm.dispatchedPriority,
      ].filter(Boolean).length,
      totalFields: 3,
    },
    {
      title: "Crew Information",
      completedFields: [
        callForm.respondingUnitNumber,
        callForm.lemsa,
        callForm.crewMembers.length > 0 &&
        callForm.crewMembers.every(
          (member) => member.name && member.certification && member.role,
        )
          ? "crew-complete"
          : "",
        callForm.crewMembers.some((member) => member.isDocumentingPcr)
          ? "documentor-selected"
          : "",
      ].filter(Boolean).length,
      totalFields: 4,
    },
    {
      title: "Response Information",
      completedFields: [
        callForm.dispatchedNatureOfCall,
        callForm.typeOfServiceRequested,
        callForm.responseModeToScene,
      ].filter(Boolean).length,
      totalFields: 3,
    },
    {
      title: "Location Information",
      completedFields: [
        callForm.incidentLocationType,
        ...(callForm.incidentLocationType === "Other"
          ? [callForm.incidentLocationTypeOther]
          : []),
        callForm.incidentStreet,
        callForm.incidentCity,
        callForm.incidentZip,
        callForm.numberOfPatientsAtScene,
        callForm.firstEmsUnitOnScene,
        ...(callForm.otherAgenciesMode === "Add"
          ? [callForm.otherAgenciesOnScene]
          : []),
        callForm.hazardousHealthExposures,
        ...(callForm.hazardousHealthExposures === "Other Exposure"
          ? [callForm.hazardousHealthExposuresOther]
          : []),
        callForm.personalProtectiveEquipmentUsed.length > 0 ? "selected" : "",
        ...(callForm.personalProtectiveEquipmentUsed.includes("Other")
          ? [callForm.personalProtectiveEquipmentOther]
          : []),
      ].filter(Boolean).length,
      totalFields:
        8 +
        (callForm.incidentLocationType === "Other" ? 1 : 0) +
        (callForm.otherAgenciesMode === "Add" ? 1 : 0) +
        (callForm.hazardousHealthExposures === "Other Exposure" ? 1 : 0) +
        (callForm.personalProtectiveEquipmentUsed.includes("Other") ? 1 : 0),
    },
    {
      title: "Times",
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
      title: "Complaint",
      completedFields: [
        complaintForm.chiefComplaint,
        complaintForm.clinicalCategory,
        complaintForm.primaryImpression,
        complaintForm.secondaryImpression,
        complaintForm.primarySymptom,
        complaintForm.symptomsBeganDateTime,
        complaintForm.lastSeenNormalDateTime,
      ].filter(Boolean).length,
      totalFields: 7,
    },
    {
      title: "Circumstances",
      completedFields: [
        complaintForm.patientAcuity,
        complaintForm.possibleInjuryTrauma,
        complaintForm.cardiacArrest,
        complaintForm.suspectedStrokeCva,
        ...(complaintForm.suspectedStrokeCva === "Yes"
          ? [complaintForm.strokeCvaSymptomsResolved]
          : []),
        complaintForm.patientPlacedOn5150Hold,
        complaintForm.possibleDrugAlcoholUse,
        ...(complaintForm.possibleDrugAlcoholUse === "Yes"
          ? [complaintForm.drugAlcoholIndications.length > 0 ? "selected" : ""]
          : []),
        ...(complaintForm.drugAlcoholIndications.some((item) =>
          item.toLowerCase().includes("drug"),
        )
          ? [complaintForm.suspectedDrug]
          : []),
        complaintForm.workRelatedIllnessInjury,
      ].filter(Boolean).length,
      totalFields:
        7 +
        (complaintForm.suspectedStrokeCva === "Yes" ? 1 : 0) +
        (complaintForm.possibleDrugAlcoholUse === "Yes" ? 1 : 0) +
        (complaintForm.drugAlcoholIndications.some((item) =>
          item.toLowerCase().includes("drug"),
        )
          ? 1
          : 0),
    },
  ];

  const vitalsProgress = getVitalsProgress(
    vitalsForm,
    documentingProviderScope,
  );
  const treatmentsProgress = getTreatmentsProgress(treatmentsForm);
  const billingProgress = getBillingProgress(billingForm);
  const narrativeSource = { call: callForm, patient: patientForm, complaint: complaintForm, assessment: assessmentForm, vitals: vitalsForm, treatments: treatmentsForm };
  const currentNarrativeFingerprint = narrativeFingerprint(narrativeSource);
  const narrativeReviewIssues = getNarrativeReviewIssues(narrativeSource);
  const signedSourceFingerprint = JSON.stringify({ ...narrativeSource, narrative: narrativeForm.text });

  const progressSections = [
    {
      title: "Call",
      completedFields: callCompletedRequiredFields,
      totalFields: callTotalRequiredFields,
      tasks: callProgressTasks,
    },
    {
      title: "Patient",
      completedFields: patientCompletedRequiredFields,
      totalFields: patientTotalRequiredFields,
      tasks: patientProgressTasks,
    },
    {
      title: "Complaint",
      completedFields: complaintCompletedRequiredFields,
      totalFields: complaintTotalRequiredFields,
      tasks: complaintProgressTasks,
    },
    {
      title: "Assessment",
      completedFields: assessmentProgress.completedFields,
      totalFields: assessmentProgress.totalFields || 1,
      tasks: assessmentProgress.tasks,
    },
    {
      title: "Vitals",
      completedFields: vitalsProgress.completedFields,
      totalFields: vitalsProgress.totalFields,
      tasks: [
        {
          title: "Required Vital Sets",
          completedFields: vitalsProgress.completedFields,
          totalFields: vitalsProgress.totalFields,
        },
      ],
    },
    {
      title: "Treatments",
      completedFields: treatmentsProgress.completedFields,
      totalFields: treatmentsProgress.totalFields,
      tasks: [
        {
          title: "Treatment Documentation",
          completedFields: treatmentsProgress.completedFields,
          totalFields: treatmentsProgress.totalFields,
        },
      ],
    },
    {
      title: "Billing Information",
      completedFields: billingProgress.completedFields,
      totalFields: billingProgress.totalFields,
      tasks: [
        {
          title: "Billing Information",
          completedFields: billingProgress.completedFields,
          totalFields: billingProgress.totalFields,
        },
      ],
    },
    { title: "Narrative", completedFields: narrativeForm.text.trim() ? 1 : 0, totalFields: 1 },
    { title: "Signatures", completedFields: signatureForm.imageData && signatureForm.sourceFingerprint === signedSourceFingerprint ? 1 : 0, totalFields: 1 },
    ...sections
      .filter(
        (section) =>
          section !== "Call" &&
          section !== "Patient" &&
          section !== "Complaint" &&
          section !== "Assessment" &&
          section !== "Vitals" &&
          section !== "Treatments" &&
          section !== "Billing Information" &&
          section !== "Narrative" &&
          section !== "Signatures",
      )
      .map((section) => ({
        title: section,
        completedFields: 0,
        totalFields: 1,
      })),
  ];

  const totalRequiredFields = progressSections.reduce(
    (total, section) => total + section.totalFields,
    0,
  );
  const completedRequiredFields = progressSections.reduce(
    (total, section) => total + section.completedFields,
    0,
  );
  const overallProgress =
    totalRequiredFields > 0
      ? Math.round((completedRequiredFields / totalRequiredFields) * 100)
      : 0;
  const pcrReadyToSubmit = overallProgress === 100;

  const chartSnapshot = useMemo(() => ({
    call: callForm,
        patient: patientForm,
        complaint: complaintForm,
        assessment: assessmentForm,
        vitals: vitalsForm,
        treatments: treatmentsForm,
        billing: billingForm,
        narrative: narrativeForm,
    signature: signatureForm,
  }), [callForm, patientForm, complaintForm, assessmentForm, vitalsForm, treatmentsForm, billingForm, narrativeForm, signatureForm]);
  const currentChart = () => chartSnapshot;

  useEffect(() => {
    chartRef.current = chartSnapshot;
    reportIdRef.current = reportId;
  }, [chartSnapshot, reportId]);

  async function savePCR(silent = false) {
    if (saving || submitting) return;
    if (!callForm.emsResponseNumber.trim()) {
      if (!silent) setFileStatus('Enter the EMS response number before saving this PCR.');
      return;
    }
    setSaving(true);
    setFileStatus('Saving draft securely...');
    try {
      const response = await fetch('/api/epcr/reports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SAVE_DRAFT', report_id: reportId || undefined, chart: currentChart() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? 'Unable to save draft.');
      setReportId(result.report.id);
      reportIdRef.current = result.report.id;
      lastSavedRef.current = JSON.stringify(chartRef.current);
      if (!silent) setFileStatus('Draft saved. It is now available in My Reports.');
    } catch (error) {
      setFileStatus(error instanceof Error ? error.message : 'Unable to save draft.');
    } finally { setSaving(false); }
  }

  async function saveAndLeave(destination: string, endSession: boolean, fullSignOut = false) {
    if (callForm.emsResponseNumber.trim()) await savePCR(true);
    if (endSession) await fetch(`/api/epcr/session${fullSignOut ? '?full=1' : ''}`, { method: 'DELETE' }).catch(() => null);
    window.location.assign(destination);
  }

  useEffect(() => {
    if (reviewMode) return;
    const persist = () => {
      const chart = chartRef.current;
      const call = chart.call as CallForm | undefined;
      const serialized = JSON.stringify(chart);
      if (!call?.emsResponseNumber?.trim() || serialized === lastSavedRef.current) return;
      void fetch('/api/epcr/reports', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, keepalive: true,
        body: JSON.stringify({ action: 'SAVE_DRAFT', report_id: reportIdRef.current || undefined, chart }),
      }).then(async (response) => {
        if (!response.ok) return;
        const result = await response.json();
        reportIdRef.current = result.report.id;
        setReportId(result.report.id);
        lastSavedRef.current = serialized;
      }).catch(() => null);
    };
    const timer = window.setInterval(persist, 30000);
    const leave = () => {
      persist();
      void fetch('/api/epcr/session', { method: 'DELETE', keepalive: true }).catch(() => null);
    };
    window.addEventListener('pagehide', leave);
    return () => { window.clearInterval(timer); window.removeEventListener('pagehide', leave); };
  }, [reviewMode]);

  async function submitPCR() {
    if (!pcrReadyToSubmit || submitting) return;
    const confirmed = window.confirm(`Submit report ${callForm.emsResponseNumber} for agency review? Once submitted, this copy cannot be edited unless a reviewer rejects it.`);
    if (!confirmed) return;
    setSubmitting(true);
    setFileStatus('Submitting report securely...');
    try {
      const response = await fetch('/api/epcr/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ report_id: reportId || undefined, chart: currentChart() }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error ?? 'Unable to submit report.');
      window.location.assign('/epcr-dashboard/my-reports');
    } catch (error) {
      setFileStatus(error instanceof Error ? error.message : 'Unable to submit report.');
      setSubmitting(false);
    }
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
          vitals?: VitalsForm;
          treatments?: TreatmentsForm;
          billing?: BillingForm;
          narrative?: NarrativeForm;
          signature?: SignatureForm;
        };
        callForm?: CallForm;
        patientForm?: PatientForm;
        complaintForm?: ComplaintForm;
        assessmentForm?: AssessmentForm;
        vitalsForm?: VitalsForm;
        treatmentsForm?: TreatmentsForm;
        billingForm?: BillingForm;
        narrativeForm?: NarrativeForm;
        signatureForm?: SignatureForm;
      };

      const uploadedCallForm = parsed.chart?.call ?? parsed.callForm;
      const uploadedPatientForm =
        parsed.chart?.patient ??
        parsed.patientForm ??
        createDefaultPatientForm();
      const uploadedComplaintForm =
        parsed.chart?.complaint ??
        parsed.complaintForm ??
        createDefaultComplaintForm();
      const uploadedAssessmentForm =
        parsed.chart?.assessment ?? parsed.assessmentForm;
      const uploadedVitalsForm = parsed.chart?.vitals ?? parsed.vitalsForm;
      const uploadedTreatmentsForm =
        parsed.chart?.treatments ?? parsed.treatmentsForm;
      const uploadedBillingForm = parsed.chart?.billing ?? parsed.billingForm;
      const uploadedNarrativeForm = parsed.chart?.narrative ?? parsed.narrativeForm;
      const uploadedSignatureForm = parsed.chart?.signature ?? parsed.signatureForm;

      if (
        parsed.fileType !== "ApolloEMS Mock ePCR" ||
        parsed.fileVersion !== 1 ||
        !uploadedCallForm
      ) {
        throw new Error("Invalid ApolloEMS ePCR file.");
      }

      setCallForm({
        ...createDefaultCallForm(),
        ...uploadedCallForm,
        lemsa: uploadedCallForm.lemsa ?? "",
        crewMembers:
          uploadedCallForm.crewMembers &&
          uploadedCallForm.crewMembers.length > 0
            ? uploadedCallForm.crewMembers
            : [
                {
                  id: "crew-1",
                  name:
                    uploadedCallForm.pcrDocumentedBy ||
                    uploadedCallForm.respondingCrew ||
                    "",
                  certification: "EMT",
                  role: "Primary Care Giver",
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
      setAssessmentForm(mergeAssessmentWithDefaults(uploadedAssessmentForm));
      setVitalsForm(mergeVitalsWithDefaults(uploadedVitalsForm));
      setTreatmentsForm(mergeTreatmentsWithDefaults(uploadedTreatmentsForm));
      setBillingForm(mergeBillingWithDefaults(uploadedBillingForm));
      setNarrativeForm({ ...createDefaultNarrativeForm(), ...(uploadedNarrativeForm ?? {}) });
      setSignatureForm({ ...createDefaultSignatureForm(), ...(uploadedSignatureForm ?? {}) });
      setExpandedSection(parsed.expandedSection || "Call");
      setFileStatus("PCR uploaded successfully.");
    } catch (error) {
      console.error(error);
      setFileStatus(
        "Unable to upload PCR file. Please select a valid ApolloEMS ePCR save file.",
      );
    } finally {
      event.target.value = "";
    }
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(135deg,#031735_0%,#0a438d_52%,#168fd0_100%)] bg-fixed px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-[1600px]">
        <div className="mb-6 rounded-2xl border border-blue-950/30 bg-slate-100 px-5 py-4 shadow-lg shadow-blue-950/20">
          <div className="flex flex-wrap items-center justify-between gap-5">
            <div className="flex min-w-0 items-center gap-5">
              <img
                src="/apollo-logo.png"
                alt="ApolloEMS"
                className="h-24 w-auto max-w-[15rem] shrink-0 object-contain sm:h-28 sm:max-w-[18rem]"
              />
              <h1 className="border-l border-blue-950/20 pl-5 text-3xl font-black tracking-tight text-blue-950 sm:text-4xl">
                {reviewMode ? 'ePCR Review' : 'ePCR'}
              </h1>
            </div>

            <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void saveAndLeave(reviewMode ? '/epcr-dashboard/reports' : '/epcr-dashboard', !reviewMode)}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-blue-950 shadow transition hover:bg-blue-50"
            >
              {reviewMode ? 'Back to Submitted Reports' : 'Return to Dashboard'}
            </button>
            {!reviewMode && <button
              type="button"
              onClick={() => void saveAndLeave('/epcr-account/login', true, true)}
              disabled={saving || submitting}
              className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-semibold text-red-800 shadow transition hover:bg-red-100"
            >
              Sign Out
            </button>}
            {!reviewMode && <>
            <button
              type="button"
              onClick={() => void savePCR()}
              disabled={saving || submitting}
              className="rounded-lg bg-[linear-gradient(135deg,#031735_0%,#0a438d_55%,#168fd0_100%)] px-4 py-2 text-sm font-semibold text-white shadow transition hover:brightness-110"
            >
              {saving ? 'Saving...' : 'Save PCR'}
            </button>

            <button
              type="button"
              onClick={() => uploadInputRef.current?.click()}
              className="rounded-lg border border-blue-300 bg-white px-4 py-2 text-sm font-semibold text-blue-950 shadow transition hover:bg-blue-50"
            >
              Upload PCR
            </button>

            <button
              type="button"
              onClick={submitPCR}
              disabled={!pcrReadyToSubmit || submitting}
              aria-disabled={!pcrReadyToSubmit || submitting}
              title={
                pcrReadyToSubmit
                  ? "Submit this completed PCR for agency review"
                  : `Complete all required fields before submission (${overallProgress}%)`
              }
              className={`rounded-lg px-4 py-2 text-sm font-bold shadow transition ${
                pcrReadyToSubmit
                  ? "bg-emerald-600 text-white ring-2 ring-emerald-200 hover:bg-emerald-700"
                  : "cursor-not-allowed border border-slate-300 bg-slate-200 text-slate-500 shadow-none"
              }`}
            >
              {submitting ? 'Submitting...' : 'Submit PCR'}
            </button>

            <input
              ref={uploadInputRef}
              type="file"
              accept=".apolloepcr,application/json"
              onChange={uploadPCRFromFile}
              className="hidden"
            />
            </>}
          </div>
          </div>
        </div>

        {fileStatus && (
          <div className="mb-6 rounded-lg border border-blue-950/30 bg-slate-100 px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm">
            {fileStatus}
          </div>
        )}

        <PCRProgress sections={progressSections} />

        <div className="mb-4 flex items-center justify-between gap-3 xl:hidden">
          <button
            type="button"
            onClick={() => setMobileDrawer("patient-summary")}
            className="rounded-lg border border-blue-950/30 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-200"
          >
            ☰ Patient Summary
          </button>
          <button
            type="button"
            onClick={() => setMobileDrawer("quick-tools")}
            className="rounded-lg border border-blue-950/30 bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-200"
          >
            {reviewMode ? 'Review Decision ☰' : 'Quick Tools ☰'}
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
                patientSummaryOpen ? "minmax(280px, 320px)" : "52px"
              } minmax(0, 1fr) ${
                reviewMode || quickToolsOpen ? "minmax(280px, 320px)" : "52px"
              }`,
            }}
          >
            <aside className="sticky top-4 min-w-0">
              {patientSummaryOpen ? (
                <div className="overflow-hidden rounded-2xl border border-blue-950/30 bg-slate-100 shadow-lg">
                  <div className="flex items-center justify-between bg-[linear-gradient(135deg,#031735_0%,#0a438d_55%,#168fd0_100%)] px-4 py-3 text-white">
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
                  <div className="bg-slate-100 p-3">
                    <PatientHandoffRail
                      callForm={callForm}
                      patientForm={patientForm}
                      complaintForm={complaintForm}
                      vitalsForm={vitalsForm}
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setPatientSummaryOpen(true)}
                  className="flex min-h-[240px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-blue-950/30 bg-slate-100 px-2 py-4 text-blue-950 shadow-md hover:bg-slate-200"
                  aria-label="Expand patient summary"
                >
                  <span className="font-black">▶</span>
                  <span
                    className="text-xs font-bold uppercase tracking-[0.16em]"
                    style={{
                      writingMode: "vertical-rl",
                      transform: "rotate(180deg)",
                    }}
                  >
                    Patient Summary
                  </span>
                </button>
              )}
            </aside>

            <div className={`min-w-0 space-y-4 ${reviewMode ? '[&_input]:pointer-events-none [&_select]:pointer-events-none [&_textarea]:pointer-events-none [&_canvas]:pointer-events-none' : ''}`}>
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
                        expandedSection === section ? "" : section,
                      )
                    }
                  >
                    {section === "Call" ? (
                      <CallSection
                        callForm={callForm}
                        setCallForm={setCallForm}
                        updateCallForm={updateCallForm}
                      />
                    ) : section === "Patient" ? (
                      <PatientSection
                        patientForm={patientForm}
                        callForm={callForm}
                        setPatientForm={setPatientForm}
                        updatePatientForm={updatePatientForm}
                      />
                    ) : section === "Complaint" ? (
                      <ComplaintSection
                        complaintForm={complaintForm}
                        updateComplaintForm={updateComplaintForm}
                      />
                    ) : section === "Assessment" ? (
                      <AssessmentSection
                        assessmentForm={assessmentForm}
                        onAssessmentFormChange={setAssessmentForm}
                        patientForm={patientForm}
                        onPatientChange={updatePatientForm}
                        providerScope={documentingProviderScope}
                        clinicalCategory={complaintForm.clinicalCategory}
                        complaintSummary={[
                          complaintForm.chiefComplaint,
                          complaintForm.primaryImpression?.description,
                          complaintForm.secondaryImpression?.description,
                          complaintForm.primarySymptom?.description,
                        ].filter(Boolean).join(' ')}
                        suspectedStroke={
                          complaintForm.suspectedStrokeCva === "Yes"
                        }
                        possibleTrauma={
                          complaintForm.possibleInjuryTrauma === "Yes"
                        }
                        behavioralHold={
                          complaintForm.patientPlacedOn5150Hold === "Yes"
                        }
                        cardiacArrest={
                          complaintForm.cardiacArrest !== "" &&
                          complaintForm.cardiacArrest !== "No"
                        }
                        onProgressChange={handleAssessmentProgressChange}
                      />
                    ) : section === "Vitals" ? (
                      <VitalsSection
                        vitalsForm={vitalsForm}
                        setVitalsForm={setVitalsForm}
                        providerScope={documentingProviderScope}
                        patientAge={patientAge}
                      />
                    ) : section === "Treatments" ? (
                      <TreatmentsSection
                        treatmentsForm={treatmentsForm}
                        setTreatmentsForm={setTreatmentsForm}
                        providerScope={documentingProviderScope}
                        crewMembers={callForm.crewMembers}
                        lemsa={callForm.lemsa}
                      />
                    ) : section === "Billing Information" ? (
                      <BillingSection
                        billingForm={billingForm}
                        setBillingForm={setBillingForm}
                      />
                    ) : section === "Narrative" ? (
                      <NarrativeSection value={narrativeForm} onChange={setNarrativeForm} sourceChanged={Boolean(narrativeForm.sourceFingerprint && narrativeForm.sourceFingerprint !== currentNarrativeFingerprint)} reviewIssues={narrativeReviewIssues} onGenerate={(format: Exclude<NarrativeFormat, ''>) => setNarrativeForm({ text: generateNarrative(narrativeSource, format), format, generatedAt: new Date().toISOString(), sourceFingerprint: currentNarrativeFingerprint })} />
                    ) : section === "Signatures" ? (
                      <SignatureSection value={signatureForm} onChange={setSignatureForm} sourceFingerprint={signedSourceFingerprint} />
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
              {reviewMode ? (
                reviewStatus === 'SUBMITTED' ? <ReportReviewActions reportId={initialReport?.id ?? ''} /> : <div className="rounded-2xl border border-slate-200 bg-slate-100 p-5 shadow-lg"><h2 className="text-xl font-black text-slate-950">Review complete</h2><p className="mt-2 text-sm text-slate-600">This report is {reviewStatus.toLowerCase()}.</p></div>
              ) : quickToolsOpen ? (
                <div className="overflow-hidden rounded-2xl border border-blue-950/30 bg-slate-100 shadow-lg">
                  <div className="flex items-center justify-between bg-[linear-gradient(135deg,#031735_0%,#0a438d_55%,#168fd0_100%)] px-4 py-3 text-white">
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
                  <div className="bg-slate-100 p-4">
                    <QuickToolsPanel
                      assessmentForm={assessmentForm}
                      onAssessmentFormChange={setAssessmentForm}
                      vitalsForm={vitalsForm}
                      onVitalsFormChange={setVitalsForm}
                      treatmentsForm={treatmentsForm}
                      onTreatmentsFormChange={setTreatmentsForm}
                      providerScope={documentingProviderScope}
                    />
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setQuickToolsOpen(true)}
                  className="flex min-h-[240px] w-full flex-col items-center justify-center gap-3 rounded-2xl border border-blue-950/30 bg-slate-100 px-2 py-4 text-blue-950 shadow-md hover:bg-slate-200"
                  aria-label="Expand quick tools"
                >
                  <span className="font-black">◀</span>
                  <span
                    className="text-xs font-bold uppercase tracking-[0.16em]"
                    style={{ writingMode: "vertical-rl" }}
                  >
                    Quick Tools
                  </span>
                </button>
              )}
            </aside>
          </div>

          <div className={`min-w-0 space-y-4 xl:hidden ${reviewMode ? '[&_input]:pointer-events-none [&_select]:pointer-events-none [&_textarea]:pointer-events-none [&_canvas]:pointer-events-none' : ''}`}>
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
                      expandedSection === section ? "" : section,
                    )
                  }
                >
                  {section === "Call" ? (
                    <CallSection
                      callForm={callForm}
                      setCallForm={setCallForm}
                      updateCallForm={updateCallForm}
                    />
                  ) : section === "Patient" ? (
                    <PatientSection
                      patientForm={patientForm}
                      callForm={callForm}
                      setPatientForm={setPatientForm}
                      updatePatientForm={updatePatientForm}
                    />
                  ) : section === "Complaint" ? (
                    <ComplaintSection
                      complaintForm={complaintForm}
                      updateComplaintForm={updateComplaintForm}
                    />
                  ) : section === "Assessment" ? (
                    <AssessmentSection
                      assessmentForm={assessmentForm}
                      onAssessmentFormChange={setAssessmentForm}
                      patientForm={patientForm}
                      onPatientChange={updatePatientForm}
                      providerScope={documentingProviderScope}
                      clinicalCategory={complaintForm.clinicalCategory}
                      complaintSummary={[
                        complaintForm.chiefComplaint,
                        complaintForm.primaryImpression?.description,
                        complaintForm.secondaryImpression?.description,
                        complaintForm.primarySymptom?.description,
                      ].filter(Boolean).join(' ')}
                      suspectedStroke={
                        complaintForm.suspectedStrokeCva === "Yes"
                      }
                      possibleTrauma={
                        complaintForm.possibleInjuryTrauma === "Yes"
                      }
                      behavioralHold={
                        complaintForm.patientPlacedOn5150Hold === "Yes"
                      }
                      cardiacArrest={
                        complaintForm.cardiacArrest !== "" &&
                        complaintForm.cardiacArrest !== "No"
                      }
                      onProgressChange={handleAssessmentProgressChange}
                    />
                  ) : section === "Vitals" ? (
                    <VitalsSection
                      vitalsForm={vitalsForm}
                      setVitalsForm={setVitalsForm}
                      providerScope={documentingProviderScope}
                      patientAge={patientAge}
                    />
                  ) : section === "Treatments" ? (
                    <TreatmentsSection
                      treatmentsForm={treatmentsForm}
                      setTreatmentsForm={setTreatmentsForm}
                      providerScope={documentingProviderScope}
                      crewMembers={callForm.crewMembers}
                      lemsa={callForm.lemsa}
                    />
                  ) : section === "Billing Information" ? (
                    <BillingSection
                      billingForm={billingForm}
                      setBillingForm={setBillingForm}
                    />
                  ) : section === "Narrative" ? (
                    <NarrativeSection value={narrativeForm} onChange={setNarrativeForm} sourceChanged={Boolean(narrativeForm.sourceFingerprint && narrativeForm.sourceFingerprint !== currentNarrativeFingerprint)} reviewIssues={narrativeReviewIssues} onGenerate={(format: Exclude<NarrativeFormat, ''>) => setNarrativeForm({ text: generateNarrative(narrativeSource, format), format, generatedAt: new Date().toISOString(), sourceFingerprint: currentNarrativeFingerprint })} />
                  ) : section === "Signatures" ? (
                    <SignatureSection value={signatureForm} onChange={setSignatureForm} sourceFingerprint={signedSourceFingerprint} />
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

        <AciSuggestionFooter
          assessmentForm={assessmentForm}
          assessmentMode={assessmentMode}
          clinicalCategory={complaintForm.clinicalCategory}
          patientAge={patientAge}
          complaintFindings={[
            complaintForm.chiefComplaint,
            complaintForm.clinicalCategory,
            complaintForm.primaryImpression?.description,
            complaintForm.secondaryImpression?.description,
            complaintForm.primarySymptom?.description,
            ...complaintForm.otherAssociatedSymptoms.map(
              (symptom) => symptom.description,
            ),
            complaintForm.patientAcuity,
            complaintForm.possibleInjuryTrauma === "Yes" ? "trauma" : "",
            complaintForm.cardiacArrest,
            complaintForm.suspectedStrokeCva === "Yes" ? "stroke" : "",
            complaintForm.possibleDrugAlcoholUse === "Yes"
              ? "drug or alcohol involvement"
              : "",
          ].filter((value): value is string => Boolean(value))}
          providerScope={documentingProviderScope}
          lemsa={callForm.lemsa}
          feedback={clinicalIntelligenceFeedback}
          open={clinicalIntelligenceOpen}
          onOpenChange={setClinicalIntelligenceOpen}
        />

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
                mobileDrawer === "patient-summary" ? "left-0" : "right-0"
              }`}
            >
              <div className="sticky top-0 z-10 flex items-center justify-between bg-[linear-gradient(135deg,#031735_0%,#0a438d_55%,#168fd0_100%)] px-4 py-3 text-white">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">
                    {mobileDrawer === "patient-summary"
                      ? "Live Clinical Summary"
                      : "Clinical Utilities"}
                  </p>
                  <h2 className="text-lg font-bold">
                    {mobileDrawer === "patient-summary"
                      ? "Patient Handoff"
                      : reviewMode ? "Review Decision" : "Quick Tools"}
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
                {mobileDrawer === "patient-summary" ? (
                  <PatientHandoffRail
                    callForm={callForm}
                    patientForm={patientForm}
                    complaintForm={complaintForm}
                    vitalsForm={vitalsForm}
                  />
                ) : reviewMode ? (
                  reviewStatus === 'SUBMITTED' ? <ReportReviewActions reportId={initialReport?.id ?? ''} /> : <div className="rounded-xl bg-white p-4"><h2 className="font-black">Review complete</h2><p className="mt-2 text-sm text-slate-600">This report is {reviewStatus.toLowerCase()}.</p></div>
                ) : (
                  <QuickToolsPanel
                    assessmentForm={assessmentForm}
                    onAssessmentFormChange={setAssessmentForm}
                    vitalsForm={vitalsForm}
                    onVitalsFormChange={setVitalsForm}
                    treatmentsForm={treatmentsForm}
                    onTreatmentsFormChange={setTreatmentsForm}
                    providerScope={documentingProviderScope}
                  />
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </main>
  );
}
