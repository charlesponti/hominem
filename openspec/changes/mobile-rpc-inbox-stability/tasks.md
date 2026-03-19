## 1. Reproduce and isolate

- [ ] 1.1 Trace the exact mobile inbox startup RPC calls and identify the failing route(s)
- [ ] 1.2 Reproduce the failing route(s) directly against the local API server

## 2. Fix runtime failures

- [ ] 2.1 Fix the server-side or contract issue causing `internal_error` during mobile inbox startup
- [ ] 2.2 Fix any mobile client assumptions that amplify transient network failures during inbox load

## 3. Verify stability

- [ ] 3.1 Add or update targeted tests for the failing inbox/chat startup path
- [ ] 3.2 Verify the mobile inbox loads without repeated runtime RPC errors in the reproduced scenario
