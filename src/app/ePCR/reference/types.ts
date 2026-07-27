export type ProtocolManifestEntry = {
  id: string;
  number: string;
  title: string;
  category: string;
  revision: string;
  pdf: string;
  source: "CCEMSA" | "Merced County EMS";
  level: "ALS" | "BLS" | "All";
};

export type ProtocolPack = {
  id: string;
  displayName: string;
  version: string;
  protocols: ProtocolManifestEntry[];
};
