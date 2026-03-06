/** @type {import('detox').DetoxConfig} */
module.exports = {
  testRunner: {
    args: {
      $0: 'jest',
      config: 'e2e/jest.config.cjs'
    },
    jest: {
      setupTimeout: 180000
    }
  },
  apps: {
    'ios.e2e': {
      type: 'ios.app',
      binaryPath: 'ios/build/Build/Products/Release-iphonesimulator/hakumie2e.app',
      build:
        "bash scripts/run-variant.sh e2e xcodebuild -workspace ios/hakumie2e.xcworkspace -scheme hakumie2e -configuration Release -sdk iphonesimulator -destination 'platform=iOS Simulator,name=iPhone 17 Pro' -derivedDataPath ios/build"
    }
  },
  devices: {
    simulator: {
      type: 'ios.simulator',
      device: {
        type: 'iPhone 17 Pro'
      }
    }
  },
  configurations: {
    'ios.sim.e2e': {
      device: 'simulator',
      app: 'ios.e2e'
    }
  }
}
