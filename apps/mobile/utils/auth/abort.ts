export function createAbortSignalWithTimeout(
  timeoutMs: number,
  externalSignal?: AbortSignal,
): {
  cleanup: () => void;
  signal: AbortSignal;
} {
  const controller = new AbortController();

  const abort = () => {
    controller.abort();
  };

  if (externalSignal) {
    if (externalSignal.aborted) {
      abort();
    } else {
      externalSignal.addEventListener('abort', abort, { once: true });
    }
  }

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  return {
    signal: controller.signal,
    cleanup: () => {
      clearTimeout(timeoutId);
      externalSignal?.removeEventListener('abort', abort);
    },
  };
}
