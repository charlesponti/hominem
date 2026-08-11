import { humanizeIdentifier } from '@hominem/utils/text';

import type { StatusTone } from '~/components/patterns';

const PROJECT_STATUS_TONE: Record<string, StatusTone> = {
  BACKLOG: 'neutral',
  IN_PROGRESS: 'info',
  DONE: 'success',
  CANCELED: 'danger',
};

/** Get the shared StatusBadge tone for a project status (BACKLOG, IN_PROGRESS, DONE, CANCELED). */
export function getProjectStatusTone(status: string): StatusTone {
  return PROJECT_STATUS_TONE[status.toUpperCase()] ?? 'neutral';
}

export const formatProjectStatus = humanizeIdentifier;
