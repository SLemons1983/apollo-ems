'use client';

import { useMemo, useState } from 'react';
import type { CodedOption } from '../reference/icd10';

type CodedSearchPickerProps = {
  label: string;
  value: CodedOption | null;
  options: CodedOption[];
  onSelect: (value: CodedOption | null) => void;
};

export default function CodedSearchPicker({
  label,
  value,
  options,
  onSelect,
}: CodedSearchPickerProps) {
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return options.slice(0, 8);
    }

    return options
      .filter(
        (option) =>
          option.code.toLowerCase().includes(query) ||
          option.description.toLowerCase().includes(query),
      )
      .slice(0, 8);
  }, [options, search]);

  return (
    <div className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      {value && (
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2">
          <span className="text-sm font-semibold text-slate-800">
            {value.code} — {value.description}
          </span>
          <button
            type="button"
            onClick={() => onSelect(null)}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
          >
            Clear
          </button>
        </div>
      )}

      <input
        type="text"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
      />

      <div className="mt-2 space-y-2">
        {filteredOptions.map((option) => (
          <button
            key={`${option.code}-${option.description}`}
            type="button"
            onClick={() => {
              onSelect(option);
              setSearch('');
            }}
            className="block w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-left text-sm text-slate-800 hover:border-slate-400 hover:bg-slate-50"
          >
            <span className="font-bold">{option.code}</span> —{' '}
            {option.description}
          </button>
        ))}
      </div>
    </div>
  );
}
