import { describe, expect, test } from 'vitest'
import { parseLinkedinJobUrl } from './linkedin.utils'

describe('linkedin.utils', () => {
  test('parseLinkedinJobUrl', () => {
    expect(parseLinkedinJobUrl('https://www.linkedin.com/jobs/view/1234').isJobPosting).toBe(true)
    expect(parseLinkedinJobUrl('https://www.linkedin.com/jobs/1234').isJobPosting).toBe(false)
    expect(parseLinkedinJobUrl('https://www.linkedin.com/jobs/view/').isJobPosting).toBe(true)
    expect(parseLinkedinJobUrl('https://www.linkedin.com/jobs/view').isJobPosting).toBe(true)
    expect(parseLinkedinJobUrl('https://www.linkedin.com/jobs/').isJobPosting).toBe(false)
    expect(parseLinkedinJobUrl('https://www.linkedin.com/jobs').isJobPosting).toBe(false)
    expect(parseLinkedinJobUrl('https://www.linkedin.com').isJobPosting).toBe(false)
    expect(parseLinkedinJobUrl('https://www.linkedin.com/').isJobPosting).toBe(false)
    expect(parseLinkedinJobUrl('linkedin.com/jobs/view/1234').isJobPosting).toBe(true)
    expect(parseLinkedinJobUrl('linkedin.com/jobs/1234').isJobPosting).toBe(false)
    expect(parseLinkedinJobUrl('linkedin.com/jobs/view/').isJobPosting).toBe(true)
    expect(parseLinkedinJobUrl('linkedin.com/jobs/view').isJobPosting).toBe(true)
    expect(parseLinkedinJobUrl('linkedin.com/jobs/').isJobPosting).toBe(false)
    expect(parseLinkedinJobUrl('linkedin.com/jobs').isJobPosting).toBe(false)
    expect(parseLinkedinJobUrl('linkedin.com').isJobPosting).toBe(false)
    expect(parseLinkedinJobUrl('linkedin.com/').isJobPosting).toBe(false)
  })
})
