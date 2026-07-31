'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import type { AssessmentForm } from '../../assessment/assessmentForm';
import {
  buildAssessmentEngineResult,
  type AssessmentContext,
  type AssessmentMode,
} from '../../engine/assessment';
import { evaluateAssessmentClinicalIntelligence } from '../../engine/intelligence';
import { calculateCcemsaGfastScore } from '../../engine/protocols/ccemsaStroke';
import {
  findBestVerifiedProtocol,
  protocolSourceLabel,
  protocolViewerUrl,
} from '../../engine/protocolReferenceIndex';

type ExistingAciFeedback = {
  id: string;
  severity: string;
  message: string;
};

type AciSuggestionFooterProps = {
  assessmentForm: AssessmentForm;
  assessmentMode: AssessmentMode;
  clinicalCategory: string;
  providerScope: 'ALS' | 'BLS';
  lemsa: string;
  feedback: ExistingAciFeedback[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type SuggestionRow = {
  id: string;
  label: string;
  value: string;
  explanation: string;
};

const notYetDetermined = 'Not yet determined';
const notificationRowIds = new Set([
  'clinical-findings',
  'protocol-match',
  'shock-risk',
  'gfast-score',
  'medications-consider',
  'medications-contraindicated',
  'other-considerations',
]);

function formatAssessmentMode(mode: AssessmentMode) {
  return mode
    .split('-')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

export default function AciSuggestionFooter({
  assessmentForm,
  assessmentMode,
  clinicalCategory,
  providerScope,
  lemsa,
  feedback,
  open,
  onOpenChange,
}: AciSuggestionFooterProps) {
  const [hasUnreadSuggestion, setHasUnreadSuggestion] = useState(false);
  const acknowledgedSignatureRef = useRef('');

  const assessmentContext = useMemo<AssessmentContext>(
    () => ({
      clinicalCategory,
      suspectedStroke: assessmentMode === 'stroke',
      possibleTrauma: assessmentMode === 'trauma',
      behavioralHold: assessmentMode === 'behavioral',
      cardiacArrest: assessmentMode === 'cardiac-arrest',
    }),
    [assessmentMode, clinicalCategory],
  );

  const assessmentIntelligence = useMemo(() => {
    try {
      return evaluateAssessmentClinicalIntelligence(
        buildAssessmentEngineResult(assessmentContext, assessmentForm),
      );
    } catch {
      return null;
    }
  }, [assessmentContext, assessmentForm]);

  const gfastDocumented = Object.values(assessmentForm.clinical.gfast).some(
    Boolean,
  );
  const gfastScore = gfastDocumented
    ? calculateCcemsaGfastScore({
        gaze: assessmentForm.clinical.gfast.gaze,
        face: assessmentForm.clinical.gfast.face,
        arms: assessmentForm.clinical.gfast.arms,
        speech: assessmentForm.clinical.gfast.speech,
        lastKnownNormal: assessmentForm.clinical.gfast.time,
        bloodGlucose: assessmentForm.clinical.gfast.bloodGlucose,
      })
    : null;

  const significantFindings = assessmentIntelligence?.significances ?? [];
  const criticalVitalCount = feedback.filter(
    (item) => item.severity === 'critical',
  ).length;
  const moderateVitalCount = feedback.filter(
    (item) => item.severity === 'moderate',
  ).length;
  const shockRisk =
    criticalVitalCount > 0
      ? 'High'
      : moderateVitalCount > 0
        ? 'Moderate'
        : feedback.some((item) => item.id.startsWith('vital-'))
          ? 'Low'
          : notYetDetermined;

  const protocolMatch = useMemo(
    () =>
      findBestVerifiedProtocol({
        lemsa,
        providerScope,
        assessmentMode,
        clinicalCategory,
        findings: significantFindings.flatMap((finding) => [
          finding.title,
          finding.description,
        ]),
        considerations: feedback.map((item) => item.message),
      }),
    [
      assessmentMode,
      clinicalCategory,
      feedback,
      lemsa,
      providerScope,
      significantFindings,
    ],
  );

  const rows = useMemo<SuggestionRow[]>(
    () => [
      {
        id: 'assessment-mode',
        label: 'Assessment Mode',
        value: formatAssessmentMode(assessmentMode),
        explanation:
          'Determined from the documented clinical category and the active trauma, stroke, behavioral, and cardiac-arrest indicators.',
      },
      {
        id: 'clinical-category',
        label: 'Clinical Category',
        value: clinicalCategory || notYetDetermined,
        explanation: clinicalCategory
          ? `The clinician selected ${clinicalCategory} in the Complaint section.`
          : 'Select a clinical category in the Complaint section to refine ACI suggestions.',
      },
      {
        id: 'provider-scope',
        label: 'Provider Scope',
        value: providerScope,
        explanation: `Based on the certification of the crew member identified as the documenting PCR provider. Current ACI scope is ${providerScope}.`,
      },
      {
        id: 'clinical-findings',
        label: 'Based on Clinical Findings',
        value:
          significantFindings.length > 0
            ? significantFindings.map((finding) => finding.title).join('; ')
            : notYetDetermined,
        explanation:
          significantFindings.length > 0
            ? significantFindings
                .map((finding) => finding.description)
                .join(' ')
            : 'No active clinically significant Assessment findings have been identified from the documentation entered so far.',
      },
      {
        id: 'protocol-match',
        label: 'Best Protocol Match',
        value: protocolMatch
          ? `${protocolMatch.protocol.number} — ${protocolMatch.protocol.title}`
          : notYetDetermined,
        explanation: protocolMatch
          ? `Matched from the documented PCR evidence: ${protocolMatch.matchedTerms.join(', ')}. Source: ${protocolSourceLabel(protocolMatch)}. Open the source PDF to review the complete protocol; page 1 is opened initially because the catalog does not claim an unsupported internal page citation.`
          : lemsa
            ? `No supported ${lemsa} ${providerScope} protocol match was determined from the documentation entered so far.`
            : 'Select the applicable LEMSA. ACI only displays a protocol match that is traceable to an indexed source PDF.',
      },
      {
        id: 'shock-risk',
        label: 'Risk of Shock',
        value: shockRisk,
        explanation:
          shockRisk === 'High'
            ? `${criticalVitalCount} critical vital alert${criticalVitalCount === 1 ? '' : 's'} support a high-risk indication. This is advisory and must be interpreted with the full patient assessment.`
            : shockRisk === 'Moderate'
              ? `${moderateVitalCount} moderate vital alert${moderateVitalCount === 1 ? '' : 's'} support a moderate-risk indication. This is advisory and must be interpreted with the full patient assessment.`
              : shockRisk === 'Low'
                ? 'Documented vital sets do not currently contain an active critical or moderate ACI vital alert.'
                : 'Document a complete vital set before ACI estimates shock risk.',
      },
      {
        id: 'gfast-score',
        label: 'GFAST Stroke Score',
        value: gfastScore === null ? notYetDetermined : String(gfastScore),
        explanation:
          gfastScore === null
            ? 'Document the Gaze, Face, Arm, and Speech findings to calculate the score.'
            : `Calculated from the documented Gaze, Face, Arm, and Speech findings. Current score: ${gfastScore}.`,
      },
      {
        id: 'medications-consider',
        label: 'Medications to Consider',
        value: notYetDetermined,
        explanation:
          'ACI will not recommend a medication until the recommendation can be traced to the applicable indexed protocol and filtered by provider scope.',
      },
      {
        id: 'medications-contraindicated',
        label: 'Contraindicated Medications',
        value: notYetDetermined,
        explanation:
          'ACI will not identify a protocol contraindication until the applicable indexed protocol and patient criteria are connected.',
      },
      {
        id: 'other-considerations',
        label: 'Other Clinical Considerations',
        value:
          feedback.length > 0
            ? feedback.map((item) => item.message).join(' • ')
            : notYetDetermined,
        explanation:
          feedback.length > 0
            ? 'These considerations come from the existing deterministic vital and GFAST rules active for the current documentation.'
            : 'Additional deterministic considerations will appear as relevant findings, vitals, and protocol criteria are documented.',
      },
    ],
    [
      assessmentMode,
      clinicalCategory,
      criticalVitalCount,
      feedback,
      gfastScore,
      lemsa,
      moderateVitalCount,
      providerScope,
      protocolMatch,
      shockRisk,
      significantFindings,
    ],
  );

  const suggestionSignature = useMemo(
    () =>
      JSON.stringify(
        rows
          .filter(({ id }) => notificationRowIds.has(id))
          .map(({ id, value }) => [id, value]),
      ),
    [rows],
  );

  useEffect(() => {
    if (!acknowledgedSignatureRef.current || open) {
      acknowledgedSignatureRef.current = suggestionSignature;
      setHasUnreadSuggestion(false);
      return;
    }

    if (suggestionSignature !== acknowledgedSignatureRef.current) {
      setHasUnreadSuggestion(true);
    }
  }, [open, suggestionSignature]);

  function toggleFooter() {
    const nextOpen = !open;
    if (nextOpen) {
      acknowledgedSignatureRef.current = suggestionSignature;
      setHasUnreadSuggestion(false);
    }
    onOpenChange(nextOpen);
  }

  const alerting = hasUnreadSuggestion && !open;
  const frameClass = alerting
    ? 'border-red-400 bg-red-50/95'
    : 'border-amber-300 bg-amber-50/95';
  const headerBorderClass = open
    ? alerting
      ? 'border-b border-red-200'
      : 'border-b border-amber-200'
    : '';

  return (
    <footer
      className={`sticky bottom-0 z-30 mt-6 rounded-t-2xl border shadow-[0_-8px_24px_rgba(15,23,42,0.14)] backdrop-blur transition-colors ${frameClass}`}
    >
      <button
        type="button"
        onClick={toggleFooter}
        aria-expanded={open}
        aria-controls="apollo-clinical-intelligence-content"
        className={`flex w-full flex-wrap items-center justify-between gap-3 px-4 py-3 text-left transition hover:bg-white/40 ${headerBorderClass}`}
      >
        <span className="flex items-center gap-2">
          <span aria-hidden="true" className={alerting ? 'text-red-800' : 'text-amber-800'}>
            {open ? '▼' : '▲'}
          </span>
          <span className={alerting ? 'font-black text-red-950' : 'font-black text-amber-950'}>
            Apollo Clinical Intelligence
          </span>
          {alerting && (
            <span className="rounded-full bg-red-700 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
              New suggestion
            </span>
          )}
        </span>
        <span className="flex items-center gap-3">
          <span className={`text-xs font-bold uppercase tracking-wide ${alerting ? 'text-red-800' : 'text-amber-800'}`}>
            {lemsa ? `${lemsa} selected` : 'Select a LEMSA for protocol guidance'}
          </span>
          <span className={`text-[10px] font-black uppercase tracking-wide ${alerting ? 'text-red-700' : 'text-amber-700'}`}>
            {open ? 'Collapse' : 'Expand'}
          </span>
        </span>
      </button>

      {open && (
        <div id="apollo-clinical-intelligence-content" className="max-h-[55vh] overflow-y-auto px-4 py-3">
          <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {rows.map((row) => (
              <div key={row.id} className="grid gap-1 px-3 py-2.5 sm:grid-cols-[minmax(190px,0.8fr)_minmax(0,2fr)_auto] sm:items-start sm:gap-4">
                <div className="text-xs font-black uppercase tracking-wide text-slate-600">
                  {row.label}
                </div>
                <div className={`text-sm font-bold ${row.value === notYetDetermined ? 'text-slate-400' : 'text-slate-900'}`}>
                  {row.value}
                  {row.id === 'protocol-match' && protocolMatch && (
                    <a
                      href={protocolViewerUrl(protocolMatch)}
                      target="_blank"
                      rel="noreferrer"
                      className="ml-3 inline-flex rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-xs font-black text-blue-800 hover:bg-blue-100"
                    >
                      View Protocol
                    </a>
                  )}
                </div>
                <span
                  tabIndex={0}
                  role="img"
                  aria-label={`Why: ${row.explanation}`}
                  title={row.explanation}
                  className="cursor-help text-base font-black text-blue-700 outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  ⓘ
                </span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-[11px] font-semibold text-slate-600">
            ACI suggestions are advisory and based only on documented information. The clinician remains responsible for assessment, protocol selection, and treatment decisions.
          </p>
        </div>
      )}
    </footer>
  );
}
