// Only one composer can be the target of an enhance action at a time (the
// wand button only exists on the composer currently on screen), so a single
// module-level slot -- set right before navigating to the enhance sheet --
// is enough to hand the sheet route a reference to that composer's draft
// without threading it through router params or a context above the stack.
export interface ActiveEnhanceSession {
  getMessage: () => string;
  setMessage: (message: string) => void;
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
