import { describe, expect, it } from 'vitest';

import { JobApplicationStatus } from '~/types/career';

import {
  ApplicationFormError,
  formatCentsInput,
  formatDateInput,
  parseApplicationUpdateFormData,
} from '../applicationForm';

function form(entries: Record<string, string>): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(entries)) {
    formData.set(key, value);
  }
  return formData;
}

describe('parseApplicationUpdateFormData', () => {
  it('maps core application fields and empties nullable strings to null', () => {
    const result = parseApplicationUpdateFormData(
      form({
        title: '  Staff Engineer  ',
        status: JobApplicationStatus.SCREENING,
        location: '',
        source: '  LinkedIn  ',
      }),
    );

    expect(result.application).toMatchObject({
      title: 'Staff Engineer',
      status: JobApplicationStatus.SCREENING,
      location: null,
      source: 'LinkedIn',
    });
  });

  it('converts dollar amounts to cents', () => {
    const result = parseApplicationUpdateFormData(
      form({
        salaryExpectation: '150000',
      }),
    );

    expect(result.application.salaryExpectation).toBe(15_000_000);
  });

  it('parses appliedAt date', () => {
    const result = parseApplicationUpdateFormData(
      form({
        appliedAt: '2024-03-15',
      }),
    );

    expect(result.application.appliedAt).toEqual(new Date('2024-03-15'));
  });

  it('rejects invalid status', () => {
    expect(() =>
      parseApplicationUpdateFormData(form({ status: 'NOPE', title: 'Engineer' })),
    ).toThrow(ApplicationFormError);
  });

  it('rejects invalid cents amounts', () => {
    expect(() => parseApplicationUpdateFormData(form({ salaryExpectation: 'abc' }))).toThrow(
      ApplicationFormError,
    );
  });

  it('rejects empty form data', () => {
    expect(() => parseApplicationUpdateFormData(form({}))).toThrow(ApplicationFormError);
  });
});

describe('format helpers', () => {
  it('formatCentsInput converts cents to dollar string', () => {
    expect(formatCentsInput(15_000_000)).toBe('150000');
    expect(formatCentsInput(null)).toBe('');
  });

  it('formatDateInput formats ISO dates', () => {
    expect(formatDateInput('2024-03-15T00:00:00.000Z')).toBe('2024-03-15');
    expect(formatDateInput(null)).toBe('');
  });
});
