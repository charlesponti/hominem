# External Service Error Handling

Use this pattern for third-party integrations such as Plaid, Google APIs, OpenAI, or webhooks.

## Rules

- Catch provider-specific failures at the route or integration boundary.
- Log the raw provider failure on the server with structured metadata.
- Translate the provider failure into a typed service error before returning to the client.
- Return direct JSON success bodies for successful calls.
- Never return raw SDK errors, stack traces, or provider response payloads to clients.

## Mapping

| Situation | Error Type |
| --- | --- |
| Temporary upstream outage, rate limit, timeout | `UnavailableError` |
| Unexpected provider failure or malformed upstream response | `InternalError` |
| Missing local auth/session context | `UnauthorizedError` |
| Missing local resource needed for provider action | `NotFoundError` |

## Example

```ts
try {
  const result = await providerClient.someOperation()
  return c.json({ value: result.data.value }, 200)
} catch (error) {
  logger.error('Provider operation failed', { error })
  throw new InternalError('Provider operation failed')
}
```
