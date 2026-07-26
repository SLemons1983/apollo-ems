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
  updateVitalDraftField,
  getAciVitalAlerts,
  getCategoricalVitalAssessment,
  getNumericVitalAssessment,
  type VitalAssessment,
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
  assessment,
}: {
  label: string;
  value: string;
  previous?: string;
  assessment?: VitalAssessment | null;
}) {
  const styles = {
    normal: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    mild: 'border-yellow-300 bg-yellow-50 text-yellow-900',
    moderate: 'border-orange-300 bg-orange-50 text-orange-900',
    critical: 'border-red-400 bg-red-50 text-red-900',
  };
  return (
    <div title={assessment?.explanation} className={`rounded-lg border px-3 py-2 ${assessment ? styles[assessment.severity] : 'border-slate-200 bg-slate-50 text-slate-900'}`}>
      <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 flex items-center justify-between gap-2 text-lg font-black">
        <span>{value || '—'}</span>
        <Trend current={value} previous={previous} />
      </div>
      {assessment && assessment.severity !== 'normal' && (
        <div className="mt-1 text-[11px] font-bold">{assessment.label}</div>
      )}
    </div>
  );
}

const severityRank = { normal: 0, mild: 1, moderate: 2, critical: 3 };

function highestAssessment(
  ...items: Array<VitalAssessment | null>
): VitalAssessment | null {
  return items.reduce<VitalAssessment | null>(
    (highest, item) =>
      item && (!highest || severityRank[item.severity] > severityRank[highest.severity])
        ? item
        : highest,
    null,
  );
}

function Finding({ label, value }: { label: string; value: string }) {
  const result = getCategoricalVitalAssessment(value);
  const styles = {
    normal: 'border-emerald-300 bg-emerald-50 text-emerald-900',
    mild: 'border-yellow-300 bg-yellow-50 text-yellow-900',
    moderate: 'border-orange-300 bg-orange-50 text-orange-900',
    critical: 'border-red-400 bg-red-50 text-red-900',
  };
  return (
    <div
      title={result?.explanation}
      className={`rounded-lg border px-3 py-2 ${result ? styles[result.severity] : 'border-slate-200 bg-slate-50 text-slate-900'}`}
    >
      <div className="text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 font-black">{value || '—'}</div>
      {result && result.severity !== 'normal' && (
        <div className="mt-1 text-[11px] font-bold">{result.label}</div>
      )}
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
        ...updateVitalDraftField(current.draft, field, value),
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
            const alerts = getAciVitalAlerts(set, patientAge);
            const bloodPressureAssessment = highestAssessment(
              getNumericVitalAssessment('systolic', set.systolic, patientAge),
              set.bloodPressureMethod === 'Auscultated'
                ? getNumericVitalAssessment('diastolic', set.diastolic, patientAge)
                : null,
            );

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
                  <Metric label={`BP (${set.bloodPressureMethod})`} value={bp} previous={previousBp} assessment={bloodPressureAssessment} />
                  <Metric label="Pulse" value={set.heartRate} previous={previous?.heartRate} assessment={getNumericVitalAssessment('heartRate', set.heartRate, patientAge)} />
                  <Metric label="Respirations" value={set.respiratoryRate} previous={previous?.respiratoryRate} assessment={getNumericVitalAssessment('respiratoryRate', set.respiratoryRate, patientAge)} />
                  <Metric label="SpO₂ %" value={set.spo2} previous={previous?.spo2} assessment={getNumericVitalAssessment('spo2', set.spo2, patientAge)} />
                  <Metric label="ETCO₂" value={set.etco2} previous={previous?.etco2} assessment={getNumericVitalAssessment('etco2', set.etco2, patientAge)} />
                  <Metric label="GCS" value={set.gcs} previous={previous?.gcs} assessment={getNumericVitalAssessment('gcs', set.gcs, patientAge)} />
                  <Metric label="Temperature °F / °C" value={set.temperature ? `${set.temperature} / ${set.temperatureCelsius || ((Number(set.temperature) - 32) * (5 / 9)).toFixed(1)}` : ''} previous={previous?.temperature} assessment={getNumericVitalAssessment('temperature', set.temperature, patientAge)} />
                  <Metric label="SpCO % (Optional)" value={set.spco} previous={previous?.spco} assessment={getNumericVitalAssessment('spco', set.spco, patientAge)} />
                </div>

                <div className="grid gap-2 border-t border-slate-200 px-4 py-3 text-sm sm:grid-cols-2 lg:grid-cols-5">
                  <Finding label="Pulse Quality" value={set.pulseQuality} />
                  <Finding label="Respiratory Quality" value={set.respiratoryQuality} />
                  <Finding label="Skin Color" value={set.skinColor} />
                  <Finding label="Skin Temperature" value={set.skinTemperature} />
                  <Finding label="Skin Moisture" value={set.skinMoisture} />
                  <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 sm:col-span-2 lg:col-span-5"><strong>Temperature route:</strong> {set.temperatureRoute || 'Not documented'}</div>
                  {(set.oxygenDevice || set.oxygenFlow || set.cardiacRhythm) && (
                    <div className="sm:col-span-2 lg:col-span-5 text-slate-600">
                      <strong>Context:</strong> {[set.oxygenDevice, set.oxygenFlow, set.cardiacRhythm].filter(Boolean).join(' · ')}
                    </div>
                  )}
                </div>
                {alerts.length > 0 && (
                  <div className="space-y-2 border-t border-indigo-200 bg-indigo-50 px-4 py-3">
                    <div className="text-xs font-black uppercase tracking-wide text-indigo-900">Apollo Clinical Intelligence</div>
                    {alerts.map((alert) => (
                      <div key={alert.id} className={`rounded-lg border px-3 py-2 text-sm ${alert.severity === 'critical' ? 'border-red-300 bg-red-50 text-red-900' : 'border-orange-300 bg-orange-50 text-orange-900'}`}>
                        <strong>{alert.severity === 'critical' ? '🔴' : '🟠'} {alert.label}:</strong> {alert.explanation}
                      </div>
                    ))}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
