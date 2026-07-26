'use client';

import type {
  ProviderScope,
  VitalSetDraft,
} from '../../vitals/vitals';
import {
  getVitalRequiredValues,
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

const pulseQualities = ['Strong', 'Weak', 'Bounding', 'Thready', 'Irregular'];
const respiratoryQualities = [
  'Normal',
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
const skinColors = ['Normal', 'Pale', 'Cyanotic', 'Flushed', 'Jaundiced'];
const skinTemperatures = ['Warm', 'Cool', 'Cold', 'Hot'];
const skinMoistures = ['Dry', 'Moist', 'Diaphoretic'];
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
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0">
      <span className="mb-1 block text-xs font-black uppercase tracking-wide text-slate-600">
        {label}
        {required && <span className="ml-1 text-red-600">*</span>}
      </span>
      {children}
    </label>
  );
}

const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100';

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

        <Field label="Systolic BP" required>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={value.systolic}
            onChange={(event) => onChange('systolic', event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field
          label="Diastolic BP"
          required={value.bloodPressureMethod === 'Auscultated'}
        >
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={value.diastolic}
            disabled={value.bloodPressureMethod === 'Palpated'}
            onChange={(event) => onChange('diastolic', event.target.value)}
            placeholder={
              value.bloodPressureMethod === 'Palpated' ? 'Not applicable' : ''
            }
            className={`${inputClass} disabled:bg-slate-100 disabled:text-slate-400`}
          />
        </Field>

        <Field label="Heart / Pulse Rate" required>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={value.heartRate}
            onChange={(event) => onChange('heartRate', event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Pulse Quality" required>
          <select
            value={value.pulseQuality}
            onChange={(event) => onChange('pulseQuality', event.target.value)}
            className={inputClass}
          >
            <option value="">Select</option>
            {pulseQualities.map((option) => <option key={option}>{option}</option>)}
          </select>
        </Field>

        <Field label="Respiratory Rate" required>
          <input
            type="number"
            inputMode="numeric"
            min="0"
            value={value.respiratoryRate}
            onChange={(event) =>
              onChange('respiratoryRate', event.target.value)
            }
            className={inputClass}
          />
        </Field>

        <Field label="Respiratory Quality" required>
          <select
            value={value.respiratoryQuality}
            onChange={(event) =>
              onChange('respiratoryQuality', event.target.value)
            }
            className={inputClass}
          >
            <option value="">Select</option>
            {respiratoryQualities.map((option) => <option key={option}>{option}</option>)}
          </select>
        </Field>

        <Field label="SpO₂ %" required>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            max="100"
            value={value.spo2}
            onChange={(event) => onChange('spo2', event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="SpCO % (Optional)">
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={value.spco}
            onChange={(event) => onChange('spco', event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label={`ETCO₂ mmHg${providerScope === 'BLS' ? ' (Optional)' : ''}`} required={providerScope === 'ALS'}>
          <input
            type="number"
            inputMode="decimal"
            min="0"
            value={value.etco2}
            onChange={(event) => onChange('etco2', event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="GCS" required>
          <input
            type="number"
            inputMode="numeric"
            min="3"
            max="15"
            value={value.gcs}
            onChange={(event) => onChange('gcs', event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Temperature °F" required>
          <input
            type="number"
            inputMode="decimal"
            step="0.1"
            value={value.temperature}
            onChange={(event) => onChange('temperature', event.target.value)}
            className={inputClass}
          />
        </Field>

        <Field label="Temperature Route" required>
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
            onChange={(event) => onChange('skinColor', event.target.value)}
            className={inputClass}
          >
            <option value="">Select</option>
            {skinColors.map((option) => <option key={option}>{option}</option>)}
          </select>
        </Field>

        <Field label="Skin Temperature" required>
          <select
            value={value.skinTemperature}
            onChange={(event) =>
              onChange('skinTemperature', event.target.value)
            }
            className={inputClass}
          >
            <option value="">Select</option>
            {skinTemperatures.map((option) => <option key={option}>{option}</option>)}
          </select>
        </Field>

        <Field label="Skin Moisture" required>
          <select
            value={value.skinMoisture}
            onChange={(event) => onChange('skinMoisture', event.target.value)}
            className={inputClass}
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

