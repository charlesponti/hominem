import { getJobStatus, redis, REDIS_CHANNELS, type ResumeAnalysisJob } from '@hominem/queues';
import type { LoaderFunctionArgs } from 'react-router';

import { RESUME_STAGE_INFO } from '../lib/resume-import/stages';
import type { SseResumeEvent } from '../lib/resume-import/types';
import { userContext } from '../lib/middleware';

function toSseEvent(job: ResumeAnalysisJob): SseResumeEvent {
  const info = RESUME_STAGE_INFO[job.stage];
  return {
    jobId: job.jobId,
    stage: job.stage,
    label: info.label,
    percent: info.percent,
    error: job.status === 'error',
    errorMessage: job.error,
    diff: job.stage === 'done' ? job.diff : undefined,
  };
}

function isTerminal(status: ResumeAnalysisJob['status']): boolean {
  return status === 'done' || status === 'error' || status === 'cancelled';
}

export async function loader({ params, context }: LoaderFunctionArgs) {
  const user = context.get(userContext);
  if (!user) throw new Response('Unauthorized', { status: 401 });

  const jobId = params.jobId;
  if (!jobId) throw new Response('Missing jobId', { status: 400 });

  const encoder = new TextEncoder();
  let subscriber: ReturnType<typeof redis.duplicate> | null = null;

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      const close = () => {
        if (closed) return;
        closed = true;
        subscriber?.quit().catch(() => undefined);
        try {
          controller.close();
        } catch {
          // already closed
        }
      };

      const send = (event: SseResumeEvent) => {
        if (closed) return;
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      const snapshot = await getJobStatus<ResumeAnalysisJob>(jobId);
      if (!snapshot || snapshot.userId !== user.id) {
        send({
          jobId,
          stage: 'error',
          label: 'This analysis has expired or was not found — please upload again.',
          percent: 100,
          error: true,
        });
        close();
        return;
      }

      send(toSseEvent(snapshot));
      if (isTerminal(snapshot.status)) {
        close();
        return;
      }

      subscriber = redis.duplicate();
      await subscriber.subscribe(REDIS_CHANNELS.IMPORT_PROGRESS);
      subscriber.on('message', (_channel: string, message: string) => {
        try {
          const parsed = JSON.parse(message) as { type: string; data?: ResumeAnalysisJob[] };
          const job = (parsed.data ?? []).find((entry) => entry.jobId === jobId);
          if (!job) return;
          send(toSseEvent(job));
          if (isTerminal(job.status)) close();
        } catch {
          // ignore malformed pub/sub messages; the next snapshot remains authoritative
        }
      });
    },
    cancel() {
      subscriber?.quit().catch(() => undefined);
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  });
}
