import type {
  ApolloBodySvgLayout,
  ApolloBodySvgRegion,
  ApolloBodySvgSex,
} from './bodySvgTypes';

const maleFront: ApolloBodySvgRegion[] = [
  {
    id: 'head',
    label: 'Head',
    path: 'M407 47 Q422 20 459 20 Q496 20 511 47 L507 112 Q501 148 459 163 Q417 148 411 112 Z',
  },
  {
    id: 'face',
    label: 'Face',
    path: 'M414 55 Q425 35 459 35 Q493 35 504 55 L501 111 Q493 139 459 151 Q425 139 417 111 Z',
  },
  {
    id: 'neck',
    label: 'Neck',
    path: 'M428 144 Q459 161 490 144 L493 181 Q477 193 459 193 Q441 193 425 181 Z',
  },
  {
    id: 'chest',
    label: 'Chest',
    path: 'M398 172 Q428 160 459 174 Q490 160 520 172 L544 225 L534 419 Q506 445 459 445 Q412 445 384 419 L374 225 Z',
    clip: { x: 360, y: 160, width: 200, height: 145 },
  },
  {
    id: 'abdomen',
    label: 'Abdomen',
    path: 'M398 172 Q428 160 459 174 Q490 160 520 172 L544 225 L534 419 Q506 445 459 445 Q412 445 384 419 L374 225 Z',
    clip: { x: 360, y: 305, width: 200, height: 116 },
  },
  {
    id: 'pelvis',
    label: 'Pelvis',
    path: 'M384 417 Q419 438 459 438 Q499 438 534 417 L541 565 Q503 586 459 586 Q415 586 377 565 Z',
  },
  {
    id: 'rightArm',
    label: "Patient's Right Arm",
    path: 'M374 181 Q342 190 327 226 L303 361 L272 485 Q263 518 278 545 Q290 560 309 548 L346 420 L376 283 Q388 219 374 181 Z',
  },
  {
    id: 'leftArm',
    label: "Patient's Left Arm",
    path: 'M544 181 Q576 190 591 226 L615 361 L646 485 Q655 518 640 545 Q628 560 609 548 L572 420 L542 283 Q530 219 544 181 Z',
  },
  {
    id: 'rightLeg',
    label: "Patient's Right Leg",
    path: 'M377 558 Q411 577 451 577 L445 735 L426 896 L409 980 Q396 1000 372 986 L365 950 L377 760 Z',
  },
  {
    id: 'leftLeg',
    label: "Patient's Left Leg",
    path: 'M541 558 Q507 577 467 577 L473 735 L492 896 L509 980 Q522 1000 546 986 L553 950 L541 760 Z',
  },
];

const femaleFront: ApolloBodySvgRegion[] = [
  { id: 'head', label: 'Head', path: 'M315 51 Q331 23 368 23 Q405 23 421 51 L417 125 Q409 158 368 174 Q327 158 319 125 Z' },
  { id: 'face', label: 'Face', path: 'M322 59 Q334 38 368 38 Q402 38 414 59 L411 123 Q402 151 368 163 Q334 151 325 123 Z' },
  { id: 'neck', label: 'Neck', path: 'M338 153 Q368 171 398 153 L402 197 Q385 209 368 209 Q351 209 334 197 Z' },
  { id: 'chest', label: 'Chest', path: 'M302 190 Q335 176 368 191 Q401 176 434 190 L459 244 L448 427 Q420 453 368 453 Q316 453 288 427 L277 244 Z', clip: { x: 265, y: 176, width: 205, height: 151 } },
  { id: 'abdomen', label: 'Abdomen', path: 'M302 190 Q335 176 368 191 Q401 176 434 190 L459 244 L448 427 Q420 453 368 453 Q316 453 288 427 L277 244 Z', clip: { x: 265, y: 327, width: 205, height: 102 } },
  { id: 'pelvis', label: 'Pelvis', path: 'M288 425 Q326 448 368 448 Q410 448 448 425 L457 581 Q416 603 368 603 Q320 603 279 581 Z' },
  { id: 'rightArm', label: "Patient's Right Arm", path: 'M277 197 Q247 207 232 244 L207 384 L174 517 Q165 549 181 575 Q194 589 213 574 L252 438 L281 296 Q291 233 277 197 Z' },
  { id: 'leftArm', label: "Patient's Left Arm", path: 'M459 197 Q489 207 504 244 L529 384 L562 517 Q571 549 555 575 Q542 589 523 574 L484 438 L455 296 Q445 233 459 197 Z' },
  { id: 'rightLeg', label: "Patient's Right Leg", path: 'M279 574 Q319 595 360 595 L354 755 L335 920 L320 1001 Q306 1022 280 1007 L273 972 L279 782 Z' },
  { id: 'leftLeg', label: "Patient's Left Leg", path: 'M457 574 Q417 595 376 595 L382 755 L401 920 L416 1001 Q430 1022 456 1007 L463 972 L457 782 Z' },
];

export const bodySvgFront: Record<ApolloBodySvgSex, ApolloBodySvgRegion[]> = {
  male: maleFront,
  female: femaleFront,
};

export const bodySvgFrontLayout: Record<ApolloBodySvgSex, ApolloBodySvgLayout> = {
  male: {
    canvasWidth: 1536,
    canvasHeight: 1024,
    viewBox: '0 0 768 1024',
  },
  female: {
    canvasWidth: 1486,
    canvasHeight: 1058,
    viewBox: '0 0 743 1058',
  },
};
