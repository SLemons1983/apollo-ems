import type { AssessmentTask } from './types';

export const assessmentTasks: AssessmentTask[] = [
  {
    id: 'primary-assessment',
    title: 'Primary Assessment',
    mode: ['medical', 'trauma', 'cardiac-arrest', 'stroke', 'behavioral', 'ob', 'pediatric'],
    alwaysShow: true,
  },
  {
    id: 'history-taking',
    title: 'History Taking / OPQRST / SAMPLE',
    mode: ['medical', 'trauma', 'stroke', 'behavioral', 'ob', 'pediatric'],
    alwaysShow: true,
  },
  {
    id: 'secondary-assessment',
    title: 'Secondary Assessment',
    mode: ['medical', 'trauma', 'stroke', 'behavioral', 'ob', 'pediatric'],
    alwaysShow: true,
  },
  {
    id: 'cardiovascular-assessment',
    title: 'Cardiovascular Assessment',
    mode: ['medical'],
    triggeredBy: { categories: ['Cardiovascular'] },
  },
  {
    id: 'respiratory-assessment',
    title: 'Respiratory Assessment',
    mode: ['medical'],
    triggeredBy: { categories: ['Airway', 'Respiratory'] },
  },
  {
    id: 'neurological-assessment',
    title: 'Neurological Assessment',
    mode: ['medical', 'stroke', 'trauma'],
    triggeredBy: { categories: ['Neurological'], suspectedStroke: true },
  },
  {
    id: 'gfast-stroke-assessment',
    title: 'GFAST Stroke Assessment',
    mode: ['stroke'],
    triggeredBy: { suspectedStroke: true },
  },
  {
    id: 'trauma-assessment',
    title: 'Trauma Assessment',
    mode: ['trauma'],
    triggeredBy: { possibleTrauma: true },
  },
  {
    id: 'musculoskeletal-assessment',
    title: 'Musculoskeletal Assessment',
    mode: ['medical', 'trauma'],
    triggeredBy: { categories: ['Musculoskeletal', 'Injury'], possibleTrauma: true },
  },
  {
    id: 'psychological-assessment',
    title: 'Psychological / Behavioral Assessment',
    mode: ['behavioral', 'medical'],
    triggeredBy: { behavioralHold: true },
  },
  {
    id: 'skin-assessment',
    title: 'Skin Assessment',
    mode: ['medical', 'trauma', 'stroke', 'cardiac-arrest'],
    alwaysShow: true,
  },
  {
    id: 'reassessment',
    title: 'Reassessment',
    mode: ['medical', 'trauma', 'cardiac-arrest', 'stroke', 'behavioral', 'ob', 'pediatric'],
    alwaysShow: true,
  },
];
