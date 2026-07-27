export type ProviderScope = "ALS" | "BLS";

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

export type MedicationDetails = {
  medication: string;
  indication: string;
  dose: string;
  unit: string;
  concentration: string;
  route: string;
  authorizationType: string;
  orderingPhysician: string;
};

export type TreatmentRecord = {
  id: string;
  category: string;
  subcategory?: string;
  name: string;
  performedAt: string;
  status: string;
  performedById?: string;
  performedByName?: string;
  providerLevel?: string;
  assistedByIds?: string[];
  assistedByNames?: string[];
  otherProviderName?: string;
  otherProviderAgency?: string;
  attempts?: string;
  patientResponse?: string;
  complications?: string;
  medication?: MedicationDetails;
  protocolIds?: string[];
  notes: string;
};

export type TreatmentsForm = {
  selectedProtocols: TreatmentProtocolSelection[];
  records: TreatmentRecord[];
  noTreatmentReason: NoTreatmentReason;
  noTreatmentExplanation: string;
  clinicalNote: string;
};

export type TreatmentCatalogItem = {
  category: string;
  subcategory: string;
  name: string;
  scope: ProviderScope;
  protocolKeywords: string[];
};

export const MEDICATION_CATEGORY = "Medication Administration";
export const LEGACY_MEDICATION_CATEGORY = "Medication Administered";

export function isMedicationCategory(category: string) {
  return (
    category === MEDICATION_CATEGORY || category === LEGACY_MEDICATION_CATEGORY
  );
}

export const treatmentCatalog: TreatmentCatalogItem[] = [
  [
    "Airway Management",
    "Basic Airway",
    "Airway positioning",
    "BLS",
    ["Airway"],
  ],
  [
    "Airway Management",
    "Basic Airway",
    "Manual airway opening",
    "BLS",
    ["Airway"],
  ],
  [
    "Airway Management",
    "Airway Adjuncts",
    "Oropharyngeal airway (OPA)",
    "BLS",
    ["Airway"],
  ],
  [
    "Airway Management",
    "Airway Adjuncts",
    "Nasopharyngeal airway (NPA)",
    "BLS",
    ["Airway"],
  ],
  [
    "Airway Management",
    "Airway Clearance",
    "Airway suction",
    "BLS",
    ["Airway"],
  ],
  [
    "Airway Management",
    "Advanced Airway",
    "Supraglottic airway",
    "ALS",
    ["Airway", "Cardiac Arrest"],
  ],
  [
    "Airway Management",
    "Advanced Airway",
    "Endotracheal intubation",
    "ALS",
    ["Airway"],
  ],
  ["Airway Management", "Advanced Airway", "Cricothyrotomy", "ALS", ["Airway"]],
  [
    "Respiratory Support",
    "Oxygen Delivery",
    "Nasal cannula",
    "BLS",
    ["Respiratory", "General Procedures"],
  ],
  [
    "Respiratory Support",
    "Oxygen Delivery",
    "Non-rebreather mask",
    "BLS",
    ["Respiratory", "General Procedures"],
  ],
  [
    "Respiratory Support",
    "Ventilatory Support",
    "Bag-valve-mask ventilation",
    "BLS",
    ["Airway", "Respiratory"],
  ],
  [
    "Respiratory Support",
    "Ventilatory Support",
    "CPAP",
    "ALS",
    ["Respiratory"],
  ],
  [
    "Respiratory Support",
    "Thoracic Procedure",
    "Needle thoracostomy / decompression",
    "ALS",
    ["Trauma", "Respiratory"],
  ],
  [
    "Cardiac Care",
    "Monitoring",
    "Cardiac monitor applied",
    "ALS",
    ["Chest Pain", "Cardiac"],
  ],
  [
    "Cardiac Care",
    "Monitoring",
    "12-lead ECG acquired",
    "ALS",
    ["Chest Pain", "Cardiac"],
  ],
  [
    "Cardiac Care",
    "Electrical Therapy",
    "Automated external defibrillation (AED)",
    "BLS",
    ["Cardiac Arrest"],
  ],
  [
    "Cardiac Care",
    "Electrical Therapy",
    "Manual defibrillation",
    "ALS",
    ["Cardiac Arrest"],
  ],
  [
    "Cardiac Care",
    "Electrical Therapy",
    "Synchronized cardioversion",
    "ALS",
    ["Tachyarrhythmias"],
  ],
  [
    "Cardiac Care",
    "Electrical Therapy",
    "Transcutaneous pacing",
    "ALS",
    ["Bradycardia"],
  ],
  [
    "Resuscitation",
    "CPR",
    "Manual CPR",
    "BLS",
    ["Cardiac Arrest", "Traumatic Arrest"],
  ],
  [
    "Resuscitation",
    "CPR",
    "Mechanical CPR device",
    "ALS",
    ["Cardiac Arrest", "Traumatic Arrest"],
  ],
  ["Resuscitation", "Post-ROSC Care", "Post-ROSC care bundle", "ALS", ["ROSC"]],
  [
    "Vascular Access",
    "Intravenous Access",
    "Peripheral IV access",
    "ALS",
    ["General Procedures"],
  ],
  [
    "Vascular Access",
    "Intraosseous Access",
    "Intraosseous access",
    "ALS",
    ["General Procedures", "Cardiac Arrest"],
  ],
  [
    "Vascular Access",
    "Existing Access",
    "Existing vascular access used",
    "ALS",
    ["General Procedures"],
  ],
  [
    "Diagnostic / Monitoring",
    "Glucose",
    "Blood glucose measurement",
    "BLS",
    ["ALOC", "Hyperglycemia"],
  ],
  [
    "Diagnostic / Monitoring",
    "Oximetry",
    "Pulse oximetry",
    "BLS",
    ["Respiratory"],
  ],
  [
    "Diagnostic / Monitoring",
    "Capnography",
    "Waveform capnography",
    "ALS",
    ["Airway", "Respiratory"],
  ],
  [
    "Diagnostic / Monitoring",
    "Stroke",
    "Stroke screening assessment",
    "BLS",
    ["Stroke"],
  ],
  [
    "Diagnostic / Monitoring",
    "Temperature",
    "Temperature measurement",
    "BLS",
    ["Hyperthermia", "Hypothermia"],
  ],
  [
    "Trauma Care",
    "Wound Care",
    "Wound cleansing / dressing",
    "BLS",
    ["Trauma"],
  ],
  ["Trauma Care", "Burn Care", "Burn dressing", "BLS", ["Burns"]],
  [
    "Trauma Care",
    "Chest Injury",
    "Occlusive chest dressing",
    "BLS",
    ["Trauma"],
  ],
  ["Trauma Care", "Evisceration", "Evisceration dressing", "BLS", ["Trauma"]],
  [
    "Hemorrhage Control",
    "Direct Control",
    "Direct pressure",
    "BLS",
    ["Trauma", "TXA"],
  ],
  [
    "Hemorrhage Control",
    "Tourniquet",
    "Tourniquet application",
    "BLS",
    ["Trauma", "TXA"],
  ],
  [
    "Hemorrhage Control",
    "Wound Packing",
    "Hemostatic dressing / wound packing",
    "BLS",
    ["Trauma", "TXA"],
  ],
  [
    "Immobilization / Patient Movement",
    "Extremity",
    "Rigid splint",
    "BLS",
    ["Trauma"],
  ],
  [
    "Immobilization / Patient Movement",
    "Extremity",
    "Vacuum splint",
    "BLS",
    ["Trauma"],
  ],
  [
    "Immobilization / Patient Movement",
    "Extremity",
    "Traction splint",
    "BLS",
    ["Trauma"],
  ],
  [
    "Immobilization / Patient Movement",
    "Spinal Motion Restriction",
    "Cervical collar",
    "BLS",
    ["Spinal Motion Restriction"],
  ],
  [
    "Immobilization / Patient Movement",
    "Spinal Motion Restriction",
    "Spinal motion restriction",
    "BLS",
    ["Spinal Motion Restriction"],
  ],
  [
    "Immobilization / Patient Movement",
    "Pelvic Injury",
    "Pelvic binder",
    "BLS",
    ["Trauma"],
  ],
  [
    "Immobilization / Patient Movement",
    "Patient Movement",
    "Patient positioning",
    "BLS",
    ["General Procedures"],
  ],
  [
    "Medical Procedures",
    "Gastrointestinal",
    "Nasogastric / orogastric tube",
    "ALS",
    ["General Procedures"],
  ],
  [
    "Medical Procedures",
    "Pain / Comfort",
    "Cold pack applied",
    "BLS",
    ["Pain Management"],
  ],
  [
    "Medical Procedures",
    "Pain / Comfort",
    "Heat pack applied",
    "BLS",
    ["Pain Management"],
  ],
  [
    "Obstetric / Newborn Care",
    "Delivery",
    "Emergency childbirth assistance",
    "BLS",
    ["OB-GYN"],
  ],
  [
    "Obstetric / Newborn Care",
    "Newborn",
    "Newborn warming / drying / stimulation",
    "BLS",
    ["Newborn Resuscitation"],
  ],
  [
    "Obstetric / Newborn Care",
    "Newborn",
    "Umbilical cord clamping / cutting",
    "BLS",
    ["Newborn Resuscitation"],
  ],
  [
    "Obstetric / Newborn Care",
    "Newborn",
    "Newborn resuscitation",
    "ALS",
    ["Newborn Resuscitation"],
  ],
  [
    "Behavioral / Safety",
    "Restraint",
    "Physical restraint",
    "BLS",
    ["Behavioral"],
  ],
  [
    "Behavioral / Safety",
    "De-escalation",
    "Verbal de-escalation",
    "BLS",
    ["Behavioral"],
  ],
  [
    "Environmental / Toxicological",
    "Decontamination",
    "Gross decontamination",
    "BLS",
    ["Hazardous", "Organophosphates"],
  ],
  [
    "Environmental / Toxicological",
    "Temperature Management",
    "Active cooling",
    "BLS",
    ["Hyperthermia"],
  ],
  [
    "Environmental / Toxicological",
    "Temperature Management",
    "Active warming",
    "BLS",
    ["Hypothermia"],
  ],
  [
    MEDICATION_CATEGORY,
    "Respiratory Medication",
    "Albuterol",
    "BLS",
    ["Respiratory"],
  ],
  [
    MEDICATION_CATEGORY,
    "Respiratory Medication",
    "Ipratropium",
    "ALS",
    ["Respiratory"],
  ],
  [
    MEDICATION_CATEGORY,
    "Allergy / Anaphylaxis",
    "Epinephrine",
    "BLS",
    ["Allergic", "Anaphylactic"],
  ],
  [
    MEDICATION_CATEGORY,
    "Allergy / Anaphylaxis",
    "Diphenhydramine",
    "ALS",
    ["Allergic", "Anaphylactic"],
  ],
  [MEDICATION_CATEGORY, "Cardiac Medication", "Aspirin", "BLS", ["Chest Pain"]],
  [
    MEDICATION_CATEGORY,
    "Cardiac Medication",
    "Nitroglycerin",
    "ALS",
    ["Chest Pain"],
  ],
  [
    MEDICATION_CATEGORY,
    "Cardiac Medication",
    "Adenosine",
    "ALS",
    ["Tachyarrhythmias"],
  ],
  [
    MEDICATION_CATEGORY,
    "Cardiac Medication",
    "Amiodarone",
    "ALS",
    ["Cardiac Arrest", "Tachyarrhythmias"],
  ],
  [
    MEDICATION_CATEGORY,
    "Cardiac Medication",
    "Atropine",
    "ALS",
    ["Bradycardia"],
  ],
  [
    MEDICATION_CATEGORY,
    "Cardiac Medication",
    "Epinephrine (cardiac)",
    "ALS",
    ["Cardiac Arrest", "Bradycardia"],
  ],
  [
    MEDICATION_CATEGORY,
    "Analgesia",
    "Acetaminophen",
    "BLS",
    ["Pain Management"],
  ],
  [MEDICATION_CATEGORY, "Analgesia", "Fentanyl", "ALS", ["Pain Management"]],
  [MEDICATION_CATEGORY, "Analgesia", "Ketamine", "ALS", ["Pain Management"]],
  [MEDICATION_CATEGORY, "Analgesia", "Morphine", "ALS", ["Pain Management"]],
  [MEDICATION_CATEGORY, "Neurologic", "Midazolam", "ALS", ["Seizures"]],
  [
    MEDICATION_CATEGORY,
    "Glucose Management",
    "Oral glucose",
    "BLS",
    ["ALOC", "Hyperglycemia"],
  ],
  [MEDICATION_CATEGORY, "Glucose Management", "Dextrose", "ALS", ["ALOC"]],
  [MEDICATION_CATEGORY, "Glucose Management", "Glucagon", "ALS", ["ALOC"]],
  [
    MEDICATION_CATEGORY,
    "Overdose / Toxicology",
    "Naloxone",
    "BLS",
    ["ALOC", "Poisonings"],
  ],
  [MEDICATION_CATEGORY, "Nausea / Vomiting", "Ondansetron", "ALS", ["Nausea"]],
  [MEDICATION_CATEGORY, "Hemorrhage", "Tranexamic acid (TXA)", "ALS", ["TXA"]],
  [MEDICATION_CATEGORY, "Fluids", "Normal saline", "ALS", ["Shock", "Sepsis"]],
  [
    MEDICATION_CATEGORY,
    "Fluids",
    "Lactated Ringer's",
    "ALS",
    ["Shock", "Sepsis", "Trauma", "Burns"],
  ],
  [
    MEDICATION_CATEGORY,
    "Other Medication",
    "Other medication",
    "BLS",
    ["General Procedures"],
  ],
  [
    "Other Treatment / Procedure",
    "Other",
    "Other treatment / procedure",
    "BLS",
    ["General Procedures"],
  ],
].map(([category, subcategory, name, scope, protocolKeywords]) => ({
  category: category as string,
  subcategory: subcategory as string,
  name: name as string,
  scope: scope as ProviderScope,
  protocolKeywords: protocolKeywords as string[],
}));

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
    !uploadedTreatments ||
    typeof uploadedTreatments !== "object" ||
    Array.isArray(uploadedTreatments)
  )
    return defaults;

  const uploaded = uploadedTreatments as Partial<TreatmentsForm>;
  const allowedReasons: NoTreatmentReason[] = [
    "",
    "No treatment indicated",
    "Patient refused treatment",
    "Treatment completed prior to EMS arrival",
    "Other",
  ];
  const records = Array.isArray(uploaded.records)
    ? uploaded.records.filter((record): record is TreatmentRecord =>
        Boolean(record && typeof record === "object"),
      )
    : [];

  return {
    selectedProtocols: Array.isArray(uploaded.selectedProtocols)
      ? uploaded.selectedProtocols
      : [],
    records,
    noTreatmentReason: allowedReasons.includes(
      uploaded.noTreatmentReason as NoTreatmentReason,
    )
      ? (uploaded.noTreatmentReason as NoTreatmentReason)
      : "",
    noTreatmentExplanation:
      typeof uploaded.noTreatmentExplanation === "string"
        ? uploaded.noTreatmentExplanation
        : "",
    clinicalNote:
      typeof uploaded.clinicalNote === "string" ? uploaded.clinicalNote : "",
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
