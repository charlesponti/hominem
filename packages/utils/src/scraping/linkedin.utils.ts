interface LinkedinJobUrlInfo {
  isJobPosting: boolean
  query?: string
}

export function parseLinkedinJobUrl(url: string): LinkedinJobUrlInfo {
  let query: string | undefined
  const isSingleJobPostingURL = url.indexOf('linkedin') !== -1 && url.indexOf('jobs/view') !== -1
  const isCollections = /linkedin.com\/jobs\/collections\/similar-jobs\/\?currentJobId=\d+/
  const isJobPosting = isCollections.test(url) || isSingleJobPostingURL

  if (isCollections.test(url)) {
    query = '[class*=job-details]'
  } else if (isSingleJobPostingURL) {
    query = '[class*=job-description]'
  } else {
    query = undefined
  }

  return { isJobPosting, query }
}
