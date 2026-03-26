import { afterEach, describe, expect, it } from 'vitest'

import { getTelemetryConfig } from './index'

describe('getTelemetryConfig', () => {
  afterEach(() => {
    delete process.env.OTEL_RESOURCE_ATTRIBUTES
    delete process.env.OTEL_SERVICE_NAME
  })

  it('merges env resource attributes with explicit attributes', () => {
    process.env.OTEL_RESOURCE_ATTRIBUTES = 'region=sjc,deployment=fly'

    expect(
      getTelemetryConfig({
        attributes: {
          service_tier: 'prod',
        },
        serviceName: 'hominem-api',
      }).attributes
    ).toEqual({
      deployment: 'fly',
      region: 'sjc',
      service_tier: 'prod',
    })
  })
})
