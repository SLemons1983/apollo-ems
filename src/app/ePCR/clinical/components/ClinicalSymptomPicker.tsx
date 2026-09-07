'use client';

import { useMemo, useState } from 'react';
import { getClinicalOptions, searchClinicalOptions, toCodedSelection } from '../engine';
import type { ClinicalOption } from '../engine';
import type { CodedSelection } from '../../types';

type Props = {
  category?: string;
  primary: CodedSelection | null;
  associated: CodedSelection[];
  onPrimaryChange: (value: CodedSelection | null) => void;
  onAssociatedChange: (value: CodedSelection[]) => void;
};

const commonCodes = ['R07.9', 'R06.02', 'R10.9', 'R11.0', 'R11.10', 'R42', 'R53.1', 'R50.9', 'R55'];

function matches(left: CodedSelection | ClinicalOption, right: CodedSelection) {
  return left.code === right.code;
}

export default function ClinicalSymptomPicker({
  category,
  primary,
  associated,
  onPrimaryChange,
  onAssociatedChange,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const common = useMemo(() => {
    const all = getClinicalOptions('symptom');
    return commonCodes.map((code) => all.find((item) => item.code === code)).filter((item): item is ClinicalOption => Boolean(item));
  }, []);

  const results = useMemo(
    () => query.trim() ? searchClinicalOptions('symptom', query) : searchClinicalOptions('symptom', '', category),
    [category, query],
  );

  const isSelected = (option: ClinicalOption) =>
    Boolean(primary && matches(option, primary)) || associated.some((item) => matches(option, item));

  function add(option: ClinicalOption) {
    const selection = toCodedSelection(option);
    if (!selection || isSelected(option)) return;
    if (!primary) onPrimaryChange(selection);
    else onAssociatedChange([...associated, selection]);
  }

  function makePrimary(symptom: CodedSelection) {
    const oldPrimary = primary;
    onPrimaryChange(symptom);
    onAssociatedChange([
      ...associated.filter((item) => item.code !== symptom.code),
      ...(oldPrimary && oldPrimary.code !== symptom.code ? [oldPrimary] : []),
    ]);
  }

  return (
    <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">Signs &amp; Symptoms</h3>
          <p className="mt-1 text-xs text-slate-500">Add the primary symptom first, then any associated symptoms.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-slate-700">
          + Add Sign / Symptom
        </button>
      </div>

      {!primary && associated.length === 0 ? (
        <button type="button" onClick={() => setOpen(true)} className="mt-4 w-full rounded-lg border border-dashed border-slate-300 bg-white px-4 py-5 text-sm font-semibold text-slate-600 hover:border-slate-500 hover:bg-slate-50">
          No signs or symptoms documented yet. Tap to add.
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          {primary && (
            <div>
              <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Primary</div>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 shadow-sm">
                <span className="text-sm font-bold text-slate-900">{primary.description}</span>
                <button type="button" onClick={() => onPrimaryChange(null)} className="text-sm font-bold text-slate-400 hover:text-slate-700" title={`Remove ${primary.description}`}>×</button>
              </div>
            </div>
          )}
          {associated.length > 0 && (
            <div>
              <div className="mb-1 text-xs font-bold uppercase tracking-wide text-slate-500">Associated</div>
              <div className="flex flex-wrap gap-2">
                {associated.map((symptom) => (
                  <div key={symptom.code} className="flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 shadow-sm">
                    <button type="button" onClick={() => makePrimary(symptom)} className="text-sm font-semibold text-slate-700 hover:text-slate-950" title={`Make ${symptom.description} primary`}>{symptom.description}</button>
                    <button type="button" onClick={() => onAssociatedChange(associated.filter((item) => item.code !== symptom.code))} className="px-1 text-sm font-bold text-slate-400 hover:text-slate-700" title={`Remove ${symptom.description}`}>×</button>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-xs text-slate-500">Tap an associated symptom to make it primary.</p>
            </div>
          )}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-0 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-label="Add signs and symptoms">
          <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-950">Add Signs &amp; Symptoms</h2>
                <p className="text-xs text-slate-500">Search the NEMSIS symptom list and tap to add.</p>
              </div>
              <button type="button" onClick={() => { setOpen(false); setQuery(''); }} className="rounded-lg px-3 py-2 text-xl font-bold text-slate-500 hover:bg-slate-100" aria-label="Close">×</button>
            </div>

            <div className="border-b border-slate-200 p-4">
              <input autoFocus type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search signs & symptoms…" className="w-full rounded-xl border border-slate-300 px-4 py-3 text-base text-slate-900 shadow-sm outline-none focus:border-slate-500" />
            </div>

            <div className="overflow-y-auto p-4">
              {!query.trim() && (
                <div className="mb-5">
                  <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Common</div>
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                    {common.map((option) => (
                      <button key={option.code} type="button" disabled={isSelected(option)} onClick={() => add(option)} className="min-h-12 rounded-xl border border-slate-300 bg-white px-3 py-2 text-left text-sm font-semibold text-slate-800 shadow-sm hover:border-slate-500 hover:bg-slate-50 disabled:bg-slate-100 disabled:text-slate-400">
                        {isSelected(option) ? '✓ ' : ''}{option.suggestedLabel}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">{query.trim() ? 'Search Results' : category ? `${category} Symptoms` : 'Signs & Symptoms'}</div>
              <div className="space-y-2">
                {results.map((option) => (
                  <button key={`${option.code}-${option.suggestedLabel}`} type="button" disabled={isSelected(option)} onClick={() => add(option)} className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-left hover:border-slate-400 hover:bg-slate-50 disabled:bg-slate-100">
                    <span><span className="block text-sm font-semibold text-slate-900">{option.suggestedLabel}</span><span className="block text-xs text-slate-500">{option.category}</span></span>
                    <span className="text-sm font-bold text-slate-400">{isSelected(option) ? 'Added' : '+'}</span>
                  </button>
                ))}
                {results.length === 0 && <div className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No matching signs or symptoms found.</div>}
              </div>
            </div>

            <div className="border-t border-slate-200 p-4">
              <button type="button" onClick={() => { setOpen(false); setQuery(''); }} className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white">Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
