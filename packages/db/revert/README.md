# Revert Scripts

Each file in this directory reverts one Sqitch change when a revert is worth supporting in development or controlled rollout workflows.

Rules:

- keep reverts narrow
- do not depend on live production rollback as the default strategy
- prefer expand-and-contract for risky changes
