---
generated: true
version: "1.0.0"
---

# Skills Index

This file is auto-generated. Agents can read it at session start
to discover available skills and route user goals without slash commands.

## kernel-conventions

**Description**: Use when defining, reviewing, or documenting the standards that govern how a project is built and maintained.
**When**: establishing conventions on a new project; reviewing whether existing conventions are being followed; documenting standards for a project that doesn't have them yet; onboarding contributors who need to know how the project operates
**Applicability**: Use when a project lacks documented or enforced conventions; Use when reviewing a codebase for convention drift
**Outputs**: Documented project conventions, CI enforcement configuration, List of gaps requiring decisions
**Done when**: Conventions documented in the appropriate files (README.md, CONTRIBUTING.md, inline reference docs); Automated enforcement configured in CI where possible; Open convention gaps identified for human decision

## kernel-git-master

**Description**: Advanced git workflows, branch management, and collaboration patterns
**When**: user asks about branching, merging, or rebasing; there are merge conflicts to resolve; user wants to clean up commit history before a PR; user needs help with git collaboration workflows
**Applicability**: Use when working with git history, branches, or remote repositories; Use for commit hygiene, rebase workflows, and conflict resolution
**Outputs**: Git commands and workflow guidance, Branch strategy or commit message recommendations
**Done when**: Git operation described and commands provided; Conflict resolved or branch strategy defined

## kernel-propose

**Description**: Use when turning a change request into a Linear project with seeded issues and sub-issues.
**When**: user wants to plan new work or a new feature; user describes a change request or product idea; a new project or initiative needs to be structured
**Applicability**: Use when turning a vague change request into structured Linear work; Use when a project or initiative needs a proposal with seeded issues
**Outputs**: Linear project, Linear issues and sub-issues
**Done when**: Linear project created with a description and design context; Top-level Linear issues seeded for each workstream; Sub-issues created for immediately actionable tasks
**Depends on**: kernel-explore

## kernel-explore

**Description**: Use when exploring tradeoffs, risks, or missing context inside an existing Linear project or issue.
**When**: user wants to investigate tradeoffs or risks before implementing; there is missing context or open decisions in a Linear issue or project; user needs to explore options without committing to implementation
**Applicability**: Use when exploring tradeoffs, risks, or dependencies in existing Linear work; Use before implementation when context or direction is unclear
**Outputs**: Updated Linear issue or project description with decisions, Risk and tradeoff analysis
**Done when**: Options, risks, and open decisions documented in Linear; Recommendation or decision written back to the Linear issue or project

## kernel-apply

**Description**: Use when executing implementation work from Linear issues and sub-issues.
**When**: user wants to implement work from a Linear issue or sub-issue; there is an unblocked Linear task ready for implementation; user says "work on", "implement", "build", or "start" a Linear issue
**Applicability**: Use when executing implementation tasks tracked in Linear; Use when the plan is clear and the next unblocked issue is ready
**Outputs**: Implemented code changes, Updated Linear issue statuses
**Done when**: All sub-issues in scope are implemented and verified; Linear issue status updated to reflect completion or blockers
**Depends on**: kernel-explore, kernel-propose

## kernel-check

**Description**: Use mid-execution to report current state: what's done, what's in progress, what's blocked, and what happens next. Surfaces blockers and recommends the next action.
**When**: the user asks for a status update mid-execution; a milestone has been reached and work should be assessed before continuing; something feels off and the health of current work needs to be assessed
**Applicability**: Use during active task execution to surface the current state; Use to identify blockers before they stall progress
**Outputs**: Status report (on track | at risk | blocked)
**Done when**: Status report delivered with clear recommendation; All blockers are named with a recommended resolution; Next action is unambiguous

## kernel-review

**Description**: Use after a deliverable is complete to assess whether work is ready to move forward. Evaluates correctness, completeness, quality, security, performance, and standards. Produces an approve / approve-with-changes / needs-rework recommendation.
**When**: a deliverable is complete and ready for sign-off; a milestone has been reached and work should be reviewed before continuing; before handing off, deploying, or merging; after an implementation workflow completes a set of sub-issues
**Applicability**: Use to formally assess whether completed work meets its acceptance criteria; Use to surface must-fix issues before the work moves downstream
**Outputs**: Review report with recommendation, Prioritised findings list, Updated Linear issue status (Done or back to In Progress) via mcp_linear_save_issue
**Done when**: All evaluation dimensions covered; Findings prioritised as must-fix, should-fix, or consider; Clear recommendation delivered: approve | approve with changes | needs rework

## kernel-sync

**Description**: Use when Linear state has drifted from reality — stale In Progress issues, work completed without updates, or issues missing from the board. Reconciles Linear with what actually happened.
**When**: Linear issues are stuck in "In Progress" with no recent activity; work was completed without updating Linear; the board state does not match the codebase; before starting a new implementation session
**Applicability**: Use when Linear state has drifted from the actual state of the codebase; Use to audit and reconcile stale, missing, or mis-classified issues
**Outputs**: Updated Linear issue statuses, Back-filled issues for undocumented work, Sync summary report
**Done when**: All In Progress issues classified and transitioned correctly; Undocumented work back-filled in Linear; Sync report delivered
