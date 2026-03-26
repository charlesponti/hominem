# Deploy Scripts

Each file in this directory applies one Sqitch change.

Rules:

- plain PostgreSQL SQL only
- one bounded concern per file
- idempotence is not the goal; correctness through ordered changes is
- do not place dump snapshots here
