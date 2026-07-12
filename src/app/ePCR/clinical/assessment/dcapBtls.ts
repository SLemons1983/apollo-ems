export const dcapBtlsFindings = [
  { field: 'deformity', label: 'Deformity' },
  { field: 'contusions', label: 'Contusions' },
  { field: 'abrasions', label: 'Abrasions' },
  { field: 'puncturesPenetrations', label: 'Punctures / Penetrations' },
  { field: 'burns', label: 'Burns' },
  { field: 'tenderness', label: 'Tenderness' },
  { field: 'lacerations', label: 'Lacerations' },
  { field: 'swelling', label: 'Swelling' },
] as const;

export type DcapBtlsFindingKey =
  (typeof dcapBtlsFindings)[number]['field'];

export type DcapBtlsFindings = Record<DcapBtlsFindingKey, boolean>;

export function createEmptyDcapBtlsFindings(): DcapBtlsFindings {
  return {
    deformity: false,
    contusions: false,
    abrasions: false,
    puncturesPenetrations: false,
    burns: false,
    tenderness: false,
    lacerations: false,
    swelling: false,
  };
}
