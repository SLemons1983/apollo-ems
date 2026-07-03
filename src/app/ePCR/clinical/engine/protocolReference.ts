export type ProtocolReference = {
  id: string;
  agency: string;
  title: string;
  providerScope?: string[];
  category?: string;
  url?: string;
};

export const protocolReferences: ProtocolReference[] = [];

export function getProtocolReferences(category?: string) {
  if (!category) {
    return protocolReferences;
  }

  return protocolReferences.filter(
    (reference) => reference.category === category,
  );
}
