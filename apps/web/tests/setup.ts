Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

HTMLMediaElement.prototype.play = () => Promise.resolve();
HTMLMediaElement.prototype.pause = () => undefined;
