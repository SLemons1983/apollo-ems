'use client';

import { useMemo } from 'react';
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

function optionValue(option: ClinicalOption) {
  return `${option.code}|||${option.suggestedLabel}`;
}

export default function ClinicalCombobox({
  label,
  listType,
  category,
  value,
  excludedValues = [],
  onChange,
}: ClinicalComboboxProps) {
  const options = useMemo(() => {
    const results = searchClinicalOptions(listType, '', category);

    return results.filter(
      (option) =>
        !excludedValues.some((excludedValue) =>
          selectionsMatch(option, excludedValue),
        ),
    );
  }, [category, excludedValues, listType]);

  const selectedValue = useMemo(() => {
    if (!value) return '';

    const matchingOption = options.find((option) =>
      selectionsMatch(option, value),
    );

    return matchingOption ? optionValue(matchingOption) : '';
  }, [options, value]);

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
      </span>

      <select
        value={selectedValue}
        onChange={(event) => {
          const selectedOption = options.find(
            (option) => optionValue(option) === event.target.value,
          );

          onChange(toCodedSelection(selectedOption ?? null));
        }}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
      >
        <option value="">Select {label.toLowerCase()}</option>

        {options.map((option) => (
          <option
            key={optionValue(option)}
            value={optionValue(option)}
          >
            {option.suggestedLabel}
          </option>
        ))}
      </select>
    </label>
  );
}
