import type {
  ApolloBodySvgLayout,
  ApolloBodySvgRegion,
  ApolloBodySvgSex,
} from './bodySvgTypes';

const maleBack: ApolloBodySvgRegion[] = [
  {
    id: 'head',
    label: 'Head',
    path: 'M1042 45 Q1058 20 1094 20 Q1130 20 1146 45 L1142 113 Q1134 146 1094 158 Q1054 146 1046 113 Z',
  },
  {
    id: 'neck',
    label: 'Neck',
    path: 'M1064 141 Q1094 157 1124 141 L1128 181 Q1111 193 1094 193 Q1077 193 1060 181 Z',
  },
  {
    id: 'back',
    label: 'Back',
    path: 'M1031 172 Q1061 160 1094 174 Q1127 160 1157 172 L1182 225 L1171 419 Q1138 445 1094 445 Q1050 445 1017 419 L1006 225 Z',
  },
  {
    id: 'pelvis',
    label: 'Pelvis',
    path: 'M1017 417 Q1052 438 1094 438 Q1136 438 1171 417 L1178 565 Q1139 586 1094 586 Q1049 586 1010 565 Z',
  },
  {
    id: 'leftArm',
    label: "Patient's Left Arm",
    path: 'M1006 181 Q974 190 959 226 L935 361 L904 485 Q895 518 910 545 Q922 560 941 548 L978 420 L1008 283 Q1020 219 1006 181 Z',
  },
  {
    id: 'rightArm',
    label: "Patient's Right Arm",
    path: 'M1182 181 Q1214 190 1229 226 L1253 361 L1284 485 Q1293 518 1278 545 Q1266 560 1247 548 L1210 420 L1180 283 Q1168 219 1182 181 Z',
  },
  {
    id: 'leftLeg',
    label: "Patient's Left Leg",
    path: 'M1010 558 Q1045 577 1086 577 L1080 735 L1061 896 L1044 980 Q1031 1000 1007 986 L1000 950 L1010 760 Z',
  },
  {
    id: 'rightLeg',
    label: "Patient's Right Leg",
    path: 'M1178 558 Q1143 577 1102 577 L1108 735 L1127 896 L1144 980 Q1157 1000 1181 986 L1188 950 L1178 760 Z',
  },
];

const femaleBack: ApolloBodySvgRegion[] = [
  { id: 'head', label: 'Head', path: 'M1060 51 Q1076 23 1113 23 Q1150 23 1166 51 L1162 125 Q1154 158 1113 174 Q1072 158 1064 125 Z' },
  { id: 'neck', label: 'Neck', path: 'M1083 153 Q1113 171 1143 153 L1147 197 Q1130 209 1113 209 Q1096 209 1079 197 Z' },
  { id: 'back', label: 'Back', path: 'M1047 190 Q1080 176 1113 191 Q1146 176 1179 190 L1204 244 L1193 427 Q1165 453 1113 453 Q1061 453 1033 427 L1022 244 Z' },
  { id: 'pelvis', label: 'Pelvis', path: 'M1033 425 Q1071 448 1113 448 Q1155 448 1193 425 L1202 581 Q1161 603 1113 603 Q1065 603 1024 581 Z' },
  { id: 'leftArm', label: "Patient's Left Arm", path: 'M1022 197 Q992 207 977 244 L952 384 L919 517 Q910 549 926 575 Q939 589 958 574 L997 438 L1026 296 Q1036 233 1022 197 Z' },
  { id: 'rightArm', label: "Patient's Right Arm", path: 'M1204 197 Q1234 207 1249 244 L1274 384 L1307 517 Q1316 549 1300 575 Q1287 589 1268 574 L1229 438 L1200 296 Q1190 233 1204 197 Z' },
  { id: 'leftLeg', label: "Patient's Left Leg", path: 'M1024 574 Q1064 595 1105 595 L1099 755 L1080 920 L1065 1001 Q1051 1022 1025 1007 L1018 972 L1024 782 Z' },
  { id: 'rightLeg', label: "Patient's Right Leg", path: 'M1202 574 Q1162 595 1121 595 L1127 755 L1146 920 L1161 1001 Q1175 1022 1201 1007 L1208 972 L1202 782 Z' },
];

export const bodySvgBack: Record<ApolloBodySvgSex, ApolloBodySvgRegion[]> = {
  male: maleBack,
  female: femaleBack,
};

export const bodySvgBackLayout: Record<ApolloBodySvgSex, ApolloBodySvgLayout> = {
  male: {
    canvasWidth: 1536,
    canvasHeight: 1024,
    viewBox: '768 0 768 1024',
  },
  female: {
    canvasWidth: 1486,
    canvasHeight: 1058,
    viewBox: '743 0 743 1058',
  },
};
