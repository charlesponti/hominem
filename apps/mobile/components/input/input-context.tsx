import React, { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

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
import type { MobileWorkspaceContext } from '../workspace/mobile-workspace-config';

type InputContextValue = {
  message: string;
  setMessage: (value: string) => void;
  attachments: MobileComposerAttachment[];
  setAttachments: (value: MobileComposerAttachment[]) => void;
  isRecording: boolean;
  setIsRecording: (value: boolean) => void;
  mode: MobileComposerMode;
  setMode: (value: MobileComposerMode) => void;
  context: MobileWorkspaceContext;
  setContext: (value: MobileWorkspaceContext) => void;
  submitAction: (() => void) | null;
  setSubmitAction: (value: (() => void) | null) => void;
};

const InputContext = createContext<InputContextValue | null>(null);

export const useInputContext = () => {
  const ctx = useContext(InputContext);
  if (!ctx) throw new Error('useInputContext must be used within an InputProvider');
  return ctx;
};

export const InputProvider = ({ children }: PropsWithChildren) => {
  const [state, setState] = useState(createInitialMobileComposerState);
  const [submitAction, setSubmitAction] = useState<(() => void) | null>(null);

  const setMessage = (value: string) => {
    setState((currentState) => setMobileComposerText(currentState, value));
  };

  const setAttachments = (value: MobileComposerAttachment[]) => {
    setState((currentState) => setMobileComposerAttachments(currentState, value));
  };

  const setIsRecording = (value: boolean) => {
    setState((currentState) => setMobileComposerRecording(currentState, value));
  };

  const setMode = (value: MobileComposerMode) => {
    setState((currentState) => setMobileComposerMode(currentState, value));
  };

  const setContext = (value: MobileWorkspaceContext) => {
    setState((currentState) => setMobileComposerContext(currentState, value));
  };

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
      submitAction,
      setSubmitAction,
    }),
    [state, submitAction],
  );

  return <InputContext.Provider value={value}>{children}</InputContext.Provider>;
};
