export type NemsisClinicalOption = {
  code: string;
  category: string;
  sourceLabel: string;
  suggestedLabel: string;
  note: string;
};

export const nemsisSymptomOptions: NemsisClinicalOption[] = [
  {
    "code": "R10.0",
    "category": "Abdominal",
    "sourceLabel": "Acute abdomen",
    "suggestedLabel": "Acute pain",
    "note": ""
  },
  {
    "code": "R10.84",
    "category": "Abdominal",
    "sourceLabel": "Generalized abdominal pain",
    "suggestedLabel": "Generalized pain",
    "note": ""
  },
  {
    "code": "R10.3",
    "category": "Abdominal",
    "sourceLabel": "Pain localized to other parts of lower abdomen",
    "suggestedLabel": "Lower abdominal pain",
    "note": ""
  },
  {
    "code": "R10.81",
    "category": "Abdominal",
    "sourceLabel": "Abdominal tenderness",
    "suggestedLabel": "Tenderness",
    "note": ""
  },
  {
    "code": "R10.9",
    "category": "Abdominal",
    "sourceLabel": "Unspecified abdominal pain",
    "suggestedLabel": "Unspecified pain",
    "note": ""
  },
  {
    "code": "R10.1",
    "category": "Abdominal",
    "sourceLabel": "Pain localized to upper abdomen",
    "suggestedLabel": "Upper abdominal pain",
    "note": ""
  },
  {
    "code": "F10.9",
    "category": "Alcohol/Drug Exposure",
    "sourceLabel": "Alcohol use, unspecified",
    "suggestedLabel": "Alcohol use",
    "note": "Includes F10.92 Alcohol use, unspecified with intoxication, F10.98 and F10.988"
  },
  {
    "code": "F10.92",
    "category": "Alcohol/Drug Exposure",
    "sourceLabel": "Alcohol use, unspecified with intoxication",
    "suggestedLabel": "Alcohol use with intoxication",
    "note": ""
  },
  {
    "code": "T57.9",
    "category": "Alcohol/Drug Exposure",
    "sourceLabel": "Toxic effect of unspecified inorganic substance",
    "suggestedLabel": "Inorganic substance use",
    "note": ""
  },
  {
    "code": "T40.6",
    "category": "Alcohol/Drug Exposure",
    "sourceLabel": "Poisoning by, adverse effect of and underdosing of other and unspecified narcotics",
    "suggestedLabel": "Narcotic use",
    "note": ""
  },
  {
    "code": "T50",
    "category": "Alcohol/Drug Exposure",
    "sourceLabel": "Poisoning by, adverse effect of and underdosing of diuretics and other and unspecified drugs, medicaments and biological substances",
    "suggestedLabel": "Unspecified drugs/substance",
    "note": ""
  },
  {
    "code": "I20.9",
    "category": "Cardiovascular",
    "sourceLabel": "Angina pectoris, unspecified",
    "suggestedLabel": "Angina, NOS",
    "note": ""
  },
  {
    "code": "I49.9",
    "category": "Cardiovascular",
    "sourceLabel": "Cardiac arrhythmia, unspecified",
    "suggestedLabel": "Arrhythmia",
    "note": ""
  },
  {
    "code": "I48.91",
    "category": "Cardiovascular",
    "sourceLabel": "Unspecified atrial fibrillation",
    "suggestedLabel": "Atrial fibrillation, NOS",
    "note": ""
  },
  {
    "code": "I46.9",
    "category": "Cardiovascular",
    "sourceLabel": "Cardiac arrest, cause unspecified",
    "suggestedLabel": "Cardiac arrest",
    "note": "Includes I46: Cardiac arrest"
  },
  {
    "code": "I10",
    "category": "Cardiovascular",
    "sourceLabel": "Essential (primary) hypertension",
    "suggestedLabel": "Hypertension",
    "note": ""
  },
  {
    "code": "I95.9",
    "category": "Cardiovascular",
    "sourceLabel": "Hypotension, unspecified",
    "suggestedLabel": "Hypotension",
    "note": "Includes I95: Hypotension"
  },
  {
    "code": "I21",
    "category": "Cardiovascular",
    "sourceLabel": "Acute myocardial infarction",
    "suggestedLabel": "Myocardial infarction, NOS",
    "note": ""
  },
  {
    "code": "R00.2",
    "category": "Cardiovascular",
    "sourceLabel": "Palpitations",
    "suggestedLabel": "Palpitations",
    "note": ""
  },
  {
    "code": "I21.3",
    "category": "Cardiovascular",
    "sourceLabel": "ST elevation (STEMI) myocardial infarction of unspecified site",
    "suggestedLabel": "STEMI, NOS",
    "note": ""
  },
  {
    "code": "R14.0",
    "category": "Digestive",
    "sourceLabel": "Abdominal distension (gaseous)",
    "suggestedLabel": "Abdominal distention/bloating",
    "note": ""
  },
  {
    "code": "K59.00",
    "category": "Digestive",
    "sourceLabel": "Constipation, unspecified",
    "suggestedLabel": "Constipation",
    "note": ""
  },
  {
    "code": "R19.7",
    "category": "Digestive",
    "sourceLabel": "Diarrhea, unspecified",
    "suggestedLabel": "Diarrhea",
    "note": ""
  },
  {
    "code": "R11.0",
    "category": "Digestive",
    "sourceLabel": "Nausea",
    "suggestedLabel": "Nausea",
    "note": ""
  },
  {
    "code": "R11.10",
    "category": "Digestive",
    "sourceLabel": "Vomiting, unspecified",
    "suggestedLabel": "Vomiting",
    "note": ""
  },
  {
    "code": "K92.0",
    "category": "Digestive",
    "sourceLabel": "Hematemesis",
    "suggestedLabel": "Vomiting blood",
    "note": ""
  },
  {
    "code": "F41.9",
    "category": "Emotional State/Behavior",
    "sourceLabel": "Anxiety disorder, unspecified",
    "suggestedLabel": "Anxiety",
    "note": ""
  },
  {
    "code": "F32.9",
    "category": "Emotional State/Behavior",
    "sourceLabel": "Major depressive disorder, single episode, unspecified",
    "suggestedLabel": "Depression",
    "note": ""
  },
  {
    "code": "R45.7",
    "category": "Emotional State/Behavior",
    "sourceLabel": "State of emotional shock and stress, unspecified",
    "suggestedLabel": "Emotional shock/stress",
    "note": ""
  },
  {
    "code": "F99",
    "category": "Emotional State/Behavior",
    "sourceLabel": "Mental disorder, not otherwise specified",
    "suggestedLabel": "Mental illness, NOS",
    "note": ""
  },
  {
    "code": "R45.0",
    "category": "Emotional State/Behavior",
    "sourceLabel": "Nervousness",
    "suggestedLabel": "Nervousness",
    "note": ""
  },
  {
    "code": "R46.3",
    "category": "Emotional State/Behavior",
    "sourceLabel": "Overactivity",
    "suggestedLabel": "Overactivity",
    "note": ""
  },
  {
    "code": "R45.1",
    "category": "Emotional State/Behavior",
    "sourceLabel": "Restlessness and agitation",
    "suggestedLabel": "Restless/agitated",
    "note": ""
  },
  {
    "code": "R46.4",
    "category": "Emotional State/Behavior",
    "sourceLabel": "Slowness and poor responsiveness",
    "suggestedLabel": "Slowness/poor responsiveness",
    "note": ""
  },
  {
    "code": "R46.2",
    "category": "Emotional State/Behavior",
    "sourceLabel": "Strange and inexplicable behavior",
    "suggestedLabel": "Strange/inexplicable behavior",
    "note": "Includes R46 Symptoms and signs involving appearance and behavior"
  },
  {
    "code": "R45.851",
    "category": "Emotional State/Behavior",
    "sourceLabel": "Suicidal ideations",
    "suggestedLabel": "Suicidal ideation",
    "note": ""
  },
  {
    "code": "R45.6",
    "category": "Emotional State/Behavior",
    "sourceLabel": "Violent behavior",
    "suggestedLabel": "Violent behavior",
    "note": ""
  },
  {
    "code": "R45.82",
    "category": "Emotional State/Behavior",
    "sourceLabel": "Worries",
    "suggestedLabel": "Worries",
    "note": ""
  },
  {
    "code": "N18",
    "category": "Endocrine/Urinary",
    "sourceLabel": "Chronic kidney disease (CKD)",
    "suggestedLabel": "Chronic kidney disease",
    "note": "Includes N18.6"
  },
  {
    "code": "E13.8",
    "category": "Endocrine/Urinary",
    "sourceLabel": "Other specified diabetes mellitus with unspecified complications",
    "suggestedLabel": "Diabetic complications",
    "note": ""
  },
  {
    "code": "R73.9",
    "category": "Endocrine/Urinary",
    "sourceLabel": "Hyperglycemia, unspecified",
    "suggestedLabel": "Hyperglycemia",
    "note": ""
  },
  {
    "code": "E16.2",
    "category": "Endocrine/Urinary",
    "sourceLabel": "Hypoglycemia, unspecified",
    "suggestedLabel": "Hypoglycemia",
    "note": ""
  },
  {
    "code": "R30.0",
    "category": "Endocrine/Urinary",
    "sourceLabel": "Dysuria",
    "suggestedLabel": "Pain upon urination",
    "note": ""
  },
  {
    "code": "R33.9",
    "category": "Endocrine/Urinary",
    "sourceLabel": "Retention of urine, unspecified",
    "suggestedLabel": "Unable to urinate",
    "note": ""
  },
  {
    "code": "N19",
    "category": "Endocrine/Urinary",
    "sourceLabel": "Unspecified kidney failure",
    "suggestedLabel": "Uremia (on dialysis)",
    "note": ""
  },
  {
    "code": "R50.9",
    "category": "Illness",
    "sourceLabel": "Fever, unspecified",
    "suggestedLabel": "Fever, NOS",
    "note": ""
  },
  {
    "code": "R68.89",
    "category": "Illness",
    "sourceLabel": "Other general symptoms and signs",
    "suggestedLabel": "General symptoms, NOS",
    "note": ""
  },
  {
    "code": "R69",
    "category": "Illness",
    "sourceLabel": "Illness, unspecified",
    "suggestedLabel": "Illness, NOS",
    "note": ""
  },
  {
    "code": "R99",
    "category": "Illness",
    "sourceLabel": "Ill-defined and unknown cause of mortality",
    "suggestedLabel": "Undefined/unknown",
    "note": ""
  },
  {
    "code": "S09.93",
    "category": "Injury",
    "sourceLabel": "Unspecified injury of face",
    "suggestedLabel": "Facial injury",
    "note": ""
  },
  {
    "code": "S09.90",
    "category": "Injury",
    "sourceLabel": "Unspecified injury of head",
    "suggestedLabel": "Head injury",
    "note": ""
  },
  {
    "code": "R58",
    "category": "Injury",
    "sourceLabel": "Hemorrhage, not elsewhere classified",
    "suggestedLabel": "Hemorrhage, NOS",
    "note": ""
  },
  {
    "code": "S79",
    "category": "Injury",
    "sourceLabel": "Other and unspecified injuries of hip and thigh",
    "suggestedLabel": "Hip/thigh injury",
    "note": "Includes S79.91 Unspecified injury of hip"
  },
  {
    "code": "T14",
    "category": "Injury",
    "sourceLabel": "Injury of unspecified body region",
    "suggestedLabel": "Injury, NOS",
    "note": "Includes T14.90 Injury, unspecified"
  },
  {
    "code": "S89.90",
    "category": "Injury",
    "sourceLabel": "Unspecified injury of unspecified lower leg",
    "suggestedLabel": "Lower leg injury",
    "note": ""
  },
  {
    "code": "T07",
    "category": "Injury",
    "sourceLabel": "Unspecified multiple injuries",
    "suggestedLabel": "Multiple injuries, NOS",
    "note": ""
  },
  {
    "code": "S49.9",
    "category": "Injury",
    "sourceLabel": "Unspecified injury of shoulder and upper arm",
    "suggestedLabel": "Shoulder/upper arm injury",
    "note": ""
  },
  {
    "code": "S69.9",
    "category": "Injury",
    "sourceLabel": "Unspecified injury of wrist, hand and finger(s)",
    "suggestedLabel": "Wrist/hand/finger injury",
    "note": ""
  },
  {
    "code": "R41.82",
    "category": "Level of Consciousness",
    "sourceLabel": "Altered mental status, unspecified",
    "suggestedLabel": "Altered mental status, NOS",
    "note": ""
  },
  {
    "code": "R40.4",
    "category": "Level of Consciousness",
    "sourceLabel": "Transient alteration of awareness",
    "suggestedLabel": "Altered mental status, transient",
    "note": ""
  },
  {
    "code": "R41.0",
    "category": "Level of Consciousness",
    "sourceLabel": "Disorientation, unspecified",
    "suggestedLabel": "Disoriented, NOS",
    "note": ""
  },
  {
    "code": "R40.0",
    "category": "Level of Consciousness",
    "sourceLabel": "Somnolence",
    "suggestedLabel": "Drowsiness",
    "note": ""
  },
  {
    "code": "R55",
    "category": "Level of Consciousness",
    "sourceLabel": "Syncope and collapse",
    "suggestedLabel": "Fainting/collapse",
    "note": ""
  },
  {
    "code": "R40.20",
    "category": "Level of Consciousness",
    "sourceLabel": "Unspecified coma",
    "suggestedLabel": "Unconscious, NOS",
    "note": ""
  },
  {
    "code": "R53.83",
    "category": "Malaise",
    "sourceLabel": "Other fatigue",
    "suggestedLabel": "Fatigue, NOS",
    "note": ""
  },
  {
    "code": "R53.81",
    "category": "Malaise",
    "sourceLabel": "Other malaise",
    "suggestedLabel": "Malaise, NOS",
    "note": ""
  },
  {
    "code": "R53.1",
    "category": "Malaise",
    "sourceLabel": "Weakness",
    "suggestedLabel": "Weakness",
    "note": ""
  },
  {
    "code": "R26.89",
    "category": "Nervous/Musculoskeletal",
    "sourceLabel": "Other abnormalities of gait and mobility",
    "suggestedLabel": "Abnormal gait/mobility",
    "note": ""
  },
  {
    "code": "R25.8",
    "category": "Nervous/Musculoskeletal",
    "sourceLabel": "Other abnormal involuntary movements",
    "suggestedLabel": "Abnormal involuntary movements",
    "note": ""
  },
  {
    "code": "R25.2",
    "category": "Nervous/Musculoskeletal",
    "sourceLabel": "Cramp and spasm",
    "suggestedLabel": "Cramp/spasm",
    "note": ""
  },
  {
    "code": "R26.2",
    "category": "Nervous/Musculoskeletal",
    "sourceLabel": "Difficulty in walking, not elsewhere classified",
    "suggestedLabel": "Difficulty walking",
    "note": ""
  },
  {
    "code": "R29.810",
    "category": "Nervous/Musculoskeletal",
    "sourceLabel": "Facial weakness",
    "suggestedLabel": "Facial weakness",
    "note": ""
  },
  {
    "code": "R29.8",
    "category": "Nervous/Musculoskeletal",
    "sourceLabel": "Other symptoms and signs involving the nervous and musculoskeletal systems",
    "suggestedLabel": "Other symptoms, NOS",
    "note": "Includes R29.818"
  },
  {
    "code": "R29.6",
    "category": "Nervous/Musculoskeletal",
    "sourceLabel": "Repeated falls",
    "suggestedLabel": "Repeated falls",
    "note": ""
  },
  {
    "code": "R56.9",
    "category": "Neurological",
    "sourceLabel": "Unspecified convulsions",
    "suggestedLabel": "Convulsions, NOS",
    "note": ""
  },
  {
    "code": "G40.3",
    "category": "Neurological",
    "sourceLabel": "Generalized idiopathic epilepsy and epileptic syndromes",
    "suggestedLabel": "Epileptic seizure/syndrome",
    "note": ""
  },
  {
    "code": "R56.0",
    "category": "Neurological",
    "sourceLabel": "Febrile convulsions",
    "suggestedLabel": "Febrile convulsions",
    "note": ""
  },
  {
    "code": "R42",
    "category": "Neurological",
    "sourceLabel": "Dizziness and giddiness",
    "suggestedLabel": "Lightheaded/vertigo",
    "note": ""
  },
  {
    "code": "G40.89",
    "category": "Neurological",
    "sourceLabel": "Other seizures",
    "suggestedLabel": "Seizure, NOS",
    "note": ""
  },
  {
    "code": "R47.81",
    "category": "Neurological",
    "sourceLabel": "Slurred speech",
    "suggestedLabel": "Slurred speech",
    "note": ""
  },
  {
    "code": "I63.9",
    "category": "Neurological",
    "sourceLabel": "Cerebral infarction, unspecified",
    "suggestedLabel": "Stroke",
    "note": ""
  },
  {
    "code": "T76",
    "category": "No Patient Complaint",
    "sourceLabel": "Adult and child abuse, neglect and other maltreatment, suspected",
    "suggestedLabel": "Abuse/Neglect NOS, suspected",
    "note": "Added in response to request 08/2019 Jira NEMPUB-284"
  },
  {
    "code": "Z00.00",
    "category": "No Patient Complaint",
    "sourceLabel": "Encounter for general adult medical examination without abnormal findings",
    "suggestedLabel": "Adult encounter, no finding",
    "note": "Includes Z71.1 Person with feared health complaint in whom no diagnosis is made"
  },
  {
    "code": "Z00.12",
    "category": "No Patient Complaint",
    "sourceLabel": "Encounter for routine child health examination",
    "suggestedLabel": "Child encounter, no finding",
    "note": "Includes Z00.129 Encounter for routine child health exam without abnormal findings"
  },
  {
    "code": "Z71.1",
    "category": "No Patient Complaint",
    "sourceLabel": "Person with feared health complaint in whom no diagnosis is made",
    "suggestedLabel": "Feared condition not observed",
    "note": ""
  },
  {
    "code": "Z00",
    "category": "No Patient Complaint",
    "sourceLabel": "Encounter for general examination without complaint, suspected or reported diagnosis",
    "suggestedLabel": "General exam, no complaint",
    "note": ""
  },
  {
    "code": "G89.11",
    "category": "Pain",
    "sourceLabel": "Acute pain due to trauma",
    "suggestedLabel": "Acute pain due to trauma",
    "note": ""
  },
  {
    "code": "M54.9",
    "category": "Pain",
    "sourceLabel": "Dorsalgia, unspecified",
    "suggestedLabel": "Back pain, NOS",
    "note": ""
  },
  {
    "code": "R07.89",
    "category": "Pain",
    "sourceLabel": "Other chest pain",
    "suggestedLabel": "Chest pain (not angina)",
    "note": ""
  },
  {
    "code": "R07.9",
    "category": "Pain",
    "sourceLabel": "Chest pain, unspecified",
    "suggestedLabel": "Chest pain, NOS",
    "note": ""
  },
  {
    "code": "H57.10",
    "category": "Pain",
    "sourceLabel": "Ocular pain, unspecified eye",
    "suggestedLabel": "Eye pain",
    "note": ""
  },
  {
    "code": "G50.1",
    "category": "Pain",
    "sourceLabel": "Atypical facial pain",
    "suggestedLabel": "Facial pain",
    "note": ""
  },
  {
    "code": "R51",
    "category": "Pain",
    "sourceLabel": "Headache",
    "suggestedLabel": "Headache",
    "note": ""
  },
  {
    "code": "M25.55",
    "category": "Pain",
    "sourceLabel": "Pain in hip",
    "suggestedLabel": "Hip pain",
    "note": "Includes M25.559 Pain in unspecified hip"
  },
  {
    "code": "M25.56",
    "category": "Pain",
    "sourceLabel": "Pain in knee",
    "suggestedLabel": "Knee pain",
    "note": "Includes M25.569 Pain in unspecified knee"
  },
  {
    "code": "M79.6",
    "category": "Pain",
    "sourceLabel": "Pain in limb, hand, foot, fingers and toes",
    "suggestedLabel": "Limb/hand/foot/fingers/toes pain",
    "note": "Includes M79.60, M79.603, M79.606, M79.609, M79.673"
  },
  {
    "code": "M54.5",
    "category": "Pain",
    "sourceLabel": "Low back pain",
    "suggestedLabel": "Lower back pain",
    "note": ""
  },
  {
    "code": "M54.2",
    "category": "Pain",
    "sourceLabel": "Cervicalgia",
    "suggestedLabel": "Neck pain",
    "note": ""
  },
  {
    "code": "G89.2",
    "category": "Pain",
    "sourceLabel": "Chronic pain, not elsewhere classified",
    "suggestedLabel": "Pain, chronic",
    "note": ""
  },
  {
    "code": "R52",
    "category": "Pain",
    "sourceLabel": "Pain, unspecified",
    "suggestedLabel": "Pain, NOS",
    "note": ""
  },
  {
    "code": "R10.2",
    "category": "Pain",
    "sourceLabel": "Pelvic and perineal pain",
    "suggestedLabel": "Pelvic/perineal pain",
    "note": ""
  },
  {
    "code": "R07.82",
    "category": "Pain",
    "sourceLabel": "Intercostal pain",
    "suggestedLabel": "Rib pain",
    "note": ""
  },
  {
    "code": "M25.51",
    "category": "Pain",
    "sourceLabel": "Pain in shoulder",
    "suggestedLabel": "Shoulder pain",
    "note": "Includes M25.519 Pain in unspecified shoulder"
  },
  {
    "code": "N93.9",
    "category": "Reproductive System",
    "sourceLabel": "Abnormal uterine and vaginal bleeding, unspecified",
    "suggestedLabel": "Vaginal bleeding, NOS",
    "note": ""
  },
  {
    "code": "R06",
    "category": "Respiratory",
    "sourceLabel": "Abnormalities of breathing",
    "suggestedLabel": "Abnormal breathing",
    "note": ""
  },
  {
    "code": "T17",
    "category": "Respiratory",
    "sourceLabel": "Foreign body in respiratory tract",
    "suggestedLabel": "Choking",
    "note": "Addition in response to J. Legler request 8/2019 Jira NEMPUB-282"
  },
  {
    "code": "J44.9",
    "category": "Respiratory",
    "sourceLabel": "Chronic obstructive pulmonary disease, unspecified",
    "suggestedLabel": "COPD, NOS",
    "note": ""
  },
  {
    "code": "R05",
    "category": "Respiratory",
    "sourceLabel": "Cough",
    "suggestedLabel": "Cough",
    "note": ""
  },
  {
    "code": "R06.00",
    "category": "Respiratory",
    "sourceLabel": "Dyspnea, unspecified",
    "suggestedLabel": "Difficulty breathing",
    "note": ""
  },
  {
    "code": "R04.0",
    "category": "Respiratory",
    "sourceLabel": "Epistaxis",
    "suggestedLabel": "Nosebleed",
    "note": ""
  },
  {
    "code": "R06.81",
    "category": "Respiratory",
    "sourceLabel": "Apnea, not elsewhere classified",
    "suggestedLabel": "Not breathing",
    "note": ""
  },
  {
    "code": "R06.89",
    "category": "Respiratory",
    "sourceLabel": "Other abnormalities of breathing",
    "suggestedLabel": "Other abnormalities of breathing",
    "note": ""
  },
  {
    "code": "R07.0",
    "category": "Respiratory",
    "sourceLabel": "Pain in throat",
    "suggestedLabel": "Pain in throat",
    "note": ""
  },
  {
    "code": "R07.1",
    "category": "Respiratory",
    "sourceLabel": "Chest pain on breathing",
    "suggestedLabel": "Painful breathing",
    "note": ""
  },
  {
    "code": "R06.3",
    "category": "Respiratory",
    "sourceLabel": "Periodic breathing",
    "suggestedLabel": "Periodic breathing",
    "note": ""
  },
  {
    "code": "R09.2",
    "category": "Respiratory",
    "sourceLabel": "Respiratory arrest",
    "suggestedLabel": "Respiratory arrest",
    "note": ""
  },
  {
    "code": "J80",
    "category": "Respiratory",
    "sourceLabel": "Acute respiratory distress syndrome",
    "suggestedLabel": "Respiratory distress",
    "note": ""
  },
  {
    "code": "R06.02",
    "category": "Respiratory",
    "sourceLabel": "Shortness of breath",
    "suggestedLabel": "Shortness of breath",
    "note": ""
  },
  {
    "code": "R06.2",
    "category": "Respiratory",
    "sourceLabel": "Wheezing",
    "suggestedLabel": "Wheezing",
    "note": ""
  },
  {
    "code": "R60.9",
    "category": "Skin",
    "sourceLabel": "Edema, unspecified",
    "suggestedLabel": "Edema",
    "note": ""
  },
  {
    "code": "R22",
    "category": "Skin",
    "sourceLabel": "Localized swelling, mass and lump of skin and subcutaneous tissue",
    "suggestedLabel": "Localized swelling/mass/lump",
    "note": "Includes R22.9 Localized swelling, mass and lump, unspecified"
  },
  {
    "code": "R20.0",
    "category": "Skin",
    "sourceLabel": "Anesthesia of skin",
    "suggestedLabel": "Numbness",
    "note": ""
  },
  {
    "code": "R23.8",
    "category": "Skin",
    "sourceLabel": "Other skin changes",
    "suggestedLabel": "Other skin changes",
    "note": ""
  },
  {
    "code": "R21",
    "category": "Skin",
    "sourceLabel": "Rash and other nonspecific skin eruption",
    "suggestedLabel": "Rash",
    "note": ""
  }
];
