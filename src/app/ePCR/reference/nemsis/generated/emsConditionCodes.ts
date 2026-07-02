export type NemsisClinicalOption = {
  code: string;
  category: string;
  sourceLabel: string;
  suggestedLabel: string;
  note: string;
};

export const nemsisEmsConditionCodeOptions: NemsisClinicalOption[] = [
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
    "note": "Includes R:10.9 Unspecified abdominal pain"
  },
  {
    "code": "T50.90",
    "category": "Alcohol/Drug Exposure",
    "sourceLabel": "Poisoning by, adverse effect of and underdosing of unspecified drugs, medicaments and biological substances",
    "suggestedLabel": "Adverse effect of unspecified substance",
    "note": "Includes T50.904, T50.904A"
  },
  {
    "code": "F10.92",
    "category": "Alcohol/Drug Exposure",
    "sourceLabel": "Alcohol use, unspecified with intoxication",
    "suggestedLabel": "Alcohol intoxication",
    "note": ""
  },
  {
    "code": "F10.9",
    "category": "Alcohol/Drug Exposure",
    "sourceLabel": "Alcohol use, unspecified",
    "suggestedLabel": "Alcohol use",
    "note": ""
  },
  {
    "code": "F10.23",
    "category": "Alcohol/Drug Exposure",
    "sourceLabel": "Alcohol dependence with withdrawal",
    "suggestedLabel": "Alcohol withdrawal",
    "note": "Includes F10.239 Alcohol dependence with withdrawal, unspecified"
  },
  {
    "code": "F19",
    "category": "Alcohol/Drug Exposure",
    "sourceLabel": "Other psychoactive substance related disorders",
    "suggestedLabel": "Other psychoactive substance",
    "note": ""
  },
  {
    "code": "F13",
    "category": "Alcohol/Drug Exposure",
    "sourceLabel": "Sedative, hypnotic, or anxiolytic related disorders",
    "suggestedLabel": "Sedative, anti-anxiety related",
    "note": ""
  },
  {
    "code": "F11",
    "category": "Alcohol/Drug Exposure",
    "sourceLabel": "Opioid related disorders",
    "suggestedLabel": "Suspected Opioid related",
    "note": ""
  },
  {
    "code": "I20.9",
    "category": "Cardiovascular",
    "sourceLabel": "Angina pectoris, unspecified",
    "suggestedLabel": "Angina (pain related to heart)",
    "note": "Includes I20.0 Unstable angina"
  },
  {
    "code": "I49.9",
    "category": "Cardiovascular",
    "sourceLabel": "Cardiac arrhythmia, unspecified",
    "suggestedLabel": "Arrhythmia",
    "note": ""
  },
  {
    "code": "I46.9",
    "category": "Cardiovascular",
    "sourceLabel": "Cardiac arrest, cause unspecified",
    "suggestedLabel": "Cardiac arrest",
    "note": ""
  },
  {
    "code": "R07.9",
    "category": "Cardiovascular",
    "sourceLabel": "Chest pain, unspecified",
    "suggestedLabel": "Chest pain, NOS",
    "note": "Includes R07.89 Other chest pain"
  },
  {
    "code": "I50.9",
    "category": "Cardiovascular",
    "sourceLabel": "Heart failure, unspecified",
    "suggestedLabel": "Heart failure",
    "note": ""
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
    "note": ""
  },
  {
    "code": "I21",
    "category": "Cardiovascular",
    "sourceLabel": "Acute myocardial infarction",
    "suggestedLabel": "Myocardial Infarction, NOS",
    "note": ""
  },
  {
    "code": "I21.4",
    "category": "Cardiovascular",
    "sourceLabel": "Non-ST elevation (NSTEMI) myocardial infarction",
    "suggestedLabel": "Non-STEMI",
    "note": ""
  },
  {
    "code": "I99.9",
    "category": "Cardiovascular",
    "sourceLabel": "Unspecified disorder of circulatory system",
    "suggestedLabel": "Other, unspecified CV disorder",
    "note": ""
  },
  {
    "code": "I21.3",
    "category": "Cardiovascular",
    "sourceLabel": "ST elevation (STEMI) myocardial infarction of unspecified site",
    "suggestedLabel": "STEMI",
    "note": ""
  },
  {
    "code": "K92.2",
    "category": "Digestive",
    "sourceLabel": "Gastrointestinal hemorrhage, unspecified",
    "suggestedLabel": "Blood in vomit or stool (GI bleed)",
    "note": "Includes K92.0 Hematemesis"
  },
  {
    "code": "K59.00",
    "category": "Digestive",
    "sourceLabel": "Constipation, unspecified",
    "suggestedLabel": "Constipation",
    "note": ""
  },
  {
    "code": "K59.1",
    "category": "Digestive",
    "sourceLabel": "Functional diarrhea",
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
    "code": "R11.1",
    "category": "Digestive",
    "sourceLabel": "Vomiting",
    "suggestedLabel": "Vomiting",
    "note": "Includes R11.10 Vomiting, unspecified"
  },
  {
    "code": "F41.9",
    "category": "Emotional State/Behavior",
    "sourceLabel": "Anxiety disorder, unspecified",
    "suggestedLabel": "Anxiety",
    "note": "Includes F41.1 Generalized anxiety disorder"
  },
  {
    "code": "F32",
    "category": "Emotional State/Behavior",
    "sourceLabel": "Major depressive disorder, single episode",
    "suggestedLabel": "Depression",
    "note": "Includes F32.9 Major depressive disorder, single episode, unspecified"
  },
  {
    "code": "R45.85",
    "category": "Emotional State/Behavior",
    "sourceLabel": "Homicidal and suicidal ideations",
    "suggestedLabel": "Homicidal ideation",
    "note": "8/29 removed \"and suicidal\" from EMS Description, already covered in R45.851"
  },
  {
    "code": "F99",
    "category": "Emotional State/Behavior",
    "sourceLabel": "Mental disorder, not otherwise specified",
    "suggestedLabel": "Mental illness, NOS",
    "note": ""
  },
  {
    "code": "R45.89",
    "category": "Emotional State/Behavior",
    "sourceLabel": "Other symptoms and signs involving emotional state",
    "suggestedLabel": "Other emotional symptoms",
    "note": ""
  },
  {
    "code": "F60.8",
    "category": "Emotional State/Behavior",
    "sourceLabel": "Other specific personality disorders",
    "suggestedLabel": "Other personality disorder",
    "note": ""
  },
  {
    "code": "R45.851",
    "category": "Emotional State/Behavior",
    "sourceLabel": "Suicidal ideations",
    "suggestedLabel": "Suicidal ideation",
    "note": ""
  },
  {
    "code": "T14.91",
    "category": "Emotional State/Behavior",
    "sourceLabel": "Suicide attempt",
    "suggestedLabel": "Suicide attempt",
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
    "code": "E13.65",
    "category": "Endocrine/Urinary",
    "sourceLabel": "Other specified diabetes mellitus with hyperglycemia",
    "suggestedLabel": "Hyperglycemia, known diabetic",
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
    "code": "E13.64",
    "category": "Endocrine/Urinary",
    "sourceLabel": "Other specified diabetes mellitus with hypoglycemia",
    "suggestedLabel": "Hypoglycemia, known diabetic",
    "note": ""
  },
  {
    "code": "N17.8",
    "category": "Endocrine/Urinary",
    "sourceLabel": "Other acute kidney failure",
    "suggestedLabel": "Kidney failure, NOS",
    "note": ""
  },
  {
    "code": "N18.6",
    "category": "Endocrine/Urinary",
    "sourceLabel": "End stage renal disease",
    "suggestedLabel": "Kidney/renal disease requiring dialysis",
    "note": "Includes Z99.2 Dependence on renal dialysis"
  },
  {
    "code": "N39.0",
    "category": "Endocrine/Urinary",
    "sourceLabel": "Urinary tract infection, site not specified",
    "suggestedLabel": "Urinary tract infection (UTI)",
    "note": ""
  },
  {
    "code": "R50.9",
    "category": "Illness",
    "sourceLabel": "Fever, unspecified",
    "suggestedLabel": "Fever",
    "note": ""
  },
  {
    "code": "R68.89",
    "category": "Illness",
    "sourceLabel": "Other general symptoms and signs",
    "suggestedLabel": "General symptoms",
    "note": ""
  },
  {
    "code": "R69",
    "category": "Illness",
    "sourceLabel": "Illness, unspecified",
    "suggestedLabel": "Illness, NOS",
    "note": "8/21/20 \"NOS\" added to EMS description"
  },
  {
    "code": "A41.9",
    "category": "Illness",
    "sourceLabel": "Sepsis, unspecified organism",
    "suggestedLabel": "Sepsis",
    "note": ""
  },
  {
    "code": "B99.9",
    "category": "Illness",
    "sourceLabel": "Unspecified infectious disease",
    "suggestedLabel": "Unspecified infectious disease",
    "note": ""
  },
  {
    "code": "S99.91",
    "category": "Injury",
    "sourceLabel": "Unspecified injury of ankle",
    "suggestedLabel": "Ankle injury",
    "note": ""
  },
  {
    "code": "T30.0",
    "category": "Injury",
    "sourceLabel": "Burn of unspecified body region, unspecified degree",
    "suggestedLabel": "Burn, NOS",
    "note": ""
  },
  {
    "code": "S06.0X9",
    "category": "Injury",
    "sourceLabel": "Concussion with loss of consciousness of unspecified duration",
    "suggestedLabel": "Concussion, with LOC",
    "note": ""
  },
  {
    "code": "S06.0",
    "category": "Injury",
    "sourceLabel": "Concussion",
    "suggestedLabel": "Concussion, without LOC",
    "note": "Includes S06.0X0A Concussion without loss of consciousness, initial encounter and S06.0X9A"
  },
  {
    "code": "T79.9",
    "category": "Injury",
    "sourceLabel": "Unspecified early complication of trauma",
    "suggestedLabel": "Early complication of trauma",
    "note": "Includes T79.9XXA Unspecified early complication of trauma, initial encounter"
  },
  {
    "code": "S09.93",
    "category": "Injury",
    "sourceLabel": "Unspecified injury of face",
    "suggestedLabel": "Facial injury",
    "note": ""
  },
  {
    "code": "S99.92",
    "category": "Injury",
    "sourceLabel": "Unspecified injury of foot",
    "suggestedLabel": "Foot injury",
    "note": ""
  },
  {
    "code": "S59.91",
    "category": "Injury",
    "sourceLabel": "Unspecified injury of forearm",
    "suggestedLabel": "Forearm injury",
    "note": ""
  },
  {
    "code": "S09.90",
    "category": "Injury",
    "sourceLabel": "Unspecified injury of head",
    "suggestedLabel": "Head injury",
    "note": "Includes S09.90XA Unspecified injury of head, initial encounter"
  },
  {
    "code": "R58",
    "category": "Injury",
    "sourceLabel": "Hemorrhage, not elsewhere classified",
    "suggestedLabel": "Hemorrhage",
    "note": ""
  },
  {
    "code": "S79.91",
    "category": "Injury",
    "sourceLabel": "Unspecified injury of hip",
    "suggestedLabel": "Hip injury",
    "note": ""
  },
  {
    "code": "T14.90",
    "category": "Injury",
    "sourceLabel": "Injury, unspecified",
    "suggestedLabel": "Injury, unspecified",
    "note": "Includes T14.8 Other injury of unspecified body region"
  },
  {
    "code": "S39.92",
    "category": "Injury",
    "sourceLabel": "Unspecified injury of lower back",
    "suggestedLabel": "Lower back injury",
    "note": ""
  },
  {
    "code": "S89.9",
    "category": "Injury",
    "sourceLabel": "Unspecified injury of lower leg",
    "suggestedLabel": "Lower leg injury",
    "note": ""
  },
  {
    "code": "T07",
    "category": "Injury",
    "sourceLabel": "Unspecified multiple injuries",
    "suggestedLabel": "Multiple injuries",
    "note": ""
  },
  {
    "code": "S19.9",
    "category": "Injury",
    "sourceLabel": "Unspecified injury of neck",
    "suggestedLabel": "Neck injury",
    "note": ""
  },
  {
    "code": "S39.93",
    "category": "Injury",
    "sourceLabel": "Unspecified injury of pelvis",
    "suggestedLabel": "Pelvis injury",
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
    "code": "S79.92",
    "category": "Injury",
    "sourceLabel": "Unspecified injury of thigh",
    "suggestedLabel": "Thigh injury",
    "note": ""
  },
  {
    "code": "S29.9",
    "category": "Injury",
    "sourceLabel": "Unspecified injury of thorax",
    "suggestedLabel": "Thorax injury",
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
    "suggestedLabel": "Altered mental status",
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
    "suggestedLabel": "Disoriented",
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
    "code": "R53.83",
    "category": "Malaise",
    "sourceLabel": "Other fatigue",
    "suggestedLabel": "Fatigue",
    "note": ""
  },
  {
    "code": "R53.81",
    "category": "Malaise",
    "sourceLabel": "Other malaise",
    "suggestedLabel": "Malaise (feeling unwell)",
    "note": ""
  },
  {
    "code": "M62.81",
    "category": "Malaise",
    "sourceLabel": "Muscle weakness (generalized)",
    "suggestedLabel": "Muscle weakness",
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
    "code": "Z74.01",
    "category": "Mobility",
    "sourceLabel": "Bed confinement status",
    "suggestedLabel": "Bedridden",
    "note": ""
  },
  {
    "code": "Z74.09",
    "category": "Mobility",
    "sourceLabel": "Other reduced mobility",
    "suggestedLabel": "Reduced mobility",
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
    "code": "R42",
    "category": "Neurological",
    "sourceLabel": "Dizziness and giddiness",
    "suggestedLabel": "Lightheaded/vertigo",
    "note": ""
  },
  {
    "code": "G40.909",
    "category": "Neurological",
    "sourceLabel": "Epilepsy, unspecified, not intractable, without status epilepticus",
    "suggestedLabel": "Seizure, epileptic",
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
    "code": "G40.901",
    "category": "Neurological",
    "sourceLabel": "Epilepsy, unspecified, not intractable, with status epilepticus",
    "suggestedLabel": "Seizure, status epilepticus",
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
    "code": "G45.9",
    "category": "Neurological",
    "sourceLabel": "Transient cerebral ischemic attack, unspecified",
    "suggestedLabel": "TIA",
    "note": ""
  },
  {
    "code": "Z00.00",
    "category": "No Patient Complaint",
    "sourceLabel": "Encounter for general adult medical examination without abnormal findings",
    "suggestedLabel": "Adult general exam, no finding",
    "note": ""
  },
  {
    "code": "Z00.129",
    "category": "No Patient Complaint",
    "sourceLabel": "Encounter for routine child health examination without abnormal findings",
    "suggestedLabel": "Child general exam, no finding",
    "note": ""
  },
  {
    "code": "Z51.89",
    "category": "No Patient Complaint",
    "sourceLabel": "Encounter for other specified aftercare",
    "suggestedLabel": "Encounter for aftercare",
    "note": ""
  },
  {
    "code": "Z71.1",
    "category": "No Patient Complaint",
    "sourceLabel": "Person with feared health complaint in whom no diagnosis is made",
    "suggestedLabel": "Encounter, feared condition not observed",
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
    "code": "Z04.9",
    "category": "No Patient Complaint",
    "sourceLabel": "Encounter for examination and observation for unspecified reason",
    "suggestedLabel": "General exam, NOS",
    "note": ""
  },
  {
    "code": "Z03.89",
    "category": "No Patient Complaint",
    "sourceLabel": "Encounter for observation for other suspected diseases and conditions ruled out",
    "suggestedLabel": "Observation only",
    "note": ""
  },
  {
    "code": "Z04.6",
    "category": "No Patient Complaint",
    "sourceLabel": "Encounter for general psychiatric examination, requested by authority",
    "suggestedLabel": "Psych exam, requested by authority",
    "note": ""
  },
  {
    "code": "T76",
    "category": "Other",
    "sourceLabel": "Adult and child abuse, neglect and other maltreatment, suspected",
    "suggestedLabel": "Abuse/Neglect NOS, suspected",
    "note": "Added by request Jira NEMPUB-284"
  },
  {
    "code": "T78.40",
    "category": "Other",
    "sourceLabel": "Allergy, unspecified",
    "suggestedLabel": "Allergic reaction, NOS",
    "note": ""
  },
  {
    "code": "E86.0",
    "category": "Other",
    "sourceLabel": "Dehydration",
    "suggestedLabel": "Dehydration",
    "note": ""
  },
  {
    "code": "T67",
    "category": "Other",
    "sourceLabel": "Effects of heat and light",
    "suggestedLabel": "Heat related (heat stroke/exhaustion)",
    "note": ""
  },
  {
    "code": "D49",
    "category": "Other",
    "sourceLabel": "Neoplasms of unspecified behavior",
    "suggestedLabel": "New growth, tumor",
    "note": ""
  },
  {
    "code": "R99",
    "category": "Other",
    "sourceLabel": "Ill-defined and unknown cause of mortality",
    "suggestedLabel": "Obvious death",
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
    "code": "R51",
    "category": "Pain",
    "sourceLabel": "Headache",
    "suggestedLabel": "Headache",
    "note": ""
  },
  {
    "code": "M79.6",
    "category": "Pain",
    "sourceLabel": "Pain in limb, hand, foot, fingers and toes",
    "suggestedLabel": "Limb/hand/foot/fingers/toes pain",
    "note": "Includes M79.609 Pain in unspecified limb"
  },
  {
    "code": "M54.5",
    "category": "Pain",
    "sourceLabel": "Low back pain",
    "suggestedLabel": "Lower back pain",
    "note": ""
  },
  {
    "code": "G89.1",
    "category": "Pain",
    "sourceLabel": "Acute pain, not elsewhere classified",
    "suggestedLabel": "Pain, acute",
    "note": ""
  },
  {
    "code": "G89.11",
    "category": "Pain",
    "sourceLabel": "Acute pain due to trauma",
    "suggestedLabel": "Pain, acute due to trauma",
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
    "note": "Includes G89: Pain, not elsewhere classified (related to nervous system)"
  },
  {
    "code": "R10.2",
    "category": "Pain",
    "sourceLabel": "Pelvic and perineal pain",
    "suggestedLabel": "Pelvic/perineal pain",
    "note": ""
  },
  {
    "code": "O80",
    "category": "Reproductive System",
    "sourceLabel": "Encounter for full-term uncomplicated delivery",
    "suggestedLabel": "Normal delivery",
    "note": ""
  },
  {
    "code": "O26.90",
    "category": "Reproductive System",
    "sourceLabel": "Pregnancy related conditions, unspecified, unspecified trimester",
    "suggestedLabel": "Pregnancy related",
    "note": ""
  },
  {
    "code": "N93.9",
    "category": "Reproductive System",
    "sourceLabel": "Abnormal uterine and vaginal bleeding, unspecified",
    "suggestedLabel": "Vaginal bleeding, abnormal",
    "note": ""
  },
  {
    "code": "J45",
    "category": "Respiratory",
    "sourceLabel": "Asthma",
    "suggestedLabel": "Asthma",
    "note": "Includes J45.901 Unspecified asthma with (acute) exacerbation"
  },
  {
    "code": "J98.01",
    "category": "Respiratory",
    "sourceLabel": "Acute bronchospasm",
    "suggestedLabel": "Bronchospasm, acute",
    "note": ""
  },
  {
    "code": "J00",
    "category": "Respiratory",
    "sourceLabel": "Acute nasopharyngitis [common cold]",
    "suggestedLabel": "Common cold",
    "note": ""
  },
  {
    "code": "J44.1",
    "category": "Respiratory",
    "sourceLabel": "Chronic obstructive pulmonary disease with (acute) exacerbation",
    "suggestedLabel": "COPD",
    "note": "Includes J44.9 Chronic obstructive pulmonary disease, unspecified"
  },
  {
    "code": "R06.00",
    "category": "Respiratory",
    "sourceLabel": "Dyspnea, unspecified",
    "suggestedLabel": "Difficulty breathing",
    "note": ""
  },
  {
    "code": "J11",
    "category": "Respiratory",
    "sourceLabel": "Influenza due to unidentified influenza virus",
    "suggestedLabel": "Flu",
    "note": ""
  },
  {
    "code": "J81.0",
    "category": "Respiratory",
    "sourceLabel": "Acute pulmonary edema",
    "suggestedLabel": "Fluid in lungs",
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
    "code": "J18.9",
    "category": "Respiratory",
    "sourceLabel": "Pneumonia, unspecified organism",
    "suggestedLabel": "Pneumonia",
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
    "code": "J96.9",
    "category": "Respiratory",
    "sourceLabel": "Respiratory failure, unspecified",
    "suggestedLabel": "Respiratory failure",
    "note": ""
  },
  {
    "code": "J98.9",
    "category": "Respiratory",
    "sourceLabel": "Respiratory disorder, unspecified",
    "suggestedLabel": "Respiratory, other disorder",
    "note": ""
  },
  {
    "code": "R06.02",
    "category": "Respiratory",
    "sourceLabel": "Shortness of breath",
    "suggestedLabel": "Shortness of breath",
    "note": ""
  }
];
