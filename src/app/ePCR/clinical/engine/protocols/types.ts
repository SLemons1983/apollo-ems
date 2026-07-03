export type ClinicalFinding = {
  id: string;
  category: string;
  label: string;
  value: string | number | boolean;
};

export type ClinicalConsideration = {
  id: string;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  description: string;
};

export type ProtocolRecommendation = {
  id: string;
  protocol: string;
  recommendation: string;
};

export type AssessmentResult = {
  findings: ClinicalFinding[];
  considerations: ClinicalConsideration[];
  recommendations: ProtocolRecommendation[];
};
