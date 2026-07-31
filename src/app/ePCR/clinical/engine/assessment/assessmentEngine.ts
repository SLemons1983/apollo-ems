import type { AssessmentForm } from '../../assessment/assessmentForm';
import { extractAssessmentClinicalFacts } from '../facts/assessmentFactExtractor';
import { assessmentTasks } from './assessmentTasks';
import { assessmentFindingOptions } from './findings';
import type {
  AssessmentContext,
  AssessmentEngineResult,
  AssessmentFindingOption,
  AssessmentMode,
  AssessmentTask,
} from './types';

export function determineAssessmentMode(
  context: AssessmentContext,
): AssessmentMode {
  if (context.cardiacArrest) {
    return 'cardiac-arrest';
  }

  if (context.suspectedStroke) {
    return 'stroke';
  }

  if (context.behavioralHold) {
    return 'behavioral';
  }

  if (context.possibleTrauma) {
    return 'trauma';
  }

  return 'medical';
}

function taskMatchesContext(
  task: AssessmentTask,
  context: AssessmentContext,
): boolean {
  if (task.alwaysShow) {
    return true;
  }

  const trigger = task.triggeredBy;

  if (!trigger) {
    return false;
  }

  if (
    trigger.categories &&
    context.clinicalCategory &&
    trigger.categories.includes(context.clinicalCategory)
  ) {
    return true;
  }

  if (trigger.possibleTrauma && context.possibleTrauma) {
    return true;
  }

  if (trigger.suspectedStroke && context.suspectedStroke) {
    return true;
  }

  if (trigger.behavioralHold && context.behavioralHold) {
    return true;
  }

  if (trigger.cardiacArrest && context.cardiacArrest) {
    return true;
  }

  return false;
}

export function getAssessmentTasksForContext(
  context: AssessmentContext,
): AssessmentTask[] {
  const mode = determineAssessmentMode(context);

  return assessmentTasks.filter(
    (task) =>
      task.mode.includes(mode) &&
      taskMatchesContext(task, context),
  );
}

export function getAssessmentFindingsForContext(
  context: AssessmentContext,
): AssessmentFindingOption[] {
  return assessmentFindingOptions.filter((finding) => {
    if (!finding.categories || finding.categories.length === 0) {
      return true;
    }

    return Boolean(
      context.clinicalCategory &&
        finding.categories.includes(context.clinicalCategory),
    );
  });
}

export function getAdditionalAssessmentTasksForContext(
  context: AssessmentContext,
): AssessmentTask[] {
  const suggestedTaskIds = new Set(
    getAssessmentTasksForContext(context).map((task) => task.id),
  );

  const additionalTasks = assessmentTasks.filter(
    (task) => !suggestedTaskIds.has(task.id),
  );

  return additionalTasks.sort((firstTask, secondTask) => {
    const priorityOrder = [
      'trauma-assessment',
      'pain-assessment',
      'gfast-stroke-assessment',
    ];

    const firstPriority = priorityOrder.indexOf(firstTask.id);
    const secondPriority = priorityOrder.indexOf(secondTask.id);

    if (firstPriority === -1 && secondPriority === -1) {
      return 0;
    }

    if (firstPriority === -1) {
      return 1;
    }

    if (secondPriority === -1) {
      return -1;
    }

    return firstPriority - secondPriority;
  });
}

/**
 * Produces the canonical Assessment Engine result for the current patient.
 *
 * Existing workflow functions remain available for backward compatibility.
 * Downstream ACI, narrative, protocol, QA, billing, and analytics systems can
 * consume this snapshot without reading AssessmentForm directly.
 */
export function buildAssessmentEngineResult(
  context: AssessmentContext,
  form: AssessmentForm,
): AssessmentEngineResult {
  return {
    mode: determineAssessmentMode(context),
    suggestedTasks: getAssessmentTasksForContext(context),
    additionalTasks:
      getAdditionalAssessmentTasksForContext(context),
    availableFindings:
      getAssessmentFindingsForContext(context),
    clinicalFacts: extractAssessmentClinicalFacts(form),
  };
}