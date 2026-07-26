export type TreatmentKind =
  | 'Medication'
  | 'Procedure'
  | 'Base Hospital Contact'
  | 'Other';

export type TreatmentStatus =
  | 'Performed'
  | 'Attempted'
  | 'Refused'
  | 'Contraindicated'
  | 'Not Indicated'
  | 'Prior to EMS Arrival';

export type ProtocolSelection = {
  id: string;
  name: string;
  startedAt: string;
  relationship: 'Primary' | 'Added' | 'Replaced Previous';
  reason: string;
  baseContactRequired: string;
  authorizationStatus: string;
};

export type TreatmentRecord = {
  id: string;
  createdAt: string;
  performedAt: string;
  kind: TreatmentKind;
  category: string;
  treatment: string;
  protocolId: string;
  status: TreatmentStatus;
  performedBy: string;
  indication: string;
  response: string;
  complications: string;
  notes: string;
  medication: {
    dose: string;
    unit: string;
    route: string;
    rightsConfirmed: boolean;
    weightKg: string;
    protocolDosePerKg: string;
    protocolMaxDose: string;
    concentrationAmount: string;
    concentrationVolumeMl: string;
    durationMinutes: string;
    calculatedDose: string;
    pumpRateMlHr: string;
    dripRate10: string;
    dripRate60: string;
    doseVarianceReason: string;
    controlled: boolean;
    startingQuantity: string;
    wastedQuantity: string;
    remainingQuantity: string;
    wasteReason: string;
    clinicianSignature: string;
    witnessName: string;
    witnessCredential: string;
    witnessSignature: string;
  };
  procedure: {
    site: string;
    side: string;
    attempts: string;
    successful: string;
    verificationRequired: boolean;
    verification: string;
    verificationTime: string;
  };
  baseContact: {
    hospital: string;
    reason: string;
    contactMethod: string;
    contactedPerson: string;
    ordersRequested: string;
    ordersReceived: string;
    readBackConfirmed: string;
    protocolChangeAuthorized: string;
    unsuccessfulReason: string;
  };
  supplies: string[];
};

export type TreatmentsForm = {
  protocols: ProtocolSelection[];
  records: TreatmentRecord[];
  draft: TreatmentRecord;
  noTreatmentReason: string;
  clinicalNote: string;
};

export type TreatmentAlert = {
  id: string;
  severity: 'protocol' | 'moderate' | 'critical';
  message: string;
};

export const PROTOCOL_OPTIONS = [
  'Adult Airway',
  'Adult Altered Mental Status',
  'Adult Allergic Reaction / Anaphylaxis',
  'Adult Behavioral Emergency',
  'Adult Bradycardia',
  'Adult Cardiac Arrest',
  'Adult Chest Pain / Acute Coronary Syndrome',
  'Adult Hyperglycemia / Hypoglycemia',
  'Adult Hypotension / Shock',
  'Adult Pain Management',
  'Adult Respiratory Distress',
  'Adult Seizure',
  'Adult Stroke',
  'Adult Tachydysrhythmia',
  'Adult Trauma',
  'Burns',
  'Obstetric Emergency',
  'Pediatric Airway',
  'Pediatric Allergic Reaction / Anaphylaxis',
  'Pediatric Cardiac Arrest',
  'Pediatric Respiratory Distress',
  'Pediatric Seizure',
  'Pediatric Trauma',
  'Other / Agency-Specific Protocol',
];

export const TREATMENT_CATALOG: Record<string, string[]> = {
  Medications: [
    'Acetaminophen',
    'Adenosine',
    'Albuterol',
    'Amiodarone',
    'Aspirin',
    'Atropine',
    'Calcium Chloride',
    'Dextrose',
    'Diphenhydramine',
    'Epinephrine',
    'Epinephrine Infusion',
    'Fentanyl',
    'Glucagon',
    'Ipratropium',
    'Ketamine',
    'Lidocaine',
    'Magnesium Sulfate',
    'Midazolam',
    'Morphine',
    'Naloxone',
    'Nitroglycerin',
    'Ondansetron',
    'Oral Glucose',
    'Sodium Bicarbonate',
    'Tranexamic Acid',
    'Other Medication',
  ],
  'Airway / Respiratory': [
    'Airway Positioning',
    'Suction',
    'Oropharyngeal Airway',
    'Nasopharyngeal Airway',
    'Oxygen Administration',
    'BVM Ventilation',
    'Nebulized Treatment',
    'CPAP',
    'Supraglottic Airway',
    'Endotracheal Intubation',
    'Cricothyrotomy',
    'Ventilator Management',
  ],
  'Vascular Access': [
    'Peripheral IV',
    'External Jugular IV',
    'Intraosseous Access',
    'Existing Vascular Device Accessed',
  ],
  'Cardiac / Electrical': [
    'Cardiac Monitoring',
    '12-Lead ECG',
    'Defibrillation',
    'Synchronized Cardioversion',
    'Transcutaneous Pacing',
    'Manual CPR',
    'Mechanical CPR',
    'ROSC',
  ],
  'Trauma / General Care': [
    'Hemorrhage Control',
    'Tourniquet',
    'Wound Care',
    'Splinting',
    'Spinal Motion Restriction',
    'Pelvic Binder',
    'Cervical Collar',
    'Patient Positioning',
    'Extrication',
    'Restraints',
    'Cold / Heat Application',
    'Other Supportive Care',
  ],
  'Obstetric / Neonatal': [
    'Childbirth Assistance',
    'Umbilical Cord Care',
    'Neonatal Resuscitation',
    'Maternal Positioning',
    'Other Obstetric Care',
  ],
  'Base Hospital Contact': ['Base Hospital Contact'],
  Other: ['Other Treatment'],
};

const CONTROLLED_MEDICATIONS = new Set([
  'Fentanyl',
  'Ketamine',
  'Midazolam',
  'Morphine',
]);

const VERIFICATION_PROCEDURES = new Set([
  'Endotracheal Intubation',
  'Supraglottic Airway',
  'Splinting',
  'Tourniquet',
  'CPAP',
  'Nebulized Treatment',
  'Synchronized Cardioversion',
  'Defibrillation',
  'Transcutaneous Pacing',
  'Peripheral IV',
  'External Jugular IV',
  'Intraosseous Access',
  'Pelvic Binder',
]);

export function toLocalTreatmentTime(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function createEmptyTreatment(
  performedAt = '',
): TreatmentRecord {
  return {
    id: '',
    createdAt: '',
    performedAt,
    kind: 'Procedure',
    category: '',
    treatment: '',
    protocolId: '',
    status: 'Performed',
    performedBy: 'Primary clinician',
    indication: '',
    response: '',
    complications: 'None',
    notes: '',
    medication: {
      dose: '',
      unit: '',
      route: '',
      rightsConfirmed: false,
      weightKg: '',
      protocolDosePerKg: '',
      protocolMaxDose: '',
      concentrationAmount: '',
      concentrationVolumeMl: '',
      durationMinutes: '',
      calculatedDose: '',
      pumpRateMlHr: '',
      dripRate10: '',
      dripRate60: '',
      doseVarianceReason: '',
      controlled: false,
      startingQuantity: '',
      wastedQuantity: '',
      remainingQuantity: '',
      wasteReason: '',
      clinicianSignature: '',
      witnessName: '',
      witnessCredential: '',
      witnessSignature: '',
    },
    procedure: {
      site: '',
      side: '',
      attempts: '',
      successful: '',
      verificationRequired: false,
      verification: '',
      verificationTime: '',
    },
    baseContact: {
      hospital: '',
      reason: '',
      contactMethod: '',
      contactedPerson: '',
      ordersRequested: '',
      ordersReceived: '',
      readBackConfirmed: '',
      protocolChangeAuthorized: '',
      unsuccessfulReason: '',
    },
    supplies: [],
  };
}

export function createDefaultTreatmentsForm(): TreatmentsForm {
  return {
    protocols: [],
    records: [],
    draft: createEmptyTreatment(),
    noTreatmentReason: '',
    clinicalNote: '',
  };
}

export function mergeTreatmentsWithDefaults(value: unknown): TreatmentsForm {
  const defaults = createDefaultTreatmentsForm();
  if (!value || typeof value !== 'object' || Array.isArray(value)) return defaults;
  const uploaded = value as Partial<TreatmentsForm>;
  return {
    protocols: Array.isArray(uploaded.protocols) ? uploaded.protocols : [],
    records: Array.isArray(uploaded.records) ? uploaded.records : [],
    draft: {
      ...defaults.draft,
      ...(uploaded.draft ?? {}),
      medication: {
        ...defaults.draft.medication,
        ...(uploaded.draft?.medication ?? {}),
      },
      procedure: {
        ...defaults.draft.procedure,
        ...(uploaded.draft?.procedure ?? {}),
      },
      baseContact: {
        ...defaults.draft.baseContact,
        ...(uploaded.draft?.baseContact ?? {}),
      },
      supplies: Array.isArray(uploaded.draft?.supplies)
        ? uploaded.draft.supplies
        : [],
    },
    noTreatmentReason: uploaded.noTreatmentReason ?? '',
    clinicalNote: uploaded.clinicalNote ?? '',
  };
}

export function hydrateTreatmentSelection(
  draft: TreatmentRecord,
  category: string,
  treatment: string,
): TreatmentRecord {
  const medication = category === 'Medications';
  const controlled = CONTROLLED_MEDICATIONS.has(treatment);
  const verificationRequired = VERIFICATION_PROCEDURES.has(treatment);
  return {
    ...draft,
    kind:
      category === 'Medications'
        ? 'Medication'
        : category === 'Base Hospital Contact'
          ? 'Base Hospital Contact'
          : category === 'Other'
            ? 'Other'
            : 'Procedure',
    category,
    treatment,
    medication: {
      ...draft.medication,
      controlled,
    },
    procedure: {
      ...draft.procedure,
      verificationRequired: medication ? false : verificationRequired,
    },
  };
}

export function calculateMedication(
  weightKgValue: string,
  dosePerKgValue: string,
  concentrationAmountValue: string,
  concentrationVolumeValue: string,
  durationMinutesValue: string,
) {
  const weightKg = Number(weightKgValue);
  const dosePerKg = Number(dosePerKgValue);
  const concentrationAmount = Number(concentrationAmountValue);
  const concentrationVolume = Number(concentrationVolumeValue);
  const durationMinutes = Number(durationMinutesValue);
  const calculatedDose = weightKg * dosePerKg;
  const concentrationPerMl = concentrationAmount / concentrationVolume;
  const volumeMl = calculatedDose / concentrationPerMl;
  const pumpRateMlHr =
    durationMinutes > 0 ? (volumeMl * 60) / durationMinutes : 0;
  return {
    calculatedDose:
      Number.isFinite(calculatedDose) && calculatedDose > 0
        ? String(Number(calculatedDose.toFixed(3)))
        : '',
    pumpRateMlHr:
      Number.isFinite(pumpRateMlHr) && pumpRateMlHr > 0
        ? String(Number(pumpRateMlHr.toFixed(1)))
        : '',
    dripRate10:
      Number.isFinite(pumpRateMlHr) && pumpRateMlHr > 0
        ? String(Math.round((pumpRateMlHr * 10) / 60))
        : '',
    dripRate60:
      Number.isFinite(pumpRateMlHr) && pumpRateMlHr > 0
        ? String(Math.round(pumpRateMlHr))
        : '',
  };
}

export function getSuggestedProtocols(input: {
  clinicalCategory: string;
  chiefComplaint: string;
  suspectedStroke: boolean;
  possibleTrauma: boolean;
  cardiacArrest: boolean;
}) {
  const text = `${input.clinicalCategory} ${input.chiefComplaint}`.toLowerCase();
  const suggestions: string[] = [];
  if (input.cardiacArrest) suggestions.push('Adult Cardiac Arrest');
  if (input.suspectedStroke || text.includes('stroke'))
    suggestions.push('Adult Stroke');
  if (input.possibleTrauma || text.includes('trauma'))
    suggestions.push('Adult Trauma');
  if (text.includes('chest') || text.includes('cardiac'))
    suggestions.push('Adult Chest Pain / Acute Coronary Syndrome');
  if (
    text.includes('shortness') ||
    text.includes('respiratory') ||
    text.includes('breath')
  )
    suggestions.push('Adult Respiratory Distress');
  if (text.includes('allerg') || text.includes('anaph'))
    suggestions.push('Adult Allergic Reaction / Anaphylaxis');
  if (text.includes('seiz')) suggestions.push('Adult Seizure');
  if (text.includes('behavior') || text.includes('psychi'))
    suggestions.push('Adult Behavioral Emergency');
  if (text.includes('pain')) suggestions.push('Adult Pain Management');
  return [...new Set(suggestions)].slice(0, 3);
}

export function getSuggestedTreatments(protocolNames: string[]) {
  const text = protocolNames.join(' ').toLowerCase();
  const suggestions: string[] = [];
  if (text.includes('chest pain')) {
    suggestions.push('Cardiac Monitoring', '12-Lead ECG', 'Aspirin', 'Peripheral IV');
  }
  if (text.includes('respiratory')) {
    suggestions.push('Oxygen Administration', 'Nebulized Treatment', 'CPAP');
  }
  if (text.includes('stroke')) {
    suggestions.push('Cardiac Monitoring', 'Peripheral IV', '12-Lead ECG');
  }
  if (text.includes('cardiac arrest')) {
    suggestions.push('Manual CPR', 'Defibrillation', 'Epinephrine', 'Supraglottic Airway');
  }
  if (text.includes('trauma')) {
    suggestions.push('Hemorrhage Control', 'Spinal Motion Restriction', 'Peripheral IV');
  }
  if (text.includes('allergic')) {
    suggestions.push('Epinephrine', 'Diphenhydramine', 'Albuterol', 'Peripheral IV');
  }
  if (text.includes('pain')) suggestions.push('Fentanyl', 'Acetaminophen');
  return [...new Set(suggestions)].slice(0, 8);
}

export function getTreatmentAlerts(form: TreatmentsForm): TreatmentAlert[] {
  const alerts: TreatmentAlert[] = [];
  form.records.forEach((record, index) => {
    const label = `${record.treatment || 'Treatment'} (#${index + 1})`;
    if (record.kind === 'Medication') {
      const dose = Number(record.medication.dose);
      const max = Number(record.medication.protocolMaxDose);
      if (dose > 0 && max > 0 && dose > max) {
        alerts.push({
          id: `${record.id}-max-dose`,
          severity: 'critical',
          message: `${label}: entered dose ${record.medication.dose} ${record.medication.unit} exceeds the documented protocol maximum of ${record.medication.protocolMaxDose} ${record.medication.unit}.`,
        });
      }
      if (!record.medication.rightsConfirmed) {
        alerts.push({
          id: `${record.id}-rights`,
          severity: 'moderate',
          message: `${label}: medication rights have not been confirmed.`,
        });
      }
      if (
        record.medication.controlled &&
        Number(record.medication.wastedQuantity) > 0 &&
        (!record.medication.clinicianSignature ||
          !record.medication.witnessSignature)
      ) {
        alerts.push({
          id: `${record.id}-waste`,
          severity: 'critical',
          message: `${label}: controlled-medication waste requires clinician and medically trained witness signatures.`,
        });
      }
      const starting = Number(record.medication.startingQuantity);
      const administered = Number(record.medication.dose);
      const wasted = Number(record.medication.wastedQuantity);
      const remaining = Number(record.medication.remainingQuantity);
      if (
        record.medication.controlled &&
        starting > 0 &&
        Math.abs(starting - administered - wasted - remaining) > 0.001
      ) {
        alerts.push({
          id: `${record.id}-reconciliation`,
          severity: 'critical',
          message: `${label}: controlled-medication quantities do not reconcile. Starting quantity must equal administered, wasted, and remaining quantities.`,
        });
      }
    }
    if (
      record.procedure.verificationRequired &&
      !record.procedure.verification
    ) {
      alerts.push({
        id: `${record.id}-verification`,
        severity: 'moderate',
        message: `${label}: required post-procedure verification is pending.`,
      });
    }
    if (record.response === 'Not yet reassessed' || !record.response) {
      alerts.push({
        id: `${record.id}-response`,
        severity: 'protocol',
        message: `${label}: document the patient response or reassessment when available.`,
      });
    }
  });
  return alerts;
}

export function getTreatmentsProgress(form: TreatmentsForm) {
  if (form.noTreatmentReason) {
    return { completedFields: 1, totalFields: 1 };
  }
  if (form.protocols.length === 0 && form.records.length === 0) {
    return { completedFields: 0, totalFields: 2 };
  }
  return {
    completedFields:
      (form.protocols.length > 0 ? 1 : 0) + (form.records.length > 0 ? 1 : 0),
    totalFields: 2,
  };
}

export function formatTreatmentTime(value: string) {
  if (!value) return 'Time not documented';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}
