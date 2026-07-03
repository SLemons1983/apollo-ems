import type { ProtocolPack } from '../../types';

export const ccemsaProtocolPack: ProtocolPack = {
  id: 'ccemsa',
  displayName: 'Central California EMS Agency',
  version: '2026',

  protocols: [
    {
      id: '530.40',
      title: 'Suspected Stroke',
      category: 'Medical',
      revision: '',
      pdf: '',
    },

    {
      id: '544',
      title: 'Base Hospital Contact',
      category: 'Operations',
      revision: '',
      pdf: '',
    },

    {
      id: '547',
      title: 'Patient Destination',
      category: 'Operations',
      revision: '',
      pdf: '',
    },
  ],
};
