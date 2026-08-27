import { useEffect, useRef } from 'react';
import type { Location } from 'react-router';

import type { StreamInput, useStreamMessage } from '~/lib/hooks/use-stream-message';

type InitialAgentSendState = {
  initialAgentSend?: StreamInput;
};

export function useInitialAgentSend(
  location: Location,
  streamMessage: ReturnType<typeof useStreamMessage>,
) {
  const consumed = useRef(false);

  useEffect(() => {
    const initialAgentSend = (location.state as InitialAgentSendState | null)?.initialAgentSend;
    if (!initialAgentSend?.message || consumed.current) return;

    consumed.current = true;

    // Clear the state so that if the user navigates back to this page, we don't re-send the message.
    window.history.replaceState({}, '', window.location.href);

    // Send the initial agent message to the streamMessage hook.
    void streamMessage.stream(initialAgentSend);
  }, [location.state, streamMessage]);
}
