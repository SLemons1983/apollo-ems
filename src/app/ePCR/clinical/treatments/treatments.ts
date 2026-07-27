export type NoTreatmentReason =
  | ""
  | "No treatment indicated"
  | "Patient refused treatment"
  | "Treatment completed prior to EMS arrival"
  | "Other";

export type TreatmentProtocolSelection = {
  id: string;
  name: string;
  selectedAt: string;
};

export type TreatmentRecord = {
  id: string;
  category: string;
  name: string;
  performedAt: string;
  status: string;
  notes: string;
};

export type TreatmentsForm = {
  selectedProtocols: TreatmentProtocolSelection[];
  records: TreatmentRecord[];
  noTreatmentReason: NoTreatmentReason;
  noTreatmentExplanation: string;
  clinicalNote: string;
};

export type TreatmentsProgress = {
  completedFields: number;
  totalFields: number;
};

export function createDefaultTreatmentsForm(): TreatmentsForm {
  return {
    selectedProtocols: [],
    records: [],
    noTreatmentReason: "",
    noTreatmentExplanation: "",
    clinicalNote: "",
  };
}

export function mergeTreatmentsWithDefaults(
  uploadedTreatments: unknown,
): TreatmentsForm {
  const defaults = createDefaultTreatmentsForm();

  if (
    uploadedTreatments === null ||
    typeof uploadedTreatments !== "object" ||
    Array.isArray(uploadedTreatments)
  ) {
    return defaults;
  }

  const uploaded = uploadedTreatments as Partial<TreatmentsForm>;
  const allowedReasons: NoTreatmentReason[] = [
    "",
    "No treatment indicated",
    "Patient refused treatment",
    "Treatment completed prior to EMS arrival",
    "Other",
  ];

  return {
    selectedProtocols: Array.isArray(uploaded.selectedProtocols)
      ? uploaded.selectedProtocols
      : defaults.selectedProtocols,
    records: Array.isArray(uploaded.records)
      ? uploaded.records
      : defaults.records,
    noTreatmentReason: allowedReasons.includes(
      uploaded.noTreatmentReason as NoTreatmentReason,
    )
      ? (uploaded.noTreatmentReason as NoTreatmentReason)
      : defaults.noTreatmentReason,
    noTreatmentExplanation:
      typeof uploaded.noTreatmentExplanation === "string"
        ? uploaded.noTreatmentExplanation
        : defaults.noTreatmentExplanation,
    clinicalNote:
      typeof uploaded.clinicalNote === "string"
        ? uploaded.clinicalNote
        : defaults.clinicalNote,
  };
}

export function getTreatmentsProgress(
  treatmentsForm: TreatmentsForm,
): TreatmentsProgress {
  const hasTreatment = treatmentsForm.records.length > 0;
  const hasNoTreatmentReason =
    treatmentsForm.noTreatmentReason !== "" &&
    (treatmentsForm.noTreatmentReason !== "Other" ||
      treatmentsForm.noTreatmentExplanation.trim() !== "");

  return {
    completedFields: hasTreatment || hasNoTreatmentReason ? 1 : 0,
    totalFields: 1,
  };
}
