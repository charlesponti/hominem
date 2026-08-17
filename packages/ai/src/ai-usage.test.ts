import { describe, expect, it } from 'vitest';

import { getAIUsageFailureDetails } from './ai-usage';

describe('getAIUsageFailureDetails', () => {
  it('keeps only sanitized provider code and HTTP status', () => {
    expect(
      getAIUsageFailureDetails({
        code: 'quota exceeded/private prompt',
        status: 429,
        message: 'secret prompt content',
      }),
    ).toEqual({
      errorCode: 'quota_exceeded_private_prompt',
      errorStatus: 429,
    });
  });

  it('omits invalid failure metadata', () => {
    expect(getAIUsageFailureDetails({ code: { secret: true }, status: 700 })).toEqual({
      errorCode: null,
      errorStatus: null,
    });
  });
});
