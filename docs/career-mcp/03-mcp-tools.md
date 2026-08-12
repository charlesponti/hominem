---
type: task
id: CAREER-MCP-03
title: Register 22 career write MCP tools
status: ready
priority: high
team: api
project: career-mcp
labels:
  - mcp
  - career
estimate: M
assignee: unassigned
depends_on:
  - CAREER-MCP-01
  - CAREER-MCP-02
blocks:
  - CAREER-MCP-05
---

# Register 22 career write MCP tools

## Objective

Expose the full career CRUD surface through MCP tools in `mcp/tools/career.ts`, all delegating to the shared service functions.

## Files to update

- `services/api/src/mcp/tools/career.ts`

## Tools to register

All are `readOnly: false`, `scopes: ['career:write']`, `sensitivity: 'sensitive'`.

| Tool | Service call | Output |
| --- | --- | --- |
| `career_engagement_create` | `createCareerEngagement` | `{ engagement }` |
| `career_application_create` | `createCareerApplication` | `{ application }` |
| `career_application_update` | `updateCareerApplication` | `{ application: nullable }` |
| `career_application_delete` | `removeCareerApplication` | `{ removed: boolean }` |
| `career_application_note_add` | `addCareerApplicationNote` | `{ note }` (nullable) |
| `career_application_note_remove` | `removeCareerApplicationNote` | `{ removed: boolean }` |
| `career_application_file_add` | `addCareerApplicationFile` | `{ file }` (nullable) |
| `career_application_file_remove` | `removeCareerApplicationFile` | `{ removed: boolean }` |
| `career_education_create` | `createCareerEducation` | `{ education }` |
| `career_education_update` | `updateCareerEducation` | `{ education: nullable }` |
| `career_education_delete` | `removeCareerEducation` | `{ removed: boolean }` |
| `career_skill_create` | `createCareerSkill` | `{ skill }` |
| `career_skill_update` | `updateCareerSkill` | `{ skill: nullable }` |
| `career_skill_delete` | `removeCareerSkill` | `{ removed: boolean }` |
| `career_project_create` | `createCareerProject` | `{ project }` |
| `career_testimonial_create` | `createCareerTestimonial` | `{ testimonial }` |
| `career_testimonial_update` | `updateCareerTestimonial` | `{ testimonial: nullable }` |
| `career_testimonial_delete` | `removeCareerTestimonial` | `{ removed: boolean }` |
| `career_certification_create` | `createCareerCertification` | `{ certification }` |
| `career_certification_update` | `updateCareerCertification` | `{ certification: nullable }` |
| `career_certification_delete` | `removeCareerCertification` | `{ removed: boolean }` |
| `career_social_links_save` | `saveCareerSocialLinks` | `{ socialLinks }` |

## Acceptance criteria

- Each tool's `inputSchema`/`outputSchema` reference the shared schema objects from `career.schema.ts` — no per-tool schema redefinitions.
- Deletes return `{ removed: boolean }`; updates return a `.nullable()` entity; creates return the full entity.
- Existing read-only tools and the update/delete tools added earlier are unchanged.

## Validation

`pnpm --filter @hominem/api typecheck`, `pnpm --filter @hominem/api lint`, and the MCP tests from CAREER-MCP-05.
