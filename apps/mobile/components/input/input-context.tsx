import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import type { MobileWorkspaceContext } from '../workspace/mobile-workspace-config';
import {
  createInitialMobileComposerState,
  setMobileComposerAttachments,
  setMobileComposerContext,
  setMobileComposerMode,
  setMobileComposerRecording,
  setMobileComposerText,
  type MobileComposerAttachment,
  type MobileComposerMode,
} from './mobile-composer-state';

type InputContextValue = {
  message: string;
  setMessage: (value: string) => void;
  attachments: MobileComposerAttachment[];
  setAttachments: (
    value:
      | MobileComposerAttachment[]
      | ((currentValue: MobileComposerAttachment[]) => MobileComposerAttachment[]),
  ) => void;
  isRecording: boolean;
  setIsRecording: (value: boolean) => void;
  mode: MobileComposerMode;
  setMode: (value: MobileComposerMode) => void;
  context: MobileWorkspaceContext;
  setContext: (value: MobileWorkspaceContext) => void;
};

const InputContext = createContext<InputContextValue | null>(null);

export const useInputContext = () => {
  const ctx = useContext(InputContext);
  if (!ctx) throw new Error('useInputContext must be used within an InputProvider');
  return ctx;
};

export const InputProvider = ({ children }: PropsWithChildren) => {
  const [state, setState] = useState(createInitialMobileComposerState);

  const setMessage = useCallback((value: string) => {
    setState((currentState) => setMobileComposerText(currentState, value));
  }, []);

  const setAttachments = useCallback(
    (
      value:
        | MobileComposerAttachment[]
        | ((currentValue: MobileComposerAttachment[]) => MobileComposerAttachment[]),
    ) => {
      setState((currentState) => {
        const nextAttachments =
          typeof value === 'function' ? value(currentState.attachments) : value;

        return setMobileComposerAttachments(currentState, nextAttachments);
      });
    },
    [],
  );

  const setIsRecording = useCallback((value: boolean) => {
    setState((currentState) => setMobileComposerRecording(currentState, value));
  }, []);

  const setMode = useCallback((value: MobileComposerMode) => {
    setState((currentState) => setMobileComposerMode(currentState, value));
  }, []);

  const setContext = useCallback((value: MobileWorkspaceContext) => {
    setState((currentState) => setMobileComposerContext(currentState, value));
  }, []);

  const value = useMemo(
    () => ({
      message: state.text,
      setMessage,
      attachments: state.attachments,
      setAttachments,
      isRecording: state.isRecording,
      setIsRecording,
      mode: state.mode,
      setMode,
      context: state.context,
      setContext,
    }),
    [setAttachments, setContext, setIsRecording, setMessage, setMode, state],
  );

  return <InputContext.Provider value={value}>{children}</InputContext.Provider>;
};
