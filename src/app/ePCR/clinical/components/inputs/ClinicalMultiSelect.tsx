'use client';

import { useMemo, useRef, useState } from 'react';

type ClinicalMultiSelectProps = {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
};

const exclusiveOptions = new Set(['None Reported', 'Unknown']);

function parseSelections(value: string) {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

export default function ClinicalMultiSelect({
  label,
  value,
  options,
  onChange,
}: ClinicalMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customValue, setCustomValue] = useState('');
  const blurTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const selected = useMemo(() => parseSelections(value), [value]);

  const filteredOptions = useMemo(() => {
    const query = search.trim().toLowerCase();
    return options.filter(
      (option) =>
        !selected.includes(option) &&
        (!query || option.toLowerCase().includes(query)),
    );
  }, [options, search, selected]);

  function commit(next: string[]) {
    onChange(Array.from(new Set(next)).join(', '));
  }

  function addSelection(option: string) {
    commit(
      exclusiveOptions.has(option)
        ? [option]
        : [...selected.filter((item) => !exclusiveOptions.has(item)), option],
    );
    setSearch('');
  }

  function addCustomValue() {
    const custom = customValue.trim();
    if (!custom) return;
    addSelection(custom);
    setCustomValue('');
  }

  function cancelPendingBlur() {
    if (blurTimer.current) clearTimeout(blurTimer.current);
  }

  return (
    <div
      className="relative block"
      onFocus={cancelPendingBlur}
      onBlur={() => {
        blurTimer.current = setTimeout(() => setOpen(false), 150);
      }}
    >
      <span className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <div className="rounded-lg border border-slate-300 bg-white p-2 shadow-sm">
        {selected.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {selected.map((item) => (
              <span
                key={item}
                className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-900"
              >
                {item}
                <button
                  type="button"
                  aria-label={`Remove ${item}`}
                  onClick={() =>
                    commit(selected.filter((selection) => selection !== item))
                  }
                  className="rounded-full px-1 text-blue-700 hover:bg-blue-200"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        <input
          type="search"
          value={search}
          placeholder={`Search ${label.toLowerCase()}...`}
          onFocus={() => setOpen(true)}
          onChange={(event) => {
            setSearch(event.target.value);
            setOpen(true);
          }}
          className="w-full border-0 px-1 py-1 text-slate-900 outline-none"
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-300 bg-white p-1 shadow-lg">
          {filteredOptions.length ? (
            filteredOptions.map((option) => (
              <button
                key={option}
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => addSelection(option)}
                className="block w-full rounded-md px-3 py-2 text-left text-sm text-slate-800 hover:bg-blue-50"
              >
                {option}
              </button>
            ))
          ) : (
            <p className="px-3 py-2 text-sm text-slate-500">
              No matching common selections.
            </p>
          )}

          <div className="mt-1 border-t border-slate-200 p-2">
            <span className="mb-1 block text-xs font-semibold text-slate-600">
              Other
            </span>
            <div className="flex gap-2">
              <input
                type="text"
                value={customValue}
                placeholder="Enter another value"
                onMouseDown={(event) => event.stopPropagation()}
                onChange={(event) => setCustomValue(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    addCustomValue();
                  }
                }}
                className="min-w-0 flex-1 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-900"
              />
              <button
                type="button"
                onMouseDown={(event) => event.preventDefault()}
                onClick={addCustomValue}
                disabled={!customValue.trim()}
                className="rounded-md bg-slate-900 px-3 py-1 text-sm font-semibold text-white disabled:bg-slate-300"
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="mt-1 text-xs text-slate-500">
        Select all that apply. Use Other for an unlisted entry.
      </p>
    </div>
  );
}
