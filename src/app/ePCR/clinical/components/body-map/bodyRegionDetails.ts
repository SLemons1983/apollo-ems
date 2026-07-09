import type { ApolloBodyRegionKey } from './bodyMapTypes';

export type ApolloBodySubRegion = {
  id: string;
  label: string;
};

export const apolloBodyRegionDetails: Record<ApolloBodyRegionKey, ApolloBodySubRegion[]> = {
  head: [
    { id: 'scalp', label: 'Scalp' },
    { id: 'skull', label: 'Skull' },
    { id: 'ears', label: 'Ears' },
  ],
  face: [
    { id: 'eyes', label: 'Eyes' },
    { id: 'nose', label: 'Nose' },
    { id: 'mouth', label: 'Mouth' },
    { id: 'jaw', label: 'Jaw' },
  ],
  neck: [
    { id: 'anterior-neck', label: 'Anterior Neck' },
    { id: 'posterior-neck', label: 'Posterior Neck' },
    { id: 'c-spine', label: 'C-Spine' },
  ],
  chest: [
    { id: 'left-chest', label: 'Left Chest' },
    { id: 'right-chest', label: 'Right Chest' },
    { id: 'sternum', label: 'Sternum' },
  ],
  abdomen: [
    { id: 'ruq', label: 'Right Upper Quadrant' },
    { id: 'luq', label: 'Left Upper Quadrant' },
    { id: 'rlq', label: 'Right Lower Quadrant' },
    { id: 'llq', label: 'Left Lower Quadrant' },
  ],
  pelvis: [
    { id: 'left-hip', label: 'Left Hip' },
    { id: 'right-hip', label: 'Right Hip' },
    { id: 'groin', label: 'Groin' },
  ],
  back: [
    { id: 'upper-back', label: 'Upper Back' },
    { id: 'mid-back', label: 'Mid Back' },
    { id: 'lower-back', label: 'Lower Back' },
    { id: 'spine', label: 'Spine' },
  ],
  rightArm: [
    { id: 'right-shoulder', label: 'Shoulder' },
    { id: 'right-upper-arm', label: 'Upper Arm' },
    { id: 'right-elbow', label: 'Elbow' },
    { id: 'right-forearm', label: 'Forearm' },
    { id: 'right-wrist-hand', label: 'Wrist / Hand' },
  ],
  leftArm: [
    { id: 'left-shoulder', label: 'Shoulder' },
    { id: 'left-upper-arm', label: 'Upper Arm' },
    { id: 'left-elbow', label: 'Elbow' },
    { id: 'left-forearm', label: 'Forearm' },
    { id: 'left-wrist-hand', label: 'Wrist / Hand' },
  ],
  rightLeg: [
    { id: 'right-thigh', label: 'Thigh' },
    { id: 'right-knee', label: 'Knee' },
    { id: 'right-lower-leg', label: 'Lower Leg' },
    { id: 'right-ankle-foot', label: 'Ankle / Foot' },
  ],
  leftLeg: [
    { id: 'left-thigh', label: 'Thigh' },
    { id: 'left-knee', label: 'Knee' },
    { id: 'left-lower-leg', label: 'Lower Leg' },
    { id: 'left-ankle-foot', label: 'Ankle / Foot' },
  ],
};
