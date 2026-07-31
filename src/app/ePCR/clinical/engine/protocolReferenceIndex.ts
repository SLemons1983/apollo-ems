import { ccemsaProtocolPack } from '../../reference/ccemsa/manifest';
import type { ProtocolManifestEntry } from '../../reference/types';

export type ProtocolMatchInput = {
  lemsa: string;
  providerScope: 'ALS' | 'BLS';
  assessmentMode: string;
  clinicalCategory: string;
  findings: string[];
  considerations: string[];
};

export type VerifiedProtocolMatch = {
  protocol: ProtocolManifestEntry;
  score: number;
  matchedTerms: string[];
};

const titleAliases: Record<string, string[]> = {
  'cardiac arrest': ['cardiac arrest', 'pulseless', 'cpr', 'rosc'],
  'chest pain': ['chest pain', 'chest discomfort', 'cardiac', 'acs', 'stemi'],
  stroke: ['stroke', 'cva', 'gfast', 'facial droop', 'arm drift', 'speech'],
  'suspected stroke': ['stroke', 'cva', 'gfast', 'facial droop', 'arm drift', 'speech'],
  seizure: ['seizure', 'convulsion', 'postictal'],
  'respiratory distress': ['respiratory', 'dyspnea', 'shortness of breath', 'wheezing', 'hypoxia'],
  'airway obstruction': ['airway obstruction', 'choking', 'foreign body'],
  shock: ['shock', 'hypotension', 'poor perfusion'],
  'non traumatic shock': ['shock', 'hypotension', 'poor perfusion'],
  sepsis: ['sepsis', 'infection', 'fever', 'systemic infection'],
  trauma: ['trauma', 'injury'],
  burns: ['burn', 'thermal injury'],
  'allergic reaction': ['allergic', 'anaphylaxis', 'urticaria'],
  anaphylaxis: ['allergic', 'anaphylaxis', 'urticaria'],
  behavioral: ['behavioral', 'psychiatric', '5150', 'agitation'],
  poisoning: ['poisoning', 'overdose', 'ingestion', 'toxic'],
  hypoglycemia: ['hypoglycemia', 'low glucose'],
  hyperglycemia: ['hyperglycemia', 'high glucose'],
  pain: ['pain'],
  childbirth: ['childbirth', 'labor', 'obstetric', 'pregnancy'],
};

const conditionSpecificBoosts: Array<{ title: string; evidence: string[]; score: number }> = [
  {
    title: 'coronary ischemic chest discomfort',
    evidence: ['chest pain', 'chest discomfort', 'stemi', 'myocardial infarction', 'angina', 'diaphoretic', 'jaw', 'coronary artery disease'],
    score: 35,
  },
];

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function applicable(protocol: ProtocolManifestEntry, lemsa: string, scope: 'ALS' | 'BLS') {
  const sourceMatches =
    (lemsa === 'CCEMSA' && protocol.source === 'CCEMSA') ||
    (lemsa === 'Merced County' && protocol.source === 'Merced County EMS');
  if (!sourceMatches || !protocol.pdf) return false;
  return protocol.level === 'All' || protocol.level === scope;
}

function termsFor(protocol: ProtocolManifestEntry) {
  const normalizedTitle = normalize(protocol.title);
  const aliases = Object.entries(titleAliases)
    .filter(([key]) => normalizedTitle.includes(normalize(key)))
    .flatMap(([, values]) => values);
  return Array.from(new Set([normalizedTitle, ...aliases.map(normalize)]));
}

export function findBestVerifiedProtocol(input: ProtocolMatchInput): VerifiedProtocolMatch | null {
  if (!input.lemsa || !input.clinicalCategory) return null;

  const evidence = normalize([
    input.assessmentMode,
    input.clinicalCategory,
    ...input.findings,
    ...input.considerations,
  ].join(' '));

  const ranked = ccemsaProtocolPack.protocols
    .filter((protocol) => applicable(protocol, input.lemsa, input.providerScope))
    .map((protocol) => {
      const matchedTerms = termsFor(protocol).filter(
        (term) => term.length >= 4 && evidence.includes(term),
      );
      const exactTitle = evidence.includes(normalize(protocol.title));
      const boost = conditionSpecificBoosts
        .filter((rule) => normalize(protocol.title).includes(normalize(rule.title)))
        .reduce((total, rule) => {
          const hits = rule.evidence.filter((term) => evidence.includes(normalize(term))).length;
          return total + (hits >= 2 ? rule.score + hits * 8 : 0);
        }, 0);
      const genericPainPenalty = normalize(protocol.title).includes('pain management') &&
        ['chest pain', 'stemi', 'myocardial infarction', 'angina'].some((term) => evidence.includes(term))
          ? 40
          : 0;
      const score = matchedTerms.length * 10 + (exactTitle ? 25 : 0) + boost - genericPainPenalty;
      return { protocol, score, matchedTerms };
    })
    .filter((match) => match.score > 0)
    .sort((left, right) => right.score - left.score || left.protocol.title.localeCompare(right.protocol.title));

  return ranked[0] ?? null;
}

export function protocolSourceLabel(match: VerifiedProtocolMatch) {
  const { protocol } = match;
  return `${protocol.source} ${protocol.number} — ${protocol.title}`;
}

export function protocolViewerUrl(match: VerifiedProtocolMatch) {
  return `${match.protocol.pdf}#page=1`;
}
