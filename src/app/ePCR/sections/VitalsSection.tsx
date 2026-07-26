'use client';

import { useState, type Dispatch, type SetStateAction } from 'react';
import VitalSetForm from '../clinical/components/vitals/VitalSetForm';
import type {
  ProviderScope,
  VitalSetDraft,
  VitalSetRecord,
  VitalsForm,
} from '../clinical/vitals/vitals';
import {
  createEmptyVitalSet,
  toLocalDateTimeValue,
} from '../clinical/vitals/vitals';

type VitalsSectionProps = {
  vitalsForm: VitalsForm;
  setVitalsForm: Dispatch<SetStateAction<VitalsForm>>;
  providerScope: ProviderScope;
  patientAge: number | null;
};

function formatTime(value: string) {
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
}

function numberValue(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function getRange(
  field: 'systolic' | 'heartRate' | 'respiratoryRate' | 'spo2' | 'etco2' | 'gcs' | 'temperature' | 'spco',
  age: number | null,
) {
  const pediatric = age !== null && age < 13;
  const ranges = {
    systolic: pediatric ? [70, 120] : [90, 180],
    heartRate: pediatric ? [70, 140] : [60, 100],
    respiratoryRate: pediatric ? [18, 30] : [12, 20],
    spo2: [94, 100],
    etco2: [35, 45],
    gcs: [15, 15],
    temperature: [96.8, 100.4],
    spco: [0, 3],
  };
  return ranges[field];
}

function isAbnormal(
  field: Parameters<typeof getRange>[0],
  value: string,
  age: number | null,
) {
  const numeric = numberValue(value);
  if (numeric === null) return false;
  const [minimum, maximum] = getRange(field, age);
  return numeric < minimum || numeric > maximum;
}

function Trend({
  current,
  previous,
}: {
  current: string;
  previous?: string;
}) {
  const currentNumber = numberValue(current);
  const previousNumber = numberValue(previous ?? '');
  if (currentNumber === null || previousNumber === null || currentNumber === previousNumber) {
    return <span className="text-slate-400">—</span>;
  }
  return (
    <span className={currentNumber > previousNumber ? 'text-amber-700' : 'text-sky-700'}>
      {currentNumber > previousNumber ? '↑' : '↓'}
    </span>
  );
}

function Metric({
  label,
  value,
  previous,
  abnormal,
}: {
  label: string;
  value: string;
  previous?: string;
  abnormal?: boolean;
}) {
  return (
    <div className={`rounded-lg border px-3 py-2 ${abnormal ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'}`}>
      <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</div>
      <div className={`mt-1 flex items-center justify-between gap-2 text-lg font-black ${abnormal ? 'text-red-800' : 'text-slate-900'}`}>
        <span>{value || '—'}</span>
        <Trend current={value} previous={previous} />
      </div>
    </div>
  );
}

export default function VitalsSection({
  vitalsForm,
  setVitalsForm,
  providerScope,
  patientAge,
}: VitalsSectionProps) {
  const [editorOpen, setEditorOpen] = useState(false);
  const sets = vitalsForm.sets;

  function updateDraft(field: keyof VitalSetDraft, value: string) {
    setVitalsForm((current) => ({
      ...current,
      draft: {
        ...current.draft,
        [field]: value,
        ...(field === 'bloodPressureMethod' && value === 'Palpated'
          ? { diastolic: '' }
          : {}),
      },
    }));
  }

  function startNew() {
    setVitalsForm((current) => ({
      ...current,
      draft: createEmptyVitalSet(toLocalDateTimeValue()),
    }));
    setEditorOpen(true);
  }

  function duplicatePrevious() {
    const previous = sets[sets.length - 1];
    if (!previous) return;
    const { id: _id, createdAt: _createdAt, ...copy } = previous;
    void _id;
    void _createdAt;
    setVitalsForm((current) => ({
      ...current,
      draft: {
        ...copy,
        recordedAt: toLocalDateTimeValue(),
        source: 'Manual',
      },
    }));
    setEditorOpen(true);
  }

  function cancel() {
    setVitalsForm((current) => ({
      ...current,
      draft: createEmptyVitalSet(),
    }));
    setEditorOpen(false);
  }

  function save() {
    const record: VitalSetRecord = {
      ...vitalsForm.draft,
      id:
        typeof crypto !== 'undefined' && 'randomUUID' in crypto
          ? crypto.randomUUID()
          : `vital-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    setVitalsForm((current) => ({
      draft: createEmptyVitalSet(),
      sets: [...current.sets, record],
    }));
    setEditorOpen(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-200 bg-indigo-50 p-4">
        <div>
          <h3 className="font-black text-indigo-950">Vital-Sign Timeline</h3>
          <p className="mt-1 text-sm font-semibold text-indigo-800">
            {sets.length} documented · Two complete sets required · {providerScope} completion logic
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={duplicatePrevious}
            disabled={sets.length === 0}
            className="rounded-lg border border-indigo-300 bg-white px-3 py-2 text-sm font-bold text-indigo-800 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Duplicate Previous
          </button>
          <button
            type="button"
            onClick={startNew}
            className="rounded-lg bg-indigo-700 px-4 py-2 text-sm font-black text-white hover:bg-indigo-600"
          >
            + Add Vital Set
          </button>
        </div>
      </div>

      {editorOpen && (
        <div className="rounded-xl border border-indigo-200 bg-white p-4 shadow-sm">
          <VitalSetForm
            value={vitalsForm.draft}
            providerScope={providerScope}
            onChange={updateDraft}
            onSave={save}
            onCancel={cancel}
          />
        </div>
      )}

      {sets.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-300 p-10 text-center text-sm font-semibold text-slate-500">
          No vital-sign sets documented.
        </div>
      ) : (
        <div className="space-y-4">
          {sets.map((set, index) => {
            const previous = sets[index - 1];
            const bp = set.bloodPressureMethod === 'Palpated'
              ? `${set.systolic}/P`
              : `${set.systolic}/${set.diastolic}`;
            const previousBp = previous
              ? previous.bloodPressureMethod === 'Palpated'
                ? previous.systolic
                : previous.systolic
              : undefined;

            return (
              <article key={set.id} className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm">
                <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <h4 className="font-black text-slate-900">Vital Set #{index + 1}</h4>
                    <p className="text-xs font-semibold text-slate-500">{formatTime(set.recordedAt)}</p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${set.source === 'Device Imported' ? 'bg-sky-100 text-sky-800' : 'bg-slate-200 text-slate-700'}`}>
                    {set.source}
                  </span>
                </header>

                <div className="grid gap-2 p-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Metric label={`BP (${set.bloodPressureMethod})`} value={bp} previous={previousBp} abnormal={isAbnormal('systolic', set.systolic, patientAge)} />
                  <Metric label="Pulse" value={set.heartRate} previous={previous?.heartRate} abnormal={isAbnormal('heartRate', set.heartRate, patientAge)} />
                  <Metric label="Respirations" value={set.respiratoryRate} previous={previous?.respiratoryRate} abnormal={isAbnormal('respiratoryRate', set.respiratoryRate, patientAge)} />
                  <Metric label="SpO₂ %" value={set.spo2} previous={previous?.spo2} abnormal={isAbnormal('spo2', set.spo2, patientAge)} />
                  <Metric label="ETCO₂" value={set.etco2} previous={previous?.etco2} abnormal={set.etco2 ? isAbnormal('etco2', set.etco2, patientAge) : false} />
                  <Metric label="GCS" value={set.gcs} previous={previous?.gcs} abnormal={isAbnormal('gcs', set.gcs, patientAge)} />
                  <Metric label="Temperature °F" value={set.temperature} previous={previous?.temperature} abnormal={isAbnormal('temperature', set.temperature, patientAge)} />
                  <Metric label="SpCO % (Optional)" value={set.spco} previous={previous?.spco} abnormal={set.spco ? isAbnormal('spco', set.spco, patientAge) : false} />
                </div>

                <div className="grid gap-3 border-t border-slate-200 px-4 py-3 text-sm sm:grid-cols-2 lg:grid-cols-4">
                  <div><strong>Pulse:</strong> {set.pulseQuality}</div>
                  <div><strong>Breathing:</strong> {set.respiratoryQuality}</div>
                  <div><strong>Skin:</strong> {set.skinColor}, {set.skinTemperature}, {set.skinMoisture}</div>
                  <div><strong>Temperature route:</strong> {set.temperatureRoute}</div>
                  {(set.oxygenDevice || set.oxygenFlow || set.cardiacRhythm) && (
                    <div className="sm:col-span-2 lg:col-span-4 text-slate-600">
                      <strong>Context:</strong> {[set.oxygenDevice, set.oxygenFlow, set.cardiacRhythm].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}

