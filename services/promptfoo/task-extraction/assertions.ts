import { parseModelJson } from '../shared/json-utils';

interface AssertionResult {
  pass: boolean;
  score: number;
  reason: string;
}

interface Task {
  title?: string;
}

export = function (output: string, context: { vars: Record<string, unknown> }): AssertionResult {
  let parsed: { tasks: Task[] };
  try {
    parsed = parseModelJson(output) as unknown as { tasks: Task[] };
  } catch (e) {
    return { pass: false, score: 0, reason: `Invalid JSON: ${(e as Error).message}` };
  }

  const tasks = parsed.tasks;
  if (!Array.isArray(tasks)) {
    return { pass: false, score: 0, reason: 'Missing or non-array "tasks" field' };
  }

  const caseId = context.vars.caseId as string;

  if (caseId === 'multi-task') {
    if (tasks.length !== 2) {
      return { pass: false, score: 0, reason: `Expected 2 tasks, got ${tasks.length}` };
    }
    const titles = tasks.map((t) => (t.title || '').toLowerCase());
    if (titles.some((t) => t.includes('repaint'))) {
      return {
        pass: false,
        score: 0,
        reason:
          'Fabricated a task from the non-actionable "maybe repainting... at some point" mention',
      };
    }
    return { pass: true, score: 1, reason: 'Correct task count, no fabricated tasks' };
  }

  if (caseId === 'no-tasks') {
    if (tasks.length !== 0) {
      return { pass: false, score: 0, reason: `Expected empty task list, got ${tasks.length}` };
    }
    return {
      pass: true,
      score: 1,
      reason: 'Correctly returned no tasks for a non-actionable conversation',
    };
  }

  if (caseId === 'single-task') {
    if (tasks.length !== 1) {
      return { pass: false, score: 0, reason: `Expected 1 task, got ${tasks.length}` };
    }
    return { pass: true, score: 1, reason: 'Correct single-task extraction' };
  }

  if (caseId === 'many-tasks') {
    if (tasks.length !== 4) {
      return { pass: false, score: 0, reason: `Expected 4 tasks, got ${tasks.length}` };
    }
    return { pass: true, score: 1, reason: 'Correctly extracted all 4 distinct tasks' };
  }

  if (caseId === 'implicit-actionable') {
    if (tasks.length !== 1) {
      return { pass: false, score: 0, reason: `Expected 1 task, got ${tasks.length}` };
    }
    const title = (tasks[0].title || '').toLowerCase();
    if (!/passport|renew/.test(title)) {
      return {
        pass: false,
        score: 0,
        reason: `Expected a passport-renewal task, got "${tasks[0].title}"`,
      };
    }
    return { pass: true, score: 1, reason: 'Correctly inferred the implicit actionable item' };
  }

  return { pass: false, score: 0, reason: `Unknown caseId: ${caseId}` };
};
