'use client';

import type {
  ProviderScope,
  VitalSetDraft,
} from '../../vitals/vitals';
import {
  getVitalRequiredValues,
  getVitalFieldError,
  getVitalValidationErrors,
  getNumericVitalAssessment,
  getCategoricalVitalAssessment,
  isVitalSetComplete,
  toLocalDateTimeValue,
} from '../../vitals/vitals';

type VitalSetFormProps = {
  value: VitalSetDraft;
  providerScope: ProviderScope;
  compact?: boolean;
  onChange: (field: keyof VitalSetDraft, value: string) => void;
  onSave: () => void;
  onCancel: () => void;
};

const pulseQualities = ['Strong', 'Normal', 'Slightly weak', 'Weak', 'Bounding', 'Thready', 'Absent'];
const respiratoryQualities = [
  'Normal',
  'Slightly labored',
  'Shallow',
  'Labored',
  'Agonal',
  'Apneic',
];
const temperatureRoutes = [
  'Oral',
  'Tympanic',
  'Temporal',
  'Axillary',
  'Rectal',
];
const skinColors = ['Pink', 'Appropriate for ethnicity', 'Pale', 'Flushed', 'Jaundiced', 'Cyanotic', 'Mottled', 'Ashen'];
const skinTemperatures = ['Warm', 'Cool', 'Cold', 'Hot'];
const skinMoistures = ['Dry', 'Moist', 'Diaphoretic', 'Profuse diaphoresis'];
const oxygenDevices = [
  'Room Air',
  'Nasal Cannula',
  'Simple Mask',
  'Non-Rebreather',
  'BVM',
  'CPAP/BiPAP',
  'Advanced Airway',
];

function Field({
  label,
  required = false,
  error = '',
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-600">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </span>
      {children}
      {error && (
        <span className="mt-1 block text-xs font-bold text-red-700">
          {error}
        </span>
      )}
    </label>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';
const invalidInputClass =
  'border-red-400 bg-red-50 text-red-950 focus:border-red-500 focus:ring-red-100';
const severityClasses = {
  normal: 'border-emerald-400 bg-emerald-50 text-emerald-950 focus:border-emerald-500 focus:ring-emerald-100',
  mild: 'border-yellow-400 bg-yellow-50 text-yellow-950 focus:border-yellow-500 focus:ring-yellow-100',
  moderate: 'border-orange-400 bg-orange-50 text-orange-950 focus:border-orange-500 focus:ring-orange-100',
  critical: 'border-red-500 bg-red-50 text-red-950 focus:border-red-600 focus:ring-red-100',
};

export default function VitalSetForm({
  value,
  providerScope,
  compact = false,
  onChange,
  onSave,
  onCancel,
}: VitalSetFormProps) {
  const complete = isVitalSetComplete(value, providerScope);
  const requiredValues = getVitalRequiredValues(value, providerScope);
  const completedRequired = requiredValues.filter(
    (item) => item.trim() !== '',
  ).length;
  const validationErrors = getVitalValidationErrors(value);
  const assessmentFor = (field: Parameters<typeof getNumericVitalAssessment>[0]) =>
    getNumericVitalAssessment(field, value[field], null);
  const numericClass = (field: keyof VitalSetDraft) => {
    const error = getVitalFieldError(value, field);
    const assessment = field === 'temperatureCelsius'
      ? assessmentFor('temperature')
      : ['systolic', 'diastolic', 'heartRate', 'respiratoryRate', 'spo2', 'spco', 'etco2', 'temperature', 'gcs'].includes(field)
        ? assessmentFor(field as Parameters<typeof getNumericVitalAssessment>[0])
        : null;
    return `${inputClass} ${error ? invalidInputClass : assessment ? severityClasses[assessment.severity] : ''}`;
  };
  const selectClass = (field: 'pulseQuality' | 'respiratoryQuality' | 'skinColor' | 'skinTemperature' | 'skinMoisture') => {
    const finding = getCategoricalVitalAssessment(value[field]);
    return `${inputClass} ${finding ? severityClasses[finding.severity] : ''}`;
  };
  const findingTitle = (field: 'pulseQuality' | 'respiratoryQuality' | 'skinColor' | 'skinTemperature' | 'skinMoisture') =>
    getCategoricalVitalAssessment(value[field])?.explanation;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-black text-slate-900">New Vital-Sign Set</h3>
          <p className="text-xs font-semibold text-slate-500">
            {completedRequired} / {requiredValues.length} required values
          </p>
        </div>
        <span
          className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
            complete
              ? 'bg-emerald-100 text-emerald-800'
              : 'bg-amber-100 text-amber-800'
          }`}
        >
          {complete ? 'Ready to Save' : `${providerScope} Requirements`}
        </span>
      </div>

      <div className={`grid gap-3 ${compact ? 'grid-cols-1' : 'sm:grid-cols-2 lg:grid-cols-3'}`}>
        <Field label="Date / Time" required>
          <div className="flex gap-2">
            <input
              type="datetime-local"
              value={value.recordedAt}
              onChange={(event) => onChange('recordedAt', event.target.value)}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => onChange('recordedAt', toLocalDateTimeValue())}
              className="shrink-0 rounded-lg bg-indigo-700 px-3 py-2 text-xs font-black text-white hover:bg-indigo-600"
            >
              Now
            </button>
          </div>
        </Field>

        <Field label="Entry Source">
          <select
            value={value.source}
            onChange={(event) => onChange('source', event.target.value)}
            className={inputClass}
          >
            <option>Manual</option>
            <option>Device Imported</option>
          </select>
        </Field>

        <Field label="BP Method" required>
          <select
            value={value.bloodPressureMethod}
            onChange={(event) =>
              onChange('bloodPressureMethod', event.target.value)
            }
            className={inputClass}
          >
            <option>Auscultated</option>
            <option>Palpated</option>
          </select>
        </Field>

        <Field label="Systolic BP" required error={getVitalFieldError(value, 'systolic')}>
          <input
            type="number"
            inputMode="numeric"
            min="20"
            max="300"
            value={value.systolic}
            onChange={(event) => onChange('systolic', event.target.value)}
            className={numericClass('systolic')}
          />
        </Field>

        <Field
          label="Diastolic BP"
          required={value.bloodPressureMethod === 'Auscultated'}
          error={getVitalFieldError(value, 'diastolic')}
        >
          <input
            type="number"
            inputMode="numeric"
            min="10"
            max="200"
            value={value.diastolic}
            disabled={value.bloodPressureMethod === 'Palpated'}
            onChange={(event) => onChange('diastolic', event.target.value)}
            placeholder={
              value.bloodPressureMethod === 'Palpated' ? 'Not applicable' : ''
            }
            className={`${numericClass('diastolic')} disabled:bg-slate-100 disabled:text-slate-400`}
          />
        </Field>

        <Field label="Heart / Pulse Rate" required error={getVitalFieldError(value, 'heartRate')}>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="300"
            value={value.heartRate}
            onChange={(event) => onChange('heartRate', event.target.value)}
            className={numericClass('heartRate')}
          />
        </Field>

        <Field label="Pulse Quality" required>
          <select
            value={value.pulseQuality}
            title={findingTitle('pulseQuality')}
            onChange={(event) => onChange('pulseQuality', event.target.value)}
            className={selectClass('pulseQuality')}
          >
            <option value="">Select</option>
            {pulseQualities.map((option) => <option key={option}>{option}</option>)}
          </select>
        </Field>

        <Field label="Respiratory Rate" required error={getVitalFieldError(value, 'respiratoryRate')}>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            max="100"
            value={value.respiratoryRate}
            onChange={(event) =>
              onChange('respiratoryRate', event.target.value)
            }
            className={numericClass('respiratoryRate')}
          />
        </Field>

        <Field label="Respiratory Quality" required>
          <select
            value={value.respiratoryQuality}
            title={findingTitle('respiratoryQuality')}
            onChange={(event) =>
              onChange('respiratoryQuality', event.target.value)
            }
            className={selectClass('respiratoryQuality')}
          >
            <option value="">Select</option>
            {respiratoryQualities.map((option) => <option key={option}>{option}</option>)}
          </select>
        </Field>

        <Field label="SpO₂ %" required error={getVitalFieldError(value, 'spo2')}>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max="100"
            value={value.spo2}
            onChange={(event) => onChange('spo2', event.target.value)}
            className={numericClass('spo2')}
          />
        </Field>

        <Field label="SpCO % (Optional)" error={getVitalFieldError(value, 'spco')}>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max="100"
            value={value.spco}
            onChange={(event) => onChange('spco', event.target.value)}
            className={numericClass('spco')}
          />
        </Field>

        <Field label={`ETCO₂ mmHg${providerScope === 'BLS' ? ' (Optional)' : ''}`} required={providerScope === 'ALS'} error={getVitalFieldError(value, 'etco2')}>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max="150"
            value={value.etco2}
            onChange={(event) => onChange('etco2', event.target.value)}
            className={numericClass('etco2')}
          />
        </Field>

        <Field label="GCS" required error={getVitalFieldError(value, 'gcs')}>
          <input
            type="number"
            inputMode="numeric"
            min="3"
            max="15"
            value={value.gcs}
            onChange={(event) => onChange('gcs', event.target.value)}
            className={numericClass('gcs')}
          />
        </Field>

        <Field label="Temperature °F (Optional)" error={getVitalFieldError(value, 'temperature')}>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="75"
            max="115"
            value={value.temperature}
            onChange={(event) => onChange('temperature', event.target.value)}
            className={numericClass('temperature')}
          />
        </Field>

        <Field label="Temperature °C (Optional)" error={getVitalFieldError(value, 'temperatureCelsius')}>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            min="23.9"
            max="46.1"
            value={value.temperatureCelsius}
            onChange={(event) => onChange('temperatureCelsius', event.target.value)}
            className={numericClass('temperatureCelsius')}
          />
        </Field>

        <Field label="Temperature Route">
          <select
            value={value.temperatureRoute}
            onChange={(event) =>
              onChange('temperatureRoute', event.target.value)
            }
            className={inputClass}
          >
            <option value="">Select</option>
            {temperatureRoutes.map((option) => <option key={option}>{option}</option>)}
          </select>
        </Field>

        <Field label="Skin Color" required>
          <select
            value={value.skinColor}
            title={findingTitle('skinColor')}
            onChange={(event) => onChange('skinColor', event.target.value)}
            className={selectClass('skinColor')}
          >
            <option value="">Select</option>
            {skinColors.map((option) => <option key={option}>{option}</option>)}
          </select>
        </Field>

        <Field label="Skin Temperature" required>
          <select
            value={value.skinTemperature}
            title={findingTitle('skinTemperature')}
            onChange={(event) =>
              onChange('skinTemperature', event.target.value)
            }
            className={selectClass('skinTemperature')}
          >
            <option value="">Select</option>
            {skinTemperatures.map((option) => <option key={option}>{option}</option>)}
          </select>
        </Field>

        <Field label="Skin Moisture" required>
          <select
            value={value.skinMoisture}
            title={findingTitle('skinMoisture')}
            onChange={(event) => onChange('skinMoisture', event.target.value)}
            className={selectClass('skinMoisture')}
          >
            <option value="">Select</option>
            {skinMoistures.map((option) => <option key={option}>{option}</option>)}
          </select>
        </Field>

        <Field label="Oxygen / Ventilation Device">
          <select
            value={value.oxygenDevice}
            onChange={(event) => onChange('oxygenDevice', event.target.value)}
            className={inputClass}
          >
            <option value="">Select</option>
            {oxygenDevices.map((option) => <option key={option}>{option}</option>)}
          </select>
        </Field>

        <Field label="Oxygen Flow / Setting">
          <input
            value={value.oxygenFlow}
            onChange={(event) => onChange('oxygenFlow', event.target.value)}
            placeholder="Example: 4 LPM or PEEP 5"
            className={inputClass}
          />
        </Field>

        <Field label="Cardiac Rhythm">
          <input
            value={value.cardiacRhythm}
            onChange={(event) => onChange('cardiacRhythm', event.target.value)}
            placeholder="Example: Normal sinus rhythm"
            className={inputClass}
          />
        </Field>
      </div>

      {!complete && (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
          Complete every required value before saving this vital-sign set.
          {providerScope === 'ALS' && ' ETCO₂ is required for ALS.'}
          {validationErrors.length > 0 && ` ${validationErrors[0]}`}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-bold text-slate-700 hover:bg-slate-50"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={onSave}
          disabled={!complete}
          className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-black text-white hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          Save Vital Set
        </button>
      </div>
    </div>
  );
}
