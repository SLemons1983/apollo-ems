'use client';

import { useMemo, useState } from 'react';
import {
  searchClinicalOptions,
  toCodedSelection,
} from '../engine';
import type { ClinicalListType, ClinicalOption } from '../engine';
import type { CodedSelection } from '../../types';

type ClinicalComboboxProps = {
  label: string;
  listType: ClinicalListType;
  category?: string;
  value: CodedSelection | null;
  excludedValues?: CodedSelection[];
  onChange: (value: CodedSelection | null) => void;
};

function normalizeDescription(value: string) {
  return value.trim().toLowerCase();
}

function selectionsMatch(
  left: CodedSelection | ClinicalOption,
  right: CodedSelection,
) {
  if (left.code && right.code) {
    return left.code === right.code;
  }

  const leftDescription =
    'description' in left ? left.description : left.suggestedLabel;

  return (
    normalizeDescription(leftDescription) ===
    normalizeDescription(right.description)
  );
}

export default function ClinicalCombobox({
  label,
  listType,
  category,
  value,
  excludedValues = [],
  onChange,
}: ClinicalComboboxProps) {
  const [open, setOpen] = useState(false);
  const [searchText, setSearchText] = useState('');

  const results = useMemo(() => {
    const options = searchClinicalOptions(listType, searchText, category);

    return options.filter(
      (option) =>
        !excludedValues.some((excludedValue) =>
          selectionsMatch(option, excludedValue),
        ),
    );
  }, [category, excludedValues, listType, searchText]);

  function selectOption(option: ClinicalOption | null) {
    onChange(toCodedSelection(option));
    setSearchText('');
    setOpen(false);
  }

  return (
    <div className="relative block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className="flex w-full items-center justify-between gap-3 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-slate-900 shadow-sm"
      >
        <span className="truncate text-sm">
          {value ? value.description : ''}
        </span>
        <span className="text-slate-500">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="absolute z-30 mt-2 w-full overflow-hidden rounded-xl border border-slate-300 bg-white shadow-xl">
          <div className="border-b border-slate-200 p-3">
            <input
              type="text"
              value={searchText}
              autoFocus
              onChange={(event) => setSearchText(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
            />
          </div>

          <div className="max-h-64 overflow-y-auto p-2">
            {value && (
              <button
                type="button"
                onClick={() => selectOption(null)}
                className="mb-2 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Clear Selection
              </button>
            )}

            {results.map((option) => (
              <button
                key={`${option.code}-${option.suggestedLabel}`}
                type="button"
                onClick={() => selectOption(option)}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-100"
              >
                <span className="font-semibold">{option.suggestedLabel}</span>
              </button>
            ))}

            {results.length === 0 && (
              <div className="px-3 py-4 text-sm text-slate-500">
                No matching options found.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
