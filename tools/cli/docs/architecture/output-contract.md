# ADR: Output and Error Contract

## Success Envelope
`{ ok: true, command, timestamp, data, message? }`

## Error Envelope
`{ ok: false, command, timestamp, code, category, message, details?, hint?, requestId? }`

## Exit Codes
- 0 success
- 2 usage
- 3 auth
- 4 validation
- 5 dependency/unavailable
- 10 internal

## Formats
- text
- json
- ndjson
