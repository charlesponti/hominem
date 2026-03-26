/** @type {import('@bacons/apple-targets/app.plugin').ConfigFunction} */
module.exports = () => ({
  type: 'widget',
  name: 'ControlCenter',
  deploymentTarget: '18.0',
  // Appended to the main app bundle ID: com.pontistudios.hakumi.ControlCenter
  bundleIdentifier: '.ControlCenter',
})
