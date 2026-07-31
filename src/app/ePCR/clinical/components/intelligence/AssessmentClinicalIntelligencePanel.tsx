'use client';

import { useMemo, useState } from 'react';
import type { AssessmentForm } from '../../assessment/assessmentForm';
import {
  buildAssessmentEngineResult,
  type AssessmentContext,
} from '../../engine/assessment';
import { evaluateAssessmentClinicalIntelligence } from '../../engine/intelligence';
import type { ClinicalSignificanceSeverity } from '../../engine/significance';

type AssessmentClinicalIntelligencePanelProps = {
  assessmentForm: AssessmentForm;
  context: AssessmentContext;
};

const severityPresentation: Record<
  ClinicalSignificanceSeverity,
  { badge: string; border: string; label: string }
> = {
  critical: {
    badge: 'bg-red-100 text-red-800',
    border: 'border-red-300',
    label: 'Critical',
  },
  urgent: {
    badge: 'bg-orange-100 text-orange-800',
    border: 'border-orange-300',
    label: 'Urgent',
  },
  important: {
    badge: 'bg-amber-100 text-amber-800',
    border: 'border-amber-300',
    label: 'Important',
  },
  informational: {
    badge: 'bg-blue-100 text-blue-800',
    border: 'border-blue-300',
    label: 'Information',
  },
};

export default function AssessmentClinicalIntelligencePanel({
  assessmentForm,
  context,
}: AssessmentClinicalIntelligencePanelProps) {
  const [expanded, setExpanded] = useState(true);

  const evaluation = useMemo(() => {
    try {
      const assessment = buildAssessmentEngineResult(
        context,
        assessmentForm,
      );

      return {
        result: evaluateAssessmentClinicalIntelligence(assessment),
        error: '',
      };
    } catch (error) {
      return {
        result: null,
        error:
          error instanceof Error
            ? error.message
            : 'Assessment Clinical Intelligence could not be evaluated.',
      };
    }
  }, [assessmentForm, context]);

  const significanceCount =
    evaluation.result?.significances.length ?? 0;
  const fragmentCount =
    evaluation.result?.narrativeFragments.length ?? 0;

  return (
    <section className="overflow-hidden rounded-xl border border-indigo-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setExpanded((current) => !current)}
        className="flex w-full items-center justify-between gap-4 bg-indigo-950 px-4 py-3 text-left text-white"
        aria-expanded={expanded}
      >
        <div>
          <div className="text-xs font-black uppercase tracking-[0.16em] text-indigo-200">
            Apollo Clinical Intelligence
          </div>
          <div className="mt-1 text-sm font-bold">
            Assessment documentation review
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-black">
            {significanceCount} finding{significanceCount === 1 ? '' : 's'}
          </span>
          <span className="text-xl font-black">{expanded ? '−' : '+'}</span>
        </div>
      </button>

      {expanded && (
        <div className="space-y-4 p-4">
          <p className="text-xs font-semibold text-slate-600">
            ACI reviews only the information documented in this Assessment.
            It does not diagnose, select treatment, or replace clinical
            judgment.
          </p>

          {evaluation.error ? (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3">
              <div className="text-xs font-black uppercase tracking-wide text-red-800">
                Evaluation unavailable
              </div>
              <p className="mt-1 text-sm font-semibold text-red-900">
                {evaluation.error}
              </p>
            </div>
          ) : significanceCount > 0 ? (
            <div className="space-y-3">
              {evaluation.result?.significances.map((significance) => {
                const presentation =
                  severityPresentation[significance.severity];

                return (
                  <article
                    key={significance.id}
                    className={`rounded-lg border bg-slate-50 p-3 ${presentation.border}`}
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${presentation.badge}`}
                      >
                        {presentation.label}
                      </span>
                      <h3 className="text-sm font-black text-slate-900">
                        {significance.title}
                      </h3>
                    </div>
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      {significance.description}
                    </p>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-semibold text-emerald-900">
              No clinically significant Assessment findings are active from
              the information documented so far.
            </div>
          )}

          <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="text-xs font-black uppercase tracking-wide text-slate-700">
                Narrative support
              </div>
              <span className="rounded-full bg-slate-200 px-2.5 py-1 text-[10px] font-black uppercase text-slate-700">
                {fragmentCount} documented fragment
                {fragmentCount === 1 ? '' : 's'}
              </span>
            </div>

            {fragmentCount > 0 ? (
              <div className="mt-3 space-y-2">
                {evaluation.result?.narrativeFragments.map((fragment) => (
                  <p
                    key={fragment.id}
                    className="rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-800"
                  >
                    {fragment.text}
                  </p>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm font-semibold text-slate-500">
                Document Assessment findings to create traceable narrative
                fragments.
              </p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
