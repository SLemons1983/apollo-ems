export type ProviderScope = 'ALS' | 'BLS';
export type VitalSource = 'Manual' | 'Device Imported';
export type BloodPressureMethod = 'Auscultated' | 'Palpated';

export type VitalSetDraft = {
  recordedAt: string;
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
  providerScope: ProviderScope,
) {
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
    ...(providerScope === 'ALS' ? [vital.etco2] : []),
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
