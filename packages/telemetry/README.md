# @hominem/telemetry

Shared logging primitives for Hominem services and apps.

```typescript
import { logger, LOG_MESSAGES } from '@hominem/telemetry';

logger.warn(LOG_MESSAGES.LOCAL_STORE_VALIDATION_FAILED, {
  error,
});
```

## Exports

- `@hominem/telemetry` - `logger`, `LOG_MESSAGES`, and `LogMessage`
