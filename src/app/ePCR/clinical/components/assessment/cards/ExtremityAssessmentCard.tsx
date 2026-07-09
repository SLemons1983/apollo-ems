'use client';

import { useEffect, useState } from 'react';

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
  initiallyExpanded?: ExtremityKey | '';
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

const totalExtremityFields = 8;

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

function getCompletionPercent(extremity: ExtremityCmsTpAssessment) {
  return Math.round((getCompletedFields(extremity) / totalExtremityFields) * 100);
}

function isComplete(extremity: ExtremityCmsTpAssessment) {
  return extremity.selected && getCompletedFields(extremity) >= totalExtremityFields - 1;
}

function getCompletionLabel(extremity: ExtremityCmsTpAssessment) {
  if (!extremity.selected) {
    return 'Not Assessed';
  }

  if (isComplete(extremity)) {
    return 'Complete';
  }

  return 'In Progress';
}

function getProgressColor(extremity: ExtremityCmsTpAssessment) {
  if (!extremity.selected) {
    return 'bg-slate-300';
  }

  if (isComplete(extremity)) {
    return 'bg-emerald-500';
  }

  return 'bg-amber-500';
}

function getBadgeStyle(extremity: ExtremityCmsTpAssessment) {
  if (!extremity.selected) {
    return 'bg-slate-100 text-slate-600';
  }

  if (isComplete(extremity)) {
    return 'bg-emerald-100 text-emerald-800';
  }

  return 'bg-amber-100 text-amber-800';
}

function getCardStyle(extremity: ExtremityCmsTpAssessment, active: boolean) {
  if (active) {
    return 'border-2 border-blue-500 bg-blue-50 text-blue-950 shadow-sm';
  }

  if (isComplete(extremity)) {
    return 'border-emerald-300 bg-white text-slate-900';
  }

  if (extremity.selected) {
    return 'border-amber-300 bg-white text-slate-900';
  }

  return 'border-slate-300 bg-white text-slate-800 hover:bg-slate-50';
}

export default function ExtremityAssessmentCard({
  value,
  initiallyExpanded,
  onExtremityToggle,
  onChange,
}: ExtremityAssessmentCardProps) {
  const [expandedExtremity, setExpandedExtremity] =
    useState<ExtremityKey | ''>(initiallyExpanded ?? '');

  useEffect(() => {
    if (initiallyExpanded) {
      setExpandedExtremity(initiallyExpanded);
    }
  }, [initiallyExpanded]);

  function beginOrOpenExtremity(extremity: ExtremityKey) {
    if (!value[extremity].selected) {
      onExtremityToggle(extremity, true);
    }

    setExpandedExtremity(extremity);
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

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {extremities.map((extremity) => {
          const extremityValue = value[extremity.field];
          const completedFields = getCompletedFields(extremityValue);
          const completionPercent = getCompletionPercent(extremityValue);
          const active = expandedExtremity === extremity.field;

          return (
            <button
              key={extremity.field}
              type="button"
              onClick={() => beginOrOpenExtremity(extremity.field)}
              className={`rounded-xl border px-4 py-4 text-left text-sm font-semibold transition ${getCardStyle(
                extremityValue,
                active,
              )}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-black">
                    {extremityValue.selected ? '✓ ' : ''}
                    {extremity.label}
                  </div>
                  <div
                    className={`mt-2 inline-flex rounded-full px-2 py-1 text-xs font-black uppercase ${getBadgeStyle(
                      extremityValue,
                    )}`}
                  >
                    {getCompletionLabel(extremityValue)}
                  </div>
                </div>

                <div className="text-xs font-black text-slate-500">
                  {extremityValue.selected
                    ? `${completedFields}/${totalExtremityFields}`
                    : '—'}
                </div>
              </div>

              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${getProgressColor(
                    extremityValue,
                  )}`}
                  style={{
                    width: extremityValue.selected
                      ? `${completionPercent}%`
                      : '0%',
                  }}
                />
              </div>

              <div className="mt-3 text-xs font-bold text-slate-500">
                {extremityValue.selected
                  ? `${completionPercent}% complete`
                  : 'Click to begin'}
              </div>
            </button>
          );
        })}
      </div>

      <div className="space-y-3">
        {extremities.map((extremity) => {
          const extremityValue = value[extremity.field];
          const expanded = expandedExtremity === extremity.field;
          const completedFields = getCompletedFields(extremityValue);
          const completionPercent = getCompletionPercent(extremityValue);

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
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="text-base font-black text-slate-900">
                      {expanded ? '▼' : '▶'} {extremity.label}
                    </div>

                    <div
                      className={`rounded-full px-3 py-1 text-xs font-black uppercase ${getBadgeStyle(
                        extremityValue,
                      )}`}
                    >
                      {getCompletionLabel(extremityValue)}
                    </div>
                  </div>

                  <div className="mt-3 h-2 max-w-sm overflow-hidden rounded-full bg-slate-200">
                    <div
                      className={`h-full rounded-full ${getProgressColor(
                        extremityValue,
                      )}`}
                      style={{
                        width: extremityValue.selected
                          ? `${completionPercent}%`
                          : '0%',
                      }}
                    />
                  </div>

                  <div className="mt-1 text-xs font-bold uppercase tracking-wide text-slate-500">
                    {extremityValue.selected
                      ? `${completedFields} / ${totalExtremityFields} Completed`
                      : 'Not Assessed'}
                  </div>
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
                                  ? 'border-2 border-blue-500 bg-blue-50 text-blue-950'
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
