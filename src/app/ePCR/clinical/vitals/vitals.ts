export type ProviderScope = 'ALS' | 'BLS';
export type VitalSource = 'Manual' | 'Device Imported';
export type BloodPressureMethod = 'Auscultated' | 'Palpated';
export type VitalSeverity = 'normal' | 'mild' | 'moderate' | 'critical';

export type VitalAssessment = {
  severity: VitalSeverity;
  label: string;
  explanation: string;
};

export type AciVitalAlert = VitalAssessment & {
  id: string;
};

export type VitalSetDraft = {
  recordedAt: string;
  unableToAssess: string;
  unableToAssessReason: string;
  source: VitalSource;
  bloodPressureMethod: BloodPressureMethod;
  systolic: string;
  diastolic: string;
  heartRate: string;
  pulseQuality: string;
  respiratoryRate: string;
  respiratoryQuality: string;
  spo2: string;
  spco: string;
  etco2: string;
  gcsEyes: string;
  gcsVerbal: string;
  gcsMotor: string;
  gcs: string;
  temperature: string;
  temperatureCelsius: string;
  temperatureRoute: string;
  skinColor: string;
  skinTemperature: string;
  skinMoisture: string;
  oxygenDevice: string;
  oxygenFlow: string;
  cardiacRhythm: string;
};

export type VitalSetRecord = VitalSetDraft & {
  id: string;
  createdAt: string;
};

export type VitalsForm = {
  draft: VitalSetDraft;
  sets: VitalSetRecord[];
};

export function toLocalDateTimeValue(date = new Date()) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export function createEmptyVitalSet(
  recordedAt = '',
): VitalSetDraft {
  return {
    recordedAt,
    unableToAssess: '',
    unableToAssessReason: '',
    source: 'Manual',
    bloodPressureMethod: 'Auscultated',
    systolic: '',
    diastolic: '',
    heartRate: '',
    pulseQuality: '',
    respiratoryRate: '',
    respiratoryQuality: '',
    spo2: '',
    spco: '',
    etco2: '',
    gcsEyes: '',
    gcsVerbal: '',
    gcsMotor: '',
    gcs: '',
    temperature: '',
    temperatureCelsius: '',
    temperatureRoute: '',
    skinColor: '',
    skinTemperature: '',
    skinMoisture: '',
    oxygenDevice: '',
    oxygenFlow: '',
    cardiacRhythm: '',
  };
}

export function createDefaultVitalsForm(): VitalsForm {
  return {
    draft: createEmptyVitalSet(),
    sets: [],
  };
}

export function mergeVitalsWithDefaults(
  uploadedVitals: unknown,
): VitalsForm {
  const defaults = createDefaultVitalsForm();

  if (
    !uploadedVitals ||
    typeof uploadedVitals !== 'object' ||
    Array.isArray(uploadedVitals)
  ) {
    return defaults;
  }

  const uploaded = uploadedVitals as Partial<VitalsForm>;
  const sets = Array.isArray(uploaded.sets)
    ? uploaded.sets.map((set) => ({
        ...createEmptyVitalSet(),
        ...set,
      }))
    : [];

  return {
    draft: {
      ...createEmptyVitalSet(),
      ...(uploaded.draft ?? {}),
    },
    sets,
  };
}

export function getVitalRequiredValues(
  vital: VitalSetDraft,
  _providerScope: ProviderScope,
) {
  if (vital.unableToAssess === 'Yes') {
    return [vital.recordedAt, vital.unableToAssessReason];
  }
  return [
    vital.recordedAt,
    vital.bloodPressureMethod,
    vital.systolic,
    ...(vital.bloodPressureMethod === 'Auscultated'
      ? [vital.diastolic]
      : []),
    vital.heartRate,
    vital.pulseQuality,
    vital.respiratoryRate,
    vital.respiratoryQuality,
    vital.spo2,
    vital.gcs,
    vital.skinColor,
    vital.skinTemperature,
    vital.skinMoisture,
  ];
}

export function isVitalSetComplete(
  vital: VitalSetDraft,
  providerScope: ProviderScope,
) {
  return (
    getVitalRequiredValues(vital, providerScope).every(
      (value) => value.trim() !== '',
    ) &&
    getVitalValidationErrors(vital).length === 0
  );
}

const numericLimits: Partial<
  Record<keyof VitalSetDraft, { minimum: number; maximum: number; label: string }>
> = {
  systolic: { minimum: 20, maximum: 300, label: 'Systolic BP' },
  diastolic: { minimum: 10, maximum: 200, label: 'Diastolic BP' },
  heartRate: { minimum: 0, maximum: 300, label: 'Heart rate' },
  respiratoryRate: { minimum: 0, maximum: 100, label: 'Respiratory rate' },
  spo2: { minimum: 0, maximum: 100, label: 'SpO₂' },
  spco: { minimum: 0, maximum: 100, label: 'SpCO' },
  etco2: { minimum: 0, maximum: 150, label: 'ETCO₂' },
  gcs: { minimum: 3, maximum: 15, label: 'GCS' },
  temperature: { minimum: 75, maximum: 115, label: 'Temperature °F' },
  temperatureCelsius: {
    minimum: 23.9,
    maximum: 46.1,
    label: 'Temperature °C',
  },
};

export function getVitalFieldError(
  vital: VitalSetDraft,
  field: keyof VitalSetDraft,
) {
  const value = vital[field].trim();
  const limit = numericLimits[field];
  if (!value || !limit) return '';

  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return `${limit.label} must be a number.`;
  if (numeric < limit.minimum || numeric > limit.maximum) {
    return `${limit.label} must be between ${limit.minimum} and ${limit.maximum}.`;
  }

  if (
    field === 'diastolic' &&
    vital.bloodPressureMethod === 'Auscultated' &&
    vital.systolic &&
    numeric >= Number(vital.systolic)
  ) {
    return 'Diastolic BP must be lower than systolic BP.';
  }

  return '';
}

export function getVitalValidationErrors(vital: VitalSetDraft) {
  if (vital.unableToAssess === 'Yes') {
    return vital.unableToAssessReason.trim() ? [] : ['Document why vital signs could not be assessed.'];
  }
  const errors = Object.keys(numericLimits)
    .map((field) => getVitalFieldError(vital, field as keyof VitalSetDraft))
    .filter(Boolean);

  if (
    (vital.temperature || vital.temperatureCelsius) &&
    !vital.temperatureRoute
  ) {
    errors.push('Select a temperature route when temperature is documented.');
  }
  if (
    vital.temperatureRoute &&
    !vital.temperature &&
    !vital.temperatureCelsius
  ) {
    errors.push('Enter a temperature or clear the temperature route.');
  }

  return errors;
}

function assessment(
  severity: VitalSeverity,
  label: string,
  explanation: string,
): VitalAssessment {
  return { severity, label, explanation };
}

function numericValue(value: string) {
  const parsed = Number(value);
  return value.trim() !== '' && Number.isFinite(parsed) ? parsed : null;
}

export function getNumericVitalAssessment(
  field:
    | 'systolic'
    | 'diastolic'
    | 'heartRate'
    | 'respiratoryRate'
    | 'spo2'
    | 'spco'
    | 'etco2'
    | 'temperature'
    | 'gcs',
  value: string,
  patientAge: number | null,
): VitalAssessment | null {
  const number = numericValue(value);
  if (number === null || (patientAge !== null && patientAge < 13)) return null;

  switch (field) {
    case 'systolic':
      if (number < 80) return assessment('critical', 'Critical hypotension', 'Systolic blood pressure is below 80 mmHg.');
      if (number < 90) return assessment('moderate', 'Moderate hypotension', 'Systolic blood pressure is 80–89 mmHg.');
      if (number < 100) return assessment('mild', 'Mild hypotension', 'Systolic blood pressure is 90–99 mmHg.');
      if (number <= 140) return assessment('normal', 'Normal', 'Systolic blood pressure is within the adult reference range.');
      if (number < 160) return assessment('mild', 'Mild hypertension', 'Systolic blood pressure is 141–159 mmHg.');
      if (number < 180) return assessment('moderate', 'Significant hypertension', 'Systolic blood pressure is 160–179 mmHg.');
      return assessment('critical', 'Critical hypertension', 'Systolic blood pressure is 180 mmHg or greater.');
    case 'diastolic':
      if (number < 40) return assessment('critical', 'Critical diastolic hypotension', 'Diastolic blood pressure is below 40 mmHg.');
      if (number < 50) return assessment('moderate', 'Moderate diastolic hypotension', 'Diastolic blood pressure is 40–49 mmHg.');
      if (number < 60) return assessment('mild', 'Mild diastolic hypotension', 'Diastolic blood pressure is 50–59 mmHg.');
      if (number <= 90) return assessment('normal', 'Normal', 'Diastolic blood pressure is within the adult reference range.');
      if (number < 100) return assessment('mild', 'Mild diastolic hypertension', 'Diastolic blood pressure is 91–99 mmHg.');
      if (number < 110) return assessment('moderate', 'Significant diastolic hypertension', 'Diastolic blood pressure is 100–109 mmHg.');
      return assessment('critical', 'Critical diastolic hypertension', 'Diastolic blood pressure is 110 mmHg or greater.');
    case 'heartRate':
      if (number < 40) return assessment('critical', 'Severe bradycardia', 'Heart rate is below 40 bpm.');
      if (number < 50) return assessment('moderate', 'Moderate bradycardia', 'Heart rate is 40–49 bpm.');
      if (number < 60) return assessment('mild', 'Mild bradycardia', 'Heart rate is 50–59 bpm.');
      if (number <= 100) return assessment('normal', 'Normal', 'Heart rate is within the adult reference range.');
      if (number <= 110) return assessment('mild', 'Mild tachycardia', 'Heart rate is 101–110 bpm.');
      if (number <= 130) return assessment('moderate', 'Moderate tachycardia', 'Heart rate is 111–130 bpm.');
      return assessment('critical', 'Severe tachycardia', 'Heart rate is above 130 bpm.');
    case 'respiratoryRate':
      if (number < 8) return assessment('critical', 'Critical respiratory rate', 'Respiratory rate is below 8 breaths/min.');
      if (number < 10) return assessment('moderate', 'Marked bradypnea', 'Respiratory rate is 8–9 breaths/min.');
      if (number < 12) return assessment('mild', 'Mild bradypnea', 'Respiratory rate is 10–11 breaths/min.');
      if (number <= 20) return assessment('normal', 'Normal', 'Respiratory rate is within the adult reference range.');
      if (number <= 24) return assessment('mild', 'Mild tachypnea', 'Respiratory rate is 21–24 breaths/min.');
      if (number <= 30) return assessment('moderate', 'Moderate tachypnea', 'Respiratory rate is 25–30 breaths/min.');
      return assessment('critical', 'Severe tachypnea', 'Respiratory rate is above 30 breaths/min.');
    case 'spo2':
      if (number < 88) return assessment('critical', 'Critical hypoxemia', 'SpO₂ is below 88%.');
      if (number < 92) return assessment('moderate', 'Moderate hypoxemia', 'SpO₂ is 88–91%.');
      if (number < 95) return assessment('mild', 'Mild hypoxemia', 'SpO₂ is 92–94%.');
      return assessment('normal', 'Normal', 'SpO₂ is within the adult reference range.');
    case 'spco':
      if (number <= 5) return assessment('normal', 'Normal', 'SpCO is within the selected reference range.');
      if (number <= 9) return assessment('mild', 'Mild SpCO elevation', 'SpCO is 6–9%.');
      if (number <= 19) return assessment('moderate', 'Significant SpCO elevation', 'SpCO is 10–19%.');
      return assessment('critical', 'Critical SpCO elevation', 'SpCO is 20% or greater.');
    case 'etco2':
      if (number < 25) return assessment('critical', 'Critically low ETCO₂', 'ETCO₂ is below 25 mmHg.');
      if (number < 30) return assessment('moderate', 'Low ETCO₂', 'ETCO₂ is 25–29 mmHg.');
      if (number < 35) return assessment('mild', 'Mildly low ETCO₂', 'ETCO₂ is 30–34 mmHg.');
      if (number <= 45) return assessment('normal', 'Normal', 'ETCO₂ is within the adult reference range.');
      if (number <= 50) return assessment('mild', 'Mildly elevated ETCO₂', 'ETCO₂ is 46–50 mmHg.');
      if (number <= 60) return assessment('moderate', 'Elevated ETCO₂', 'ETCO₂ is 51–60 mmHg.');
      return assessment('critical', 'Critically elevated ETCO₂', 'ETCO₂ is above 60 mmHg.');
    case 'temperature':
      if (number < 92) return assessment('critical', 'Critical hypothermia', 'Temperature is below 92°F.');
      if (number < 95) return assessment('moderate', 'Moderate hypothermia', 'Temperature is 92.0–94.9°F.');
      if (number < 97) return assessment('mild', 'Mild hypothermia', 'Temperature is 95.0–96.9°F.');
      if (number <= 99.5) return assessment('normal', 'Normal', 'Temperature is within the adult reference range.');
      if (number <= 100.4) return assessment('mild', 'Mild temperature elevation', 'Temperature is 99.6–100.4°F.');
      if (number <= 103) return assessment('moderate', 'Fever', 'Temperature is 100.5–103.0°F.');
      return assessment('critical', 'High fever', 'Temperature is above 103°F.');
    case 'gcs':
      if (number <= 8) return assessment('critical', 'Severely depressed GCS', 'GCS is 8 or lower.');
      if (number <= 12) return assessment('moderate', 'Moderately depressed GCS', 'GCS is 9–12.');
      if (number <= 14) return assessment('mild', 'Mildly depressed GCS', 'GCS is 13–14.');
      return assessment('normal', 'Normal', 'GCS is 15.');
  }
}

const categoricalSeverity: Record<string, VitalAssessment> = {
  Strong: assessment('normal', 'Normal pulse quality', 'Pulse quality is strong.'),
  Normal: assessment('normal', 'Normal', 'Finding is within the expected range.'),
  'Slightly weak': assessment('mild', 'Slightly weak pulse', 'Pulse quality is mildly diminished.'),
  Weak: assessment('moderate', 'Weak pulse', 'Pulse quality is clinically diminished.'),
  Bounding: assessment('moderate', 'Bounding pulse', 'Pulse quality is abnormally strong.'),
  Thready: assessment('critical', 'Thready pulse', 'Pulse quality suggests markedly poor perfusion.'),
  Absent: assessment('critical', 'Absent peripheral pulse', 'No peripheral pulse was documented at the assessed site.'),
  'Slightly labored': assessment('mild', 'Slightly labored breathing', 'Respiratory effort is mildly increased.'),
  Labored: assessment('moderate', 'Labored breathing', 'Respiratory effort is clinically increased.'),
  Shallow: assessment('moderate', 'Shallow respirations', 'Respiratory depth is reduced.'),
  Agonal: assessment('critical', 'Agonal respirations', 'Agonal respirations require immediate attention.'),
  Apneic: assessment('critical', 'Apnea', 'No effective respirations are documented.'),
  Pink: assessment('normal', 'Normal skin color', 'Skin color is pink.'),
  'Appropriate for ethnicity': assessment('normal', 'Normal skin color', 'Skin color is appropriate for ethnicity.'),
  Pale: assessment('mild', 'Pale skin', 'Pallor may warrant reassessment in clinical context.'),
  Flushed: assessment('moderate', 'Flushed skin', 'Flushed skin is clinically abnormal and should be interpreted with other findings.'),
  Jaundiced: assessment('moderate', 'Jaundiced skin', 'Jaundice is documented.'),
  Cyanotic: assessment('critical', 'Cyanotic skin', 'Cyanosis may indicate severe hypoxia.'),
  Mottled: assessment('critical', 'Mottled skin', 'Mottling may indicate impaired perfusion.'),
  Ashen: assessment('critical', 'Ashen skin', 'Ashen skin may indicate critical illness or poor perfusion.'),
  Warm: assessment('normal', 'Normal skin temperature', 'Skin is warm.'),
  Cool: assessment('mild', 'Cool skin', 'Cool skin may warrant perfusion reassessment.'),
  Hot: assessment('moderate', 'Hot skin', 'Hot skin should be interpreted with measured temperature and other findings.'),
  Cold: assessment('critical', 'Cold skin', 'Cold skin may indicate significant hypothermia or poor perfusion.'),
  Dry: assessment('normal', 'Normal skin moisture', 'Skin is dry.'),
  Moist: assessment('mild', 'Moist skin', 'Skin moisture is mildly abnormal.'),
  Diaphoretic: assessment('moderate', 'Diaphoresis', 'Diaphoresis is clinically significant.'),
  'Profuse diaphoresis': assessment('critical', 'Profuse diaphoresis', 'Profuse diaphoresis requires prompt clinical correlation.'),
};

export function getCategoricalVitalAssessment(value: string) {
  return categoricalSeverity[value] ?? null;
}

const vitalSeverityRank: Record<VitalSeverity, number> = {
  normal: 0,
  mild: 1,
  moderate: 2,
  critical: 3,
};

export function getVitalSetAssessment(
  vital: VitalSetDraft,
  patientAge: number | null,
): VitalAssessment | null {
  const assessments = [
    getNumericVitalAssessment('systolic', vital.systolic, patientAge),
    vital.bloodPressureMethod === 'Auscultated'
      ? getNumericVitalAssessment('diastolic', vital.diastolic, patientAge)
      : null,
    getNumericVitalAssessment('heartRate', vital.heartRate, patientAge),
    getNumericVitalAssessment(
      'respiratoryRate',
      vital.respiratoryRate,
      patientAge,
    ),
    getNumericVitalAssessment('spo2', vital.spo2, patientAge),
    getNumericVitalAssessment('spco', vital.spco, patientAge),
    getNumericVitalAssessment('etco2', vital.etco2, patientAge),
    getNumericVitalAssessment('gcs', vital.gcs, patientAge),
    getNumericVitalAssessment('temperature', vital.temperature, patientAge),
    getCategoricalVitalAssessment(vital.pulseQuality),
    getCategoricalVitalAssessment(vital.respiratoryQuality),
    getCategoricalVitalAssessment(vital.skinColor),
    getCategoricalVitalAssessment(vital.skinTemperature),
    getCategoricalVitalAssessment(vital.skinMoisture),
  ];

  return assessments.reduce<VitalAssessment | null>(
    (highest, current) =>
      current &&
      (!highest ||
        vitalSeverityRank[current.severity] >
          vitalSeverityRank[highest.severity])
        ? current
        : highest,
    null,
  );
}

export function getAciVitalAlerts(
  vital: VitalSetDraft,
  patientAge: number | null,
): AciVitalAlert[] {
  if (patientAge !== null && patientAge < 13) return [];
  const sbp = numericValue(vital.systolic);
  const hr = numericValue(vital.heartRate);
  const rr = numericValue(vital.respiratoryRate);
  const spo2 = numericValue(vital.spo2);
  const etco2 = numericValue(vital.etco2);
  const temperature = numericValue(vital.temperature);
  const gcs = numericValue(vital.gcs);
  const alteredMentalStatus = gcs !== null && gcs < 15;
  const alerts: AciVitalAlert[] = [];
  const add = (id: string, severity: VitalSeverity, label: string, explanation: string) =>
    alerts.push({ id, severity, label, explanation });

  if (hr !== null && sbp !== null && hr > 120 && sbp < 90)
    add('shock', 'critical', 'Possible shock pattern', 'Tachycardia with hypotension is present. Assess perfusion and clinical context.');
  if (spo2 !== null && rr !== null && spo2 < 90 && rr > 24)
    add('respiratory-distress', 'critical', 'Respiratory distress pattern', 'Hypoxemia with tachypnea is present. Reassess airway, ventilation, and oxygen delivery.');
  if (etco2 !== null && rr !== null && etco2 > 50 && rr < 10)
    add('hypoventilation', 'critical', 'Hypoventilation pattern', 'Elevated ETCO₂ with bradypnea is present.');
  if (etco2 !== null && rr !== null && etco2 < 30 && rr > 24)
    add('hyperventilation', 'moderate', 'Hyperventilation pattern', 'Low ETCO₂ with tachypnea is present.');
  if (temperature !== null && hr !== null && temperature > 100.4 && hr > 100)
    add('infection', 'moderate', 'Possible infection pattern', 'Fever with tachycardia is present. Assess the full presentation for infection or sepsis.');
  if (gcs !== null && gcs <= 8)
    add('airway', 'critical', 'Severely depressed consciousness', 'GCS is 8 or lower. Assess airway protection and ventilation.');
  if (sbp !== null && sbp >= 180 && alteredMentalStatus)
    add('hypertensive-emergency', 'critical', 'Possible hypertensive emergency', 'Severe hypertension with altered mental status is present.');
  if (hr !== null && sbp !== null && hr < 60 && sbp < 90)
    add('poor-perfusion', 'critical', 'Poor perfusion pattern', 'Bradycardia with hypotension is present.');
  if (vital.skinColor === 'Cyanotic' && spo2 !== null && spo2 < 90)
    add('severe-hypoxia', 'critical', 'Severe hypoxia pattern', 'Cyanosis with SpO₂ below 90% is present.');
  if (spo2 !== null && spo2 < 88 && (!vital.oxygenDevice || vital.oxygenDevice === 'Room Air'))
    add('hypoxia-no-support', 'critical', 'Severe hypoxia without oxygen support', 'SpO₂ is critically low with room air or no oxygen device documented.');

  return alerts;
}

function roundedTemperature(value: number) {
  return value.toFixed(1);
}

export function updateVitalDraftField(
  draft: VitalSetDraft,
  field: keyof VitalSetDraft,
  value: string,
): VitalSetDraft {
  if (field === 'temperature') {
    const numeric = Number(value);
    return {
      ...draft,
      temperature: value,
      temperatureCelsius:
        value && Number.isFinite(numeric)
          ? roundedTemperature((numeric - 32) * (5 / 9))
          : '',
    };
  }

  if (field === 'temperatureCelsius') {
    const numeric = Number(value);
    return {
      ...draft,
      temperatureCelsius: value,
      temperature:
        value && Number.isFinite(numeric)
          ? roundedTemperature(numeric * (9 / 5) + 32)
          : '',
    };
  }

  return {
    ...draft,
    [field]: value,
    ...(field === 'bloodPressureMethod' && value === 'Palpated'
      ? { diastolic: '' }
      : {}),
  };
}

export function getVitalsProgress(
  vitals: VitalsForm,
  providerScope: ProviderScope,
) {
  const completedSets = vitals.sets.filter((set) =>
    isVitalSetComplete(set, providerScope),
  ).length;

  return {
    completedFields: Math.min(completedSets, 2),
    totalFields: 2,
  };
}
