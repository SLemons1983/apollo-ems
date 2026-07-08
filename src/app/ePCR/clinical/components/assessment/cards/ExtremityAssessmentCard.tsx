'use client';

import { useState } from 'react';

type ExtremityKey = 'rightArm' | 'leftArm' | 'rightLeg' | 'leftLeg';

type ExtremityCmsTpAssessment = {
  selected: boolean;
  circulation: string;
  motor: string;
  sensation: string;
  tenderness: string;
  pulses: string;
  skin: string;
  capillaryRefill: string;
  notes: string;
};

type ExtremityAssessmentForm = Record<ExtremityKey, ExtremityCmsTpAssessment>;

type ExtremityAssessmentCardProps = {
  value: ExtremityAssessmentForm;
  onExtremityToggle: (extremity: ExtremityKey, selected: boolean) => void;
  onChange: (
    extremity: ExtremityKey,
    field: keyof ExtremityCmsTpAssessment,
    value: string,
  ) => void;
};

const extremities: { field: ExtremityKey; label: string }[] = [
  { field: 'rightArm', label: 'Right Arm' },
  { field: 'leftArm', label: 'Left Arm' },
  { field: 'rightLeg', label: 'Right Leg' },
  { field: 'leftLeg', label: 'Left Leg' },
];

const groups: {
  field: keyof ExtremityCmsTpAssessment;
  label: string;
  options: string[];
}[] = [
  {
    field: 'circulation',
    label: 'Circulation',
    options: ['Normal', 'Decreased', 'Absent', 'Unable to Assess'],
  },
  {
    field: 'motor',
    label: 'Motor',
    options: ['Normal', 'Weak', 'Absent', 'Unable to Assess'],
  },
  {
    field: 'sensation',
    label: 'Sensation',
    options: ['Intact', 'Decreased', 'Absent', 'Unable to Assess'],
  },
  {
    field: 'tenderness',
    label: 'Tenderness / Pain',
    options: ['None', 'Mild', 'Moderate', 'Severe', 'Unable to Assess'],
  },
  {
    field: 'pulses',
    label: 'Distal Pulses',
    options: ['Present', 'Weak', 'Absent', 'Unable to Assess'],
  },
  {
    field: 'skin',
    label: 'Skin',
    options: ['Normal', 'Pale', 'Cyanotic', 'Cool', 'Hot', 'Unable to Assess'],
  },
  {
    field: 'capillaryRefill',
    label: 'Capillary Refill',
    options: ['Less Than 2 Seconds', 'Greater Than 2 Seconds', 'Absent', 'Unable to Assess'],
  },
];

function getCompletedFields(extremity: ExtremityCmsTpAssessment) {
  return [
    extremity.circulation,
    extremity.motor,
    extremity.sensation,
    extremity.tenderness,
    extremity.pulses,
    extremity.skin,
    extremity.capillaryRefill,
    extremity.notes,
  ].filter(Boolean).length;
}

const totalExtremityFields = 8;

function getCompletionPercent(extremity: ExtremityCmsTpAssessment) {
  return Math.round((getCompletedFields(extremity) / totalExtremityFields) * 100);
}

function getCompletionLabel(extremity: ExtremityCmsTpAssessment) {
  if (!extremity.selected) {
    return 'Not Done';
  }

  const completed = getCompletedFields(extremity);

  if (completed >= totalExtremityFields - 1) {
    return 'Done';
  }

  return `${completed} / ${totalExtremityFields}`;
}

export default function ExtremityAssessmentCard({
  value,
  onExtremityToggle,
  onChange,
}: ExtremityAssessmentCardProps) {
  const [expandedExtremity, setExpandedExtremity] =
    useState<ExtremityKey | ''>('');

  function toggleExtremity(extremity: ExtremityKey) {
    const isSelected = value[extremity].selected;
    const nextSelected = !isSelected;

    onExtremityToggle(extremity, nextSelected);
    setExpandedExtremity(nextSelected ? extremity : '');
  }

  function toggleExpanded(extremity: ExtremityKey) {
    if (!value[extremity].selected) {
      onExtremityToggle(extremity, true);
      setExpandedExtremity(extremity);
      return;
    }

    setExpandedExtremity((current) => (current === extremity ? '' : extremity));
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-slate-300 bg-slate-50 p-4">
        <div className="text-xs font-bold uppercase tracking-wide text-slate-500">
          Extremity Assessment / CMS-TP
        </div>
        <div className="mt-1 text-sm font-semibold text-slate-800">
          Select each extremity assessed, then expand it to document circulation,
          motor, sensation, tenderness, pulses, skin, and capillary refill.
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
        {extremities.map((extremity) => {
          const selected = value[extremity.field].selected;
          const completionLabel = getCompletionLabel(value[extremity.field]);

          return (
            <button
              key={extremity.field}
              type="button"
              onClick={() => toggleExtremity(extremity.field)}
              className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                selected
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
              }`}
            >
              <span className="block">
                {selected ? `✓ ${extremity.label}` : extremity.label}
              </span>
              <span
                className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-black uppercase ${
                  selected
                    ? getCompletedFields(value[extremity.field]) >= totalExtremityFields - 1
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {completionLabel}
              </span>

              <span className="mt-2 block h-2 overflow-hidden rounded-full bg-white/40">
                <span
                  className={`block h-full rounded-full ${
                    selected &&
                    getCompletedFields(value[extremity.field]) >= totalExtremityFields - 1
                      ? 'bg-emerald-500'
                      : 'bg-red-500'
                  }`}
                  style={{
                    width: selected
                      ? `${getCompletionPercent(value[extremity.field])}%`
                      : '0%',
                  }}
                />
              </span>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {extremities.map((extremity) => {
          const extremityValue = value[extremity.field];
          const expanded = expandedExtremity === extremity.field;
          const completedFields = getCompletedFields(extremityValue);

          return (
            <div
              key={extremity.field}
              className={`rounded-xl border ${
                extremityValue.selected
                  ? 'border-slate-300 bg-white'
                  : 'border-slate-200 bg-slate-50'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleExpanded(extremity.field)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              >
                <div>
                  <div className="text-base font-black text-slate-900">
                    {expanded ? '▼' : '▶'} {extremity.label}
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${
                        completedFields >= totalExtremityFields - 1
                          ? 'bg-emerald-500'
                          : 'bg-red-500'
                      }`}
                      style={{
                        width: extremityValue.selected
                          ? `${getCompletionPercent(extremityValue)}%`
                          : '0%',
                      }}
                    />
                  </div>
                  <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    {extremityValue.selected
                      ? `${completedFields} / ${totalExtremityFields} Completed`
                      : 'Not Done'}
                  </div>
                </div>

                <div
                  className={`rounded-full px-3 py-1 text-xs font-black uppercase ${
                    extremityValue.selected &&
                    completedFields >= totalExtremityFields - 1
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {getCompletionLabel(extremityValue)}
                </div>
              </button>

              {expanded && extremityValue.selected && (
                <div className="border-t border-slate-200 px-4 py-4">
                  {groups.map((group) => (
                    <div key={group.field} className="mb-4">
                      <h5 className="mb-2 text-sm font-bold uppercase tracking-wide text-slate-600">
                        {group.label}
                      </h5>

                      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        {group.options.map((option) => {
                          const selected = extremityValue[group.field] === option;

                          return (
                            <button
                              key={option}
                              type="button"
                              onClick={() =>
                                onChange(
                                  extremity.field,
                                  group.field,
                                  selected ? '' : option,
                                )
                              }
                              className={`rounded-xl border px-4 py-3 text-left text-sm font-semibold transition ${
                                selected
                                  ? 'border-slate-900 bg-slate-900 text-white'
                                  : 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50'
                              }`}
                            >
                              {selected ? `✓ ${option}` : option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}

                  <label className="block">
                    <span className="mb-2 block text-sm font-bold uppercase tracking-wide text-slate-600">
                      Notes
                    </span>
                    <textarea
                      value={extremityValue.notes}
                      onChange={(event) =>
                        onChange(extremity.field, 'notes', event.target.value)
                      }
                      rows={3}
                      className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold text-slate-900 shadow-sm"
                    />
                  </label>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export type {
  ExtremityAssessmentForm,
  ExtremityCmsTpAssessment,
  ExtremityKey,
};
