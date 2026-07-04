import { assessmentFindingOptions } from './findings';
import { assessmentTasks } from './assessmentTasks';
import type {
  AssessmentContext,
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

function taskMatchesContext(task: AssessmentTask, context: AssessmentContext) {
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
    (task) => task.mode.includes(mode) && taskMatchesContext(task, context),
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

  return assessmentTasks.filter((task) => !suggestedTaskIds.has(task.id));
}
