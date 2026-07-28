const fs = require('node:fs');
const path = require('node:path');

const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');

const PRIVACY_MANIFEST = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyAccessedAPITypes</key>
  <array>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryFileTimestamp</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array><string>C617.1</string></array>
    </dict>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategoryUserDefaults</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array><string>CA92.1</string></array>
    </dict>
    <dict>
      <key>NSPrivacyAccessedAPIType</key>
      <string>NSPrivacyAccessedAPICategorySystemBootTime</string>
      <key>NSPrivacyAccessedAPITypeReasons</key>
      <array><string>35F9.1</string></array>
    </dict>
  </array>
  <key>NSPrivacyCollectedDataTypes</key>
  <array/>
  <key>NSPrivacyTracking</key>
  <false/>
</dict>
</plist>
`;

module.exports = function withPrivacyManifest(config) {
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const manifestPath = path.join(
        config.modRequest.platformProjectRoot,
        'PrivacyInfo.xcprivacy',
      );
      fs.writeFileSync(manifestPath, PRIVACY_MANIFEST);
      return config;
    },
  ]);

  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const target = project.getFirstTarget().uuid;
    if (!project.hasFile('PrivacyInfo.xcprivacy')) {
      const mainGroup = project.getFirstProject().firstProject.mainGroup;
      const file = project.addFile('PrivacyInfo.xcprivacy', mainGroup, { target });
      file.uuid = project.generateUuid();
      file.target = target;
      project.addToPbxBuildFileSection(file);
      project.addToPbxResourcesBuildPhase(file);
    }
    return config;
  });
};
