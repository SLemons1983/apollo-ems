import type { ApolloKnowledgePack } from '../../types';

export const ccemsaKnowledgePack: ApolloKnowledgePack = {
  id: 'ccemsa',
  displayName: 'Central California EMS Agency',
  region: 'Fresno, Kings, Madera, and Tulare Counties',
  version: '2026',
  protocols: [
    {
      id: '530.40',
      title: 'Suspected Stroke',
      category: 'Medical Protocol',
      revision: '',
      sourceUrl: '',
      localPdf: '',
    },
    {
      id: '544',
      title: 'Base Hospital Contact',
      category: 'Operations',
      revision: '',
      sourceUrl: '',
      localPdf: '',
    },
    {
      id: '547',
      title: 'Patient Destination',
      category: 'Operations',
      revision: '12/22/2025',
      sourceUrl: '',
      localPdf: '',
    },
  ],
};
