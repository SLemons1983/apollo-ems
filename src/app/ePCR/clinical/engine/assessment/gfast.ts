export type GfastField = {
  id: string;
  label: string;
  options: string[];
};

export const gfastFields: GfastField[] = [
  {
    id: 'gaze',
    label: 'Gaze',
    options: ['Normal', 'Abnormal', 'Unable to Assess'],
  },
  {
    id: 'face',
    label: 'Face',
    options: ['Normal', 'Facial Droop Present', 'Unable to Assess'],
  },
  {
    id: 'arms',
    label: 'Arms',
    options: ['Normal', 'Arm Drift Present', 'Unable to Assess'],
  },
  {
    id: 'speech',
    label: 'Speech',
    options: ['Normal', 'Slurred/Abnormal', 'Unable to Assess'],
  },
  {
    id: 'time',
    label: 'Time / Last Known Well',
    options: ['Documented', 'Unknown', 'Unable to Obtain'],
  },
];
