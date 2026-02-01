---
name: ready-for-prod
description: Performs a comprehensive pre-deployment check by running type audits, security scans, and simplicity reviews in parallel. Use this before merging a PR or deploying to production.
---

# Ready for Production Audit

## Overview

This skill orchestrates a suite of specialized agents to ensure code meets the highest standards for performance, security, and maintainability. It is designed to be run as a final "quality gate" before deployment.

## Workflow

### 1. Execute Multi-Agent Audit (Parallel)

To perform the audit, launch the following tasks **in parallel** using the `Task` tool:

- **Type Performance**: Use the `general` agent with the prompt `/type-audit` to run the monorepo's diagnostic performance scripts.
- **Security Audit**: Use the `security-sentinel` agent to scan the current changes for vulnerabilities, hardcoded secrets, and OWASP compliance.
- **Simplicity Review**: Use the `code-simplicity-reviewer` agent to ensure the changes are as minimal as possible and avoid over-engineering.

### 2. Consolidate Results

Once all sub-agents have reported back:
1. Identify any **Blockers** (failed type budgets, high-severity security vulnerabilities, or extreme complexity).
2. Synthesize the findings into a clear "Go/No-Go" recommendation.
3. If issues are found, suggest a remediation plan based on the combined reports.

### 3. Report to User

Provide a summarized report with collapsible sections for the detailed output of each sub-agent.
