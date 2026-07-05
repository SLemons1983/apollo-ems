import type { ApolloBodySvgRegion } from './bodySvgTypes';

export const bodySvgBack: ApolloBodySvgRegion[] = [
  {
    id: 'head',
    label: 'Head',
    path: 'M300 70 C255 70 225 105 225 150 C225 195 255 230 300 230 C345 230 375 195 375 150 C375 105 345 70 300 70 Z',
  },
  {
    id: 'neck',
    label: 'Neck',
    path: 'M270 230 L330 230 L342 280 L258 280 Z',
  },
  {
    id: 'back',
    label: 'Back',
    path: 'M210 280 C235 250 365 250 390 280 L370 560 C335 590 265 590 230 560 Z',
  },
  {
    id: 'pelvis',
    label: 'Pelvis',
    path: 'M230 560 C265 590 335 590 370 560 L385 650 C340 680 260 680 215 650 Z',
  },
  {
    id: 'leftArm',
    label: 'Left Arm',
    path: 'M210 295 C165 315 135 390 120 485 C112 535 125 585 155 610 C180 560 190 475 210 390 Z',
  },
  {
    id: 'rightArm',
    label: 'Right Arm',
    path: 'M390 295 C435 315 465 390 480 485 C488 535 475 585 445 610 C420 560 410 475 390 390 Z',
  },
  {
    id: 'leftLeg',
    label: 'Left Leg',
    path: 'M235 650 C260 675 285 680 300 665 L285 835 C280 875 245 875 235 835 Z',
  },
  {
    id: 'rightLeg',
    label: 'Right Leg',
    path: 'M365 650 C340 675 315 680 300 665 L315 835 C320 875 355 875 365 835 Z',
  },
];
