import { parseModelJson } from '../shared/json-utils';

interface AssertionResult {
  pass: boolean;
  score: number;
  reason: string;
}

interface Task {
  title?: string;
  dueAt?: string;
  priority?: string;
}

interface PriorityCheck {
  expected?: string;
  mustNotBeOmitted?: boolean;
  mustBeOmitted?: boolean;
}

function hasNoonTime(isoString: unknown): boolean {
  return typeof isoString === 'string' && isoString.includes('T12:00:00');
}

function checkPriority(
  task: Task,
  { expected, mustNotBeOmitted, mustBeOmitted }: PriorityCheck = {},
): string[] {
  const problems: string[] = [];
  if (mustBeOmitted && task.priority !== undefined) {
    problems.push(`priority should be omitted, got ${JSON.stringify(task.priority)}`);
  }
  if (mustNotBeOmitted) {
    if (task.priority === undefined) {
      problems.push('priority omitted, but explicit urgency language was stated');
    } else if (task.priority === 'none' || task.priority === '') {
      problems.push(
        `priority fabricated as ${JSON.stringify(task.priority)} instead of a real value or omission`,
      );
    } else if (expected && task.priority !== expected) {
      problems.push(`priority should be "${expected}", got ${JSON.stringify(task.priority)}`);
    }
  }
  return problems;
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
  const problems: string[] = [];

  if (caseId === 'urgency-and-date') {
    if (tasks.length !== 2) {
      return { pass: false, score: 0, reason: `Expected 2 tasks, got ${tasks.length}` };
    }
    const landlord = tasks.find((t) => /landlord|lease/i.test(t.title || ''));
    const dentist = tasks.find((t) => /dentist/i.test(t.title || ''));
    if (!landlord) problems.push('No landlord/lease task found');
    if (!dentist) problems.push('No dentist task found');

    if (landlord) {
      problems.push(...checkPriority(landlord, { expected: 'high', mustNotBeOmitted: true }));
      if (landlord.dueAt && !hasNoonTime(landlord.dueAt)) {
        problems.push(`Landlord task due "today" should default to noon, got ${landlord.dueAt}`);
      }
    }
    if (dentist) {
      problems.push(...checkPriority(dentist, { mustNotBeOmitted: true }));
      if (/urgent|high|asap|critical/i.test(dentist.priority || '')) {
        problems.push(`Dentist task priority "${dentist.priority}" contradicts stated "no rush"`);
      }
      if (dentist.dueAt && !hasNoonTime(dentist.dueAt)) {
        problems.push(
          `Dentist task due "next Friday" (no time given) should default to noon, got ${dentist.dueAt}`,
        );
      }
    }
  } else if (caseId === 'noon-default') {
    if (tasks.length !== 1) {
      return { pass: false, score: 0, reason: `Expected 1 task, got ${tasks.length}` };
    }
    const task = tasks[0];
    problems.push(...checkPriority(task, { mustBeOmitted: true }));
    if (!hasNoonTime(task.dueAt)) {
      problems.push(`Due date should default to noon, got ${task.dueAt}`);
    }
  } else if (caseId === 'in-two-weeks') {
    if (tasks.length !== 1) {
      return { pass: false, score: 0, reason: `Expected 1 task, got ${tasks.length}` };
    }
    const task = tasks[0];
    problems.push(...checkPriority(task, { mustBeOmitted: true }));
    if (!task.dueAt || !task.dueAt.startsWith('2026-07-2')) {
      problems.push(`Due date should resolve to ~2026-07-20, got ${task.dueAt}`);
    }
    if (!hasNoonTime(task.dueAt)) {
      problems.push(`Due date should default to noon, got ${task.dueAt}`);
    }
  } else if (caseId === 'explicit-clock-time') {
    if (tasks.length !== 1) {
      return { pass: false, score: 0, reason: `Expected 1 task, got ${tasks.length}` };
    }
    const task = tasks[0];
    if (!task.dueAt || !task.dueAt.includes('T15:00:00')) {
      problems.push(`Due date should use the stated 3pm (T15:00:00), got ${task.dueAt}`);
    }
  } else if (caseId === 'multi-mixed-urgency') {
    if (tasks.length !== 3) {
      return { pass: false, score: 0, reason: `Expected 3 tasks, got ${tasks.length}` };
    }
    const highPriorityTask = tasks.find((t) => /server|prod|production/i.test(t.title || ''));
    const low = tasks.find((t) => /book|read/i.test(t.title || ''));
    const neutral = tasks.find((t) => /grocer/i.test(t.title || ''));
    if (!highPriorityTask || !low || !neutral) {
      problems.push(
        'Could not find all three expected tasks (server/high, book/low, groceries/neutral)',
      );
    } else {
      problems.push(
        ...checkPriority(highPriorityTask, { expected: 'high', mustNotBeOmitted: true }),
      );
      problems.push(...checkPriority(low, { mustNotBeOmitted: true }));
      if (low.priority && /high/i.test(low.priority)) {
        problems.push(
          `Book task priority "${low.priority}" contradicts stated "whenever I get a chance"`,
        );
      }
      problems.push(...checkPriority(neutral, { mustBeOmitted: true }));
    }
  } else if (caseId === 'no-actionable-items') {
    if (tasks.length !== 0) {
      return { pass: false, score: 0, reason: `Expected empty task list, got ${tasks.length}` };
    }
  } else {
    return { pass: false, score: 0, reason: `Unknown caseId: ${caseId}` };
  }

  return problems.length
    ? { pass: false, score: 0, reason: problems.join('; ') }
    : { pass: true, score: 1, reason: 'All checks passed' };
};
