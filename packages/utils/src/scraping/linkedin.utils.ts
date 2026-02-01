interface LinkedinJobUrlInfo {
  isJobPosting: boolean;
  query?: string | undefined;
}

export function parseLinkedinJobUrl(url: string): LinkedinJobUrlInfo {
  let query: string | undefined;
  const isSingleJobPostingURL = url.indexOf('linkedin') !== -1 && url.indexOf('jobs/view') !== -1;
  // Avoid potentially vulnerable regex with safer string operations
  const isCollections =
    url.includes('linkedin.com/jobs/collections/') && url.includes('currentJobId=');
  const isJobPosting = isCollections || isSingleJobPostingURL;

  if (isCollections) {
    query = '[class*=job-details]';
  } else if (isSingleJobPostingURL) {
    query = '[class*=job-description]';
  } else {
    query = undefined;
  }

  return { isJobPosting, query };
}
