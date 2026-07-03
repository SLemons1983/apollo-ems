import { nemsisEmsConditionCodeOptions } from '../../reference/nemsis/generated/emsConditionCodes';
import { nemsisImpressionOptions } from '../../reference/nemsis/generated/impressions';
import { nemsisSymptomOptions } from '../../reference/nemsis/generated/symptoms';
import type { ClinicalListType, ClinicalOption } from './types';

const clinicalLists: Record<ClinicalListType, ClinicalOption[]> = {
  impression: nemsisImpressionOptions,
  symptom: nemsisSymptomOptions,
  conditionCode: nemsisEmsConditionCodeOptions,
};

export function getClinicalOptions(listType: ClinicalListType) {
  return clinicalLists[listType];
}

export function getClinicalCategories(listType: ClinicalListType) {
  return Array.from(
    new Set(clinicalLists[listType].map((option) => option.category)),
  ).sort((a, b) => a.localeCompare(b));
}

export function getClinicalOptionsByCategory(
  listType: ClinicalListType,
  category: string,
) {
  return clinicalLists[listType].filter(
    (option) => option.category === category,
  );
}

export function searchClinicalOptions(
  listType: ClinicalListType,
  searchText: string,
  category?: string,
) {
  const query = searchText.trim().toLowerCase();
  const options = category
    ? getClinicalOptionsByCategory(listType, category)
    : getClinicalOptions(listType);

  if (!query) {
    return options.slice(0, 25);
  }

  return options
    .filter(
      (option) =>
        option.code.toLowerCase().includes(query) ||
        option.category.toLowerCase().includes(query) ||
        option.sourceLabel.toLowerCase().includes(query) ||
        option.suggestedLabel.toLowerCase().includes(query),
    )
    .slice(0, 25);
}

export function toCodedSelection(option: ClinicalOption | null) {
  if (!option) {
    return null;
  }

  return {
    code: option.code,
    description: option.suggestedLabel,
  };
}
