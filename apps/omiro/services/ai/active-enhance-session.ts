// Only one composer can be the target of an enhance action at a time (the
// wand button only exists on whatever composer's currently on screen), so a
// single module-level slot -- set right before navigating to the enhance
// sheet -- is enough to hand the sheet route a read/write handle on that
// composer's draft, no need to thread it through router params or a context
// above the stack. The sheet owns the enhance request itself (see
// enhance-sheet.tsx) and only calls setMessage once, when the user accepts
// a result.
export interface ActiveEnhanceSession {
  getMessage: () => string;
  setMessage: (text: string) => void;
}

let activeSession: ActiveEnhanceSession | null = null;

export function setActiveEnhanceSession(session: ActiveEnhanceSession) {
  activeSession = session;
}

export function consumeActiveEnhanceSession(): ActiveEnhanceSession {
  if (!activeSession) {
    throw new Error('Enhance sheet opened without an active composer session');
  }
  return activeSession;
}
