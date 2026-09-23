import type { ApolloBodyAgeGroup } from './bodyMapPatientProfile';
import type { ApolloBodyView } from './bodyMapTypes';
import type { ApolloBodySvgSex } from './svg/bodySvgTypes';

type Proportion = {
  scaleX: number;
  scaleY: number;
};

type IllustrationProfile = Proportion & {
  transform: string;
};

const proportions: Record<ApolloBodyAgeGroup, Proportion> = {
  neonate: { scaleX: 1.18, scaleY: 0.72 },
  infant: { scaleX: 1.16, scaleY: 0.76 },
  toddler: { scaleX: 1.13, scaleY: 0.82 },
  preschool: { scaleX: 1.10, scaleY: 0.87 },
  child: { scaleX: 1.07, scaleY: 0.91 },
  adolescent: { scaleX: 1.03, scaleY: 0.97 },
  adult: { scaleX: 1, scaleY: 1 },
  'middle-aged': { scaleX: 1.04, scaleY: 0.99 },
  senior: { scaleX: 1.08, scaleY: 0.95 },
};

const figureCenters: Record<
  ApolloBodySvgSex,
  Record<ApolloBodyView, { x: number; y: number }>
> = {
  male: {
    front: { x: 459, y: 980 },
    back: { x: 1094, y: 980 },
  },
  female: {
    front: { x: 368, y: 1001 },
    back: { x: 1113, y: 1001 },
  },
};

export function getApolloBodyIllustrationProfile(
  ageGroup: ApolloBodyAgeGroup | undefined,
  sex: ApolloBodySvgSex,
  view: ApolloBodyView,
): IllustrationProfile {
  const proportion = proportions[ageGroup ?? 'adult'];
  const center = figureCenters[sex][view];

  return {
    ...proportion,
    transform: [
      `translate(${center.x} ${center.y})`,
      `scale(${proportion.scaleX} ${proportion.scaleY})`,
      `translate(${-center.x} ${-center.y})`,
    ].join(' '),
  };
}
