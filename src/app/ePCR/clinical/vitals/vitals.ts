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
    vital.temperature,
    vital.temperatureRoute,
    vital.skinColor,
    vital.skinTemperature,
    vital.skinMoisture,
  ];
}

export function isVitalSetComplete(
  vital: VitalSetDraft,
  providerScope: ProviderScope,
) {
  return getVitalRequiredValues(vital, providerScope).every(
    (value) => value.trim() !== '',
  );
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

