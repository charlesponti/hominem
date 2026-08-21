#!/usr/bin/env node
// Regenerates the checked-in career-job-import HTML fixture from the live
// Ashby posting. The static page is a client-rendered SPA (its <body> is
// empty until JS runs), so the description has to come from Ashby's public
// GraphQL API rather than a plain page fetch — this stitches both together
// into a realistic static fixture.
import { writeFileSync } from 'node:fs';

const [, , org, postingId, outputPath] = process.argv;
if (!org || !postingId || !outputPath) {
  console.error('usage: refresh-job-import-fixture.mjs <org> <postingId> <outputPath>');
  process.exit(1);
}

const shellRes = await fetch(`https://jobs.ashbyhq.com/${org}/${postingId}`, {
  headers: { 'user-agent': 'PontiCareerBenchmark/1.0' },
});
if (!shellRes.ok) throw new Error(`page fetch failed: ${shellRes.status}`);
const shell = await shellRes.text();

const apiRes = await fetch('https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobPosting', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({
    operationName: 'ApiJobPosting',
    variables: { organizationHostedJobsPageName: org, jobPostingId: postingId },
    query:
      'query ApiJobPosting($organizationHostedJobsPageName: String!, $jobPostingId: String!) { jobPosting(organizationHostedJobsPageName: $organizationHostedJobsPageName, jobPostingId: $jobPostingId) { id title descriptionHtml departmentName employmentType locationName } }',
  }),
});
if (!apiRes.ok) throw new Error(`GraphQL fetch failed: ${apiRes.status}`);
const { data, errors } = await apiRes.json();
if (errors?.length) throw new Error(errors.map((e) => e.message).join('; '));

const jp = data.jobPosting;
if (!jp) throw new Error(`No job posting found for ${org}/${postingId}`);

const block = `
    <div id="ashby_embed_root">
      <h1>${jp.title} @ Whatnot</h1>
      <div class="job-meta">
        <span class="location">${jp.locationName ?? ''}</span>
        <span class="employment-type">${jp.employmentType ?? ''}</span>
        <span class="department">${jp.departmentName ?? ''}</span>
      </div>
      <div class="job-description">
        ${jp.descriptionHtml}
      </div>
    </div>
`;

const merged = shell.replace('<body>', `<body>${block}`);
writeFileSync(outputPath, merged);
console.log(`Wrote ${outputPath} (${merged.length} bytes)`);
