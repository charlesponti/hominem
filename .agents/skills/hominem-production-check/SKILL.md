---
name: hominem-production-check
description: Check the health of Hominem’s production Railway services and public domains without mutating infrastructure. Use for production smoke checks, outage triage, or release verification.
---

# Hominem Production Check

Run this as a read-only check. Do not change variables, deployments, domains, service configuration, or source code.

From the Hominem repository, run:

```bash
.agents/skills/hominem-production-check/scripts/check-production.sh
```

The script resolves the linked Railway project and production environment unless `--project` and `--environment` are supplied. It reports every production service’s latest deployment and replica state, then probes each public domain with redirects disabled.

Expected public behavior:

- `api.ponti.io`, `career.ponti.io`, `labs.ponti.io`, and `ponti.io`: HTTP `200`.
- `omiro.ponti.io`: HTTP `302` with a `Location` beginning `https://api.ponti.io/login?`.
- `what.ponti.io`: HTTP `302` with `Location: /reality`.

Treat a `SUCCESS` deployment with a `RUNNING` instance as healthy. A redirect is not an outage when it matches the expected behavior above. Any unexpected status, malformed `Location`, missing domain response, failed deployment, or non-running instance is a failure requiring investigation.

Include the timestamp, project/environment, failed services or domains, and exact observed status/location in the report. This skill does not authorize remediation; ask separately before making production changes.
