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
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return options.slice(0, 10);
    }

    return options
      .filter(
        (option) =>
          option.code.toLowerCase().includes(query) ||
          option.description.toLowerCase().includes(query),
      )
      .slice(0, 10);
  }, [options, search]);

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
          {value ? `${value.code} — ${value.description}` : ''}
        </span>
        <span className="text-slate-500">{open ? '−' : '+'}</span>
      </button>

      {open && (
        <div className="absolute z-20 mt-2 max-h-80 w-full overflow-hidden rounded-xl border border-slate-300 bg-white shadow-lg">
          <div className="border-b border-slate-200 p-3">
            <input
              type="text"
              value={search}
              autoFocus
              onChange={(event) => setSearch(event.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 shadow-sm"
            />
          </div>

          <div className="max-h-56 overflow-y-auto p-2">
            {value && (
              <button
                type="button"
                onClick={() => {
                  onSelect(null);
                  setSearch('');
                  setOpen(false);
                }}
                className="mb-2 block w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm font-semibold text-slate-700 hover:bg-slate-100"
              >
                Clear Selection
              </button>
            )}

            {filteredOptions.map((option) => (
              <button
                key={`${option.code}-${option.description}`}
                type="button"
                onClick={() => {
                  onSelect(option);
                  setSearch('');
                  setOpen(false);
                }}
                className="block w-full rounded-lg px-3 py-2 text-left text-sm text-slate-800 hover:bg-slate-100"
              >
                <span className="font-bold">{option.code}</span> —{' '}
                {option.description}
              </button>
            ))}

            {filteredOptions.length === 0 && (
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
