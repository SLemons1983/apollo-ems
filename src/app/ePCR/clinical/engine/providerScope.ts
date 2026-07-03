import type { ProviderScope } from '../types/clinical';

export const providerScopes: ProviderScope[] = [
  'EMT',
  'AEMT',
  'Paramedic',
  'Critical Care',
];

export function isAlsScope(scope?: ProviderScope) {
  return scope === 'Paramedic' || scope === 'Critical Care';
}

export function isBlsScope(scope?: ProviderScope) {
  return scope === 'EMT';
}
