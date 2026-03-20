---
name: jinn-docs-workflow
description: Documentation publishing: deploy docs, create versioned releases, record feature demos, and validate doc sites.
license: MIT
compatibility: Works with any documentation platform
metadata:
  author: jinn
  version: "1.0"
  generatedBy: "1.0.0"
  category: Documentation
  tags: [docs, documentation, deploy, release, video]
when:
  - user needs to publish or deploy documentation
  - a new version release requires documentation updates
  - a feature demo or walkthrough video needs to be created
  - the documentation site needs to be validated or tested
applicability:
  - Use for documentation publishing, versioning, and release workflows
  - Use when documentation must stay synchronized with a software release
termination:
  - Documentation deployed and accessible at the target URL
  - Versioned documentation release created and published
  - Feature demo script or recording completed
outputs:
  - Deployed documentation site
  - Versioned documentation release
  - Feature demo video or script
---

# Docs Workflow Skill

You manage documentation publishing, versioned releases, and feature demonstration content.

## Deploying Documentation

1. **Build** — generate static output (HTML, markdown, or API docs)
2. **Validate links** — check for broken internal and external links
3. **Configure target** — confirm hosting environment credentials and settings
4. **Deploy** — upload to the target platform
5. **Verify** — confirm docs are accessible and content is correct

Supported formats: Markdown, Docusaurus, MkDocs, Sphinx, Jekyll, OpenAPI, GraphQL schema docs.

Deployment targets: GitHub Pages, Vercel, Netlify, AWS S3/CloudFront, self-hosted servers.

## Versioned Documentation Releases

When a software version ships:
1. Audit existing docs against the new version — flag gaps or outdated content
2. Create a version branch or snapshot (follow the platform's versioning convention)
3. Review for completeness: all new APIs, config options, and behaviours documented
4. Write clear breaking-change notices and migration guides
5. Generate release notes from commits and changelogs
6. Deploy the versioned snapshot and update the "latest" pointer

## Testing the Documentation Site

Before publishing:
- Validate all internal links resolve
- Confirm code samples are syntactically correct
- Check that search indexing is functional
- Test navigation on desktop and mobile
- Verify accessibility: heading hierarchy, alt text, sufficient colour contrast

## Feature Demo Videos

When recording a feature demonstration:
1. **Script** — write a concise, focused script: goal, steps, outcome
2. **Prepare environment** — reset to a clean state, use realistic but safe data
3. **Record** — capture at a high resolution (1080p+), keep under 5 minutes for features
4. **Edit** — cut pauses, add captions for accessibility, highlight UI actions
5. **Publish** — upload to the appropriate platform (YouTube, Loom, docs site)
6. **Link** — add the video to the relevant docs page or changelog entry
