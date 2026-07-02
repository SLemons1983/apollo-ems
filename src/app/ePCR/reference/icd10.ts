export type CodedOption = {
  code: string;
  description: string;
};

export const emsIcd10Options: CodedOption[] = [
  { code: 'R07.9', description: 'Chest pain, unspecified' },
  { code: 'R06.02', description: 'Shortness of breath' },
  { code: 'R10.9', description: 'Abdominal pain, unspecified' },
  { code: 'R55', description: 'Syncope and collapse' },
  { code: 'R41.82', description: 'Altered mental status, unspecified' },
  { code: 'R56.9', description: 'Unspecified convulsions' },
  { code: 'I46.9', description: 'Cardiac arrest, cause unspecified' },
  { code: 'I63.9', description: 'Cerebral infarction, unspecified' },
  { code: 'G45.9', description: 'Transient cerebral ischemic attack, unspecified' },
  { code: 'E11.649', description: 'Type 2 diabetes mellitus with hypoglycemia without coma' },
  { code: 'E86.0', description: 'Dehydration' },
  { code: 'F10.929', description: 'Alcohol use, unspecified with intoxication, unspecified' },
  { code: 'T40.2X1A', description: 'Poisoning by other opioids, accidental, initial encounter' },
  { code: 'T50.901A', description: 'Poisoning by unspecified drugs, accidental, initial encounter' },
  { code: 'S09.90XA', description: 'Unspecified injury of head, initial encounter' },
  { code: 'S01.90XA', description: 'Unspecified open wound of head, initial encounter' },
  { code: 'S06.0X0A', description: 'Concussion without loss of consciousness, initial encounter' },
  { code: 'S72.009A', description: 'Fracture of unspecified part of neck of unspecified femur, initial encounter' },
  { code: 'S52.90XA', description: 'Unspecified fracture of unspecified forearm, initial encounter' },
  { code: 'T14.90XA', description: 'Injury, unspecified, initial encounter' },
  { code: 'T07.XXXA', description: 'Unspecified multiple injuries, initial encounter' },
  { code: 'T30.0', description: 'Burn of unspecified body region, unspecified degree' },
  { code: 'O80', description: 'Encounter for full-term uncomplicated delivery' },
  { code: 'R11.2', description: 'Nausea with vomiting, unspecified' },
  { code: 'R50.9', description: 'Fever, unspecified' },
  { code: 'R53.1', description: 'Weakness' },
  { code: 'R42', description: 'Dizziness and giddiness' },
  { code: 'R51.9', description: 'Headache, unspecified' },
  { code: 'M54.9', description: 'Dorsalgia, unspecified' },
  { code: 'F41.9', description: 'Anxiety disorder, unspecified' },
];
