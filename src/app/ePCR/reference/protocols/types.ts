export type ProtocolManifestEntry = {
  id: string;
  title: string;
  category: string;
  revision: string;
  pdf: string;
};

export type ProtocolPack = {
  id: string;
  displayName: string;
  version: string;
  protocols: ProtocolManifestEntry[];
};
