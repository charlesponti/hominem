import { parseModelJson } from '../shared/json-utils';

interface Task {
  title?: string;
}

export default function checkTasks(output: string, caseId: string): void {
  let parsed: { tasks: Task[] };
  try {
    parsed = parseModelJson(output) as unknown as { tasks: Task[] };
  } catch (e) {
    throw new Error(`Invalid JSON: ${(e as Error).message}`);
  }

  const tasks = parsed.tasks;
  if (!Array.isArray(tasks)) {
    throw new Error('Missing or non-array "tasks" field');
  }

  if (caseId === 'multi-task') {
    if (tasks.length !== 2) {
      throw new Error(`Expected 2 tasks, got ${tasks.length}`);
    }
    const titles = tasks.map((t) => (t.title || '').toLowerCase());
    if (titles.some((t) => t.includes('repaint'))) {
      throw new Error(
        'Fabricated a task from the non-actionable "maybe repainting... at some point" mention',
      );
    }
    return;
  }

  if (caseId === 'no-tasks') {
    if (tasks.length !== 0) {
      throw new Error(`Expected empty task list, got ${tasks.length}`);
    }
    return;
  }

  if (caseId === 'single-task') {
    if (tasks.length !== 1) {
      throw new Error(`Expected 1 task, got ${tasks.length}`);
    }
    return;
  }

  if (caseId === 'many-tasks') {
    if (tasks.length !== 4) {
      throw new Error(`Expected 4 tasks, got ${tasks.length}`);
    }
    return;
  }

  if (caseId === 'implicit-actionable') {
    if (tasks.length !== 1) {
      throw new Error(`Expected 1 task, got ${tasks.length}`);
    }
    const title = (tasks[0].title || '').toLowerCase();
    if (!/passport|renew/.test(title)) {
      throw new Error(`Expected a passport-renewal task, got "${tasks[0].title}"`);
    }
    return;
  }

  throw new Error(`Unknown caseId: ${caseId}`);
}
