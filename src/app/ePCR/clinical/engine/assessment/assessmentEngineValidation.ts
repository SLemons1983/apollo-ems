import { assessmentClinicalFactRegistry } from '../facts/assessmentFacts';
import type {
  AssessmentEngineResult,
  AssessmentMode,
  AssessmentTask,
} from './types';

export type AssessmentEngineValidationIssueCode =
  | 'invalid-mode'
  | 'duplicate-suggested-task'
  | 'duplicate-additional-task'
  | 'overlapping-task'
  | 'duplicate-clinical-fact'
  | 'invalid-clinical-fact';

export type AssessmentEngineValidationIssue = {
  readonly code: AssessmentEngineValidationIssueCode;
  readonly message: string;
  readonly itemId?: string;
};

export type AssessmentEngineValidationResult =
  | {
      readonly valid: true;
      readonly issues: readonly [];
    }
  | {
      readonly valid: false;
      readonly issues: readonly AssessmentEngineValidationIssue[];
    };

const assessmentModes: readonly AssessmentMode[] = [
  'medical',
  'trauma',
  'cardiac-arrest',
  'stroke',
  'behavioral',
  'ob',
  'pediatric',
];

function findDuplicateTaskIds(
  tasks: readonly AssessmentTask[],
): string[] {
  const seenTaskIds = new Set<string>();
  const duplicateTaskIds = new Set<string>();

  tasks.forEach((task) => {
    if (seenTaskIds.has(task.id)) {
      duplicateTaskIds.add(task.id);
      return;
    }

    seenTaskIds.add(task.id);
  });

  return [...duplicateTaskIds];
}

/**
 * Validates the structural and clinical integrity of an Assessment Engine
 * result without changing or interpreting its documented patient data.
 */
export function validateAssessmentEngineResult(
  result: AssessmentEngineResult,
): AssessmentEngineValidationResult {
  const issues: AssessmentEngineValidationIssue[] = [];

  if (!assessmentModes.includes(result.mode)) {
    issues.push({
      code: 'invalid-mode',
      message: `Assessment mode "${result.mode}" is not recognized.`,
      itemId: result.mode,
    });
  }

  findDuplicateTaskIds(result.suggestedTasks).forEach((taskId) => {
    issues.push({
      code: 'duplicate-suggested-task',
      message: `Suggested assessment task "${taskId}" appears more than once.`,
      itemId: taskId,
    });
  });

  findDuplicateTaskIds(result.additionalTasks).forEach((taskId) => {
    issues.push({
      code: 'duplicate-additional-task',
      message: `Additional assessment task "${taskId}" appears more than once.`,
      itemId: taskId,
    });
  });

  const suggestedTaskIds = new Set(
    result.suggestedTasks.map((task) => task.id),
  );

  const overlappingTaskIds = new Set(
    result.additionalTasks
      .map((task) => task.id)
      .filter((taskId) => suggestedTaskIds.has(taskId)),
  );

  overlappingTaskIds.forEach((taskId) => {
    issues.push({
      code: 'overlapping-task',
      message:
        `Assessment task "${taskId}" appears in both suggested ` +
        'and additional tasks.',
      itemId: taskId,
    });
  });

  const seenClinicalFactIds = new Set<string>();

  result.clinicalFacts.forEach((fact) => {
    if (seenClinicalFactIds.has(fact.id)) {
      issues.push({
        code: 'duplicate-clinical-fact',
        message: `Clinical fact "${fact.id}" appears more than once.`,
        itemId: fact.id,
      });
    } else {
      seenClinicalFactIds.add(fact.id);
    }

    const validation =
      assessmentClinicalFactRegistry.validate(fact);

    if (!validation.valid) {
      issues.push({
        code: 'invalid-clinical-fact',
        message: validation.message,
        itemId: fact.id,
      });
    }
  });

  if (issues.length > 0) {
    return {
      valid: false,
      issues,
    };
  }

  return {
    valid: true,
    issues: [],
  };
}

/**
 * Returns a validated Assessment Engine result or throws when the engine
 * produces an internally inconsistent snapshot.
 */
export function assertValidAssessmentEngineResult(
  result: AssessmentEngineResult,
): AssessmentEngineResult {
  const validation = validateAssessmentEngineResult(result);

  if (!validation.valid) {
    throw new Error(
      [
        'Invalid Assessment Engine result:',
        ...validation.issues.map(
          (issue) => `- ${issue.message}`,
        ),
      ].join('\n'),
    );
  }

  return result;
}