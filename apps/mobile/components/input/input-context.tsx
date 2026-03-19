import React, { createContext, useContext, useMemo, useState, type PropsWithChildren } from 'react';

import {
  createInitialMobileHyperFormState,
  setMobileHyperFormAttachments,
  setMobileHyperFormContext,
  setMobileHyperFormMode,
  setMobileHyperFormRecording,
  setMobileHyperFormText,
  type MobileHyperFormAttachment,
  type MobileHyperFormMode,
} from './mobile-hyper-form-state';
import type { MobileWorkspaceContext } from '../workspace/mobile-workspace-config';

type InputContextValue = {
  message: string;
  setMessage: (value: string) => void;
  attachments: MobileHyperFormAttachment[];
  setAttachments: (value: MobileHyperFormAttachment[]) => void;
  isRecording: boolean;
  setIsRecording: (value: boolean) => void;
  mode: MobileHyperFormMode;
  setMode: (value: MobileHyperFormMode) => void;
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
  const [state, setState] = useState(createInitialMobileHyperFormState);
  const [submitAction, setSubmitAction] = useState<(() => void) | null>(null);

  const setMessage = (value: string) => {
    setState((currentState) => setMobileHyperFormText(currentState, value));
  };

  const setAttachments = (value: MobileHyperFormAttachment[]) => {
    setState((currentState) => setMobileHyperFormAttachments(currentState, value));
  };

  const setIsRecording = (value: boolean) => {
    setState((currentState) => setMobileHyperFormRecording(currentState, value));
  };

  const setMode = (value: MobileHyperFormMode) => {
    setState((currentState) => setMobileHyperFormMode(currentState, value));
  };

  const setContext = (value: MobileWorkspaceContext) => {
    setState((currentState) => setMobileHyperFormContext(currentState, value));
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
