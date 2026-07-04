import type { AssessmentTask } from './types';

export const assessmentTasks: AssessmentTask[] = [
  {
    id: 'primary-assessment',
    title: 'Primary Assessment',
    mode: ['medical', 'trauma', 'cardiac-arrest', 'stroke', 'behavioral', 'ob', 'pediatric'],
    alwaysShow: true,
  },
  {
    id: 'abcde-assessment',
    title: 'ABCDE',
    mode: ['medical', 'trauma', 'cardiac-arrest', 'stroke', 'behavioral', 'ob', 'pediatric'],
    alwaysShow: true,
  },
  {
    id: 'consciousness-assessment',
    title: 'Consciousness Assessment / AVPU',
    mode: ['medical', 'trauma', 'cardiac-arrest', 'stroke', 'behavioral', 'ob', 'pediatric'],
    alwaysShow: true,
  },
  {
    id: 'neurological-assessment',
    title: 'Neurological / GCS',
    mode: ['medical', 'trauma', 'stroke', 'cardiac-arrest', 'behavioral', 'ob', 'pediatric'],
    alwaysShow: true,
  },
  {
    id: 'pupillary-assessment',
    title: 'Pupillary Assessment / PERRLA',
    mode: ['medical', 'trauma', 'stroke', 'cardiac-arrest', 'behavioral', 'ob', 'pediatric'],
    alwaysShow: true,
  },
  {
    id: 'history-taking',
    title: 'History Assessment / SAMPLE',
    mode: ['medical', 'trauma', 'stroke', 'behavioral', 'ob', 'pediatric'],
    alwaysShow: true,
  },
  {
    id: 'pain-assessment',
    title: 'Pain Assessment / OPQRST',
    mode: ['medical', 'trauma', 'stroke', 'behavioral', 'ob', 'pediatric'],
    triggeredBy: {
      categories: ['Cardiovascular', 'Musculoskeletal', 'Injury', 'Abdominal'],
      possibleTrauma: true,
    },
  },
  {
    id: 'trauma-assessment',
    title: 'Trauma Assessment / DCAP-BTLS',
    mode: ['trauma'],
    triggeredBy: { possibleTrauma: true },
  },
  {
    id: 'revised-trauma-score',
    title: 'Revised Trauma Score',
    mode: ['trauma'],
    triggeredBy: { possibleTrauma: true },
  },
  {
    id: 'extremity-assessment',
    title: 'Extremity Assessment / CMS-TP',
    mode: ['trauma', 'medical'],
    triggeredBy: {
      categories: ['Musculoskeletal', 'Injury'],
      possibleTrauma: true,
    },
  },
  {
    id: 'poisoning-assessment',
    title: 'Poisoning Assessment / SLUDGEM',
    mode: ['medical'],
    triggeredBy: { categories: ['Alcohol/Drug Exposure'] },
  },
  {
    id: 'aloc-assessment',
    title: 'Altered Level of Consciousness / AEIOU-TIPS',
    mode: ['medical', 'stroke', 'behavioral'],
    triggeredBy: { categories: ['Neurological', 'Alcohol/Drug Exposure'] },
  },
  {
    id: 'gfast-stroke-assessment',
    title: 'Stroke Assessment / GFAST',
    mode: ['stroke'],
    triggeredBy: { suspectedStroke: true },
  },
  {
    id: 'seizure-assessment',
    title: 'Seizure Assessment / FACTS',
    mode: ['medical'],
    triggeredBy: { categories: ['Neurological'] },
  },
  {
    id: 'respiratory-assessment',
    title: 'Respiratory Assessment / PASTMED',
    mode: ['medical'],
    triggeredBy: { categories: ['Airway', 'Respiratory'] },
  },
  {
    id: 'neonate-assessment',
    title: 'Neonate Assessment / APGAR',
    mode: ['ob', 'pediatric'],
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
