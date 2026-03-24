const { withDangerousMod } = require('expo/config-plugins')
const fs = require('fs')
const path = require('path')

/**
 * Patches ios/LiveActivity/LiveActivityWidgetBundle.swift to include
 * QuickActionsWidget after expo-live-activity regenerates the file
 * during prebuild.
 */
module.exports = function withWidgetBundleUpdate(config) {
  return withDangerousMod(config, [
    'ios',
    (modConfig) => {
      const bundlePath = path.join(
        modConfig.modRequest.platformProjectRoot,
        'LiveActivity',
        'LiveActivityWidgetBundle.swift',
      )

      if (!fs.existsSync(bundlePath)) {
        console.warn('[with-widget-bundle-update] LiveActivityWidgetBundle.swift not found – skipping')
        return modConfig
      }

      const original = fs.readFileSync(bundlePath, 'utf-8')

      if (original.includes('QuickActionsWidget')) {
        // Already patched
        return modConfig
      }

      const patched = original
        // Add AppIntents import alongside existing imports
        .replace(
          /^import SwiftUI$/m,
          'import AppIntents\nimport SwiftUI',
        )
        // Add QuickActionsWidget to the bundle body
        .replace(
          /(\s+LiveActivityWidget\(\))/,
          '$1\n    QuickActionsWidget()',
        )

      if (patched === original) {
        throw new Error(
          '[with-widget-bundle-update] Could not patch LiveActivityWidgetBundle.swift. ' +
            'The file format may have changed. Please update the plugin.',
        )
      }

      fs.writeFileSync(bundlePath, patched, 'utf-8')
      return modConfig
    },
  ])
}
