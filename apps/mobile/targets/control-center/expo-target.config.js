/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = (config) => ({
  type: 'widget',
  name: 'ControlCenter',
  deploymentTarget: '18.0',
  // Appended to the main app bundle ID: com.pontistudios.hakumi.ControlCenter
  bundleIdentifier: '.ControlCenter',
  entitlements: {
    'com.apple.security.application-groups':
      config.ios?.entitlements?.['com.apple.security.application-groups'] ?? [],
  },
})
