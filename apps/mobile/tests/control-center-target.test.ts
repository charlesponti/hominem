import { describe, expect, it } from 'vitest'

const controlCenterTargetConfig = require('../targets/control-center/expo-target.config.js') as (
  config: {
    ios?: {
      entitlements?: Record<string, string[]>
    }
  },
) => {
  type: string
  name: string
  deploymentTarget: string
  bundleIdentifier: string
}

describe('control center target config', () => {
  it('does not inherit app-group entitlements', () => {
    const config = controlCenterTargetConfig({
      ios: {
        entitlements: {
          'com.apple.security.application-groups': ['group.com.pontistudios.hakumi.preview'],
        },
      },
    })

    expect(config).toEqual({
      type: 'widget',
      name: 'ControlCenter',
      deploymentTarget: '18.0',
      bundleIdentifier: '.ControlCenter',
    })
  })
})