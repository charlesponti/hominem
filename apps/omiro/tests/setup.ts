process.env.EXPO_PUBLIC_API_BASE_URL ??= 'http://localhost:4040';

Object.defineProperty(globalThis, '__DEV__', { configurable: true, value: false });
Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
