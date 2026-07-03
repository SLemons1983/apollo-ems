export type KnowledgePackProtocol = {
  id: string;
  title: string;
  category: string;
  revision: string;
  sourceUrl: string;
  localPdf: string;
};

export type ApolloKnowledgePack = {
  id: string;
  displayName: string;
  region: string;
  version: string;
  protocols: KnowledgePackProtocol[];
};
