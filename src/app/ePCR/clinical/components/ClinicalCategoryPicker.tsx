'use client';

import { getClinicalCategories } from '../engine';
import type { ClinicalListType } from '../engine';

type ClinicalCategoryPickerProps = {
  label: string;
  listType: ClinicalListType;
  value: string;
  onChange: (value: string) => void;
};

export default function ClinicalCategoryPicker({
  label,
  listType,
  value,
  onChange,
}: ClinicalCategoryPickerProps) {
  const categories = getClinicalCategories(listType);

  return (
    <label className="block">
      <span className="mb-1 block text-sm font-semibold text-slate-700">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm"
      >
        <option value=""></option>
        {categories.map((category) => (
          <option key={category} value={category}>
            {category}
          </option>
        ))}
      </select>
    </label>
  );
}
