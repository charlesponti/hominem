const { withXcodeProject, withDangerousMod } = require('expo/config-plugins')
const fs = require('fs')
const path = require('path')

/**
 * Creates ios/<ProjectName>/AppIntents/ source files and registers them in
 * the main app Xcode target's Compile Sources build phase.
 *
 * ios/ is gitignored in Expo managed workflow, so the Swift/ObjC sources are
 * generated here during every prebuild (--clean safe).
 *
 * Uses modRequest.projectName so the plugin works across all variants:
 *   dev        → HakumiDev
 *   preview    → HakumiPreview
 *   production → Hakumi
 */

// ---------------------------------------------------------------------------
// Swift source – App Intents + Siri shortcuts + NativeModules bridge
// ---------------------------------------------------------------------------
const SWIFT_SOURCE = `import AppIntents
import UIKit

// MARK: - Add Note Intent

@available(iOS 16.0, *)
struct AddNoteIntent: AppIntent {
    static let title: LocalizedStringResource = "Add a Note"
    static let description = IntentDescription("Opens Hakumi to create a new note.")
    static let openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        await UIApplication.shared.open(URL(string: "hakumi://note/add")!)
        return .result()
    }
}

// MARK: - Start Chat Intent

@available(iOS 16.0, *)
struct StartChatIntent: AppIntent {
    static let title: LocalizedStringResource = "Start a Chat"
    static let description = IntentDescription("Opens Hakumi's chat assistant.")
    static let openAppWhenRun: Bool = true

    func perform() async throws -> some IntentResult {
        await UIApplication.shared.open(URL(string: "hakumi://chat")!)
        return .result()
    }
}

// MARK: - Siri Shortcuts Provider

@available(iOS 16.4, *)
struct HakumiShortcutsProvider: AppShortcutsProvider {
    static var appShortcuts: [AppShortcut] {
        AppShortcut(
            intent: AddNoteIntent(),
            phrases: ["Add a note in \\(.applicationName)", "New note in \\(.applicationName)"],
            shortTitle: "Add Note",
            systemImageName: "square.and.pencil"
        )
        AppShortcut(
            intent: StartChatIntent(),
            phrases: ["Chat in \\(.applicationName)", "Open chat in \\(.applicationName)"],
            shortTitle: "Start Chat",
            systemImageName: "bubble.left.and.bubble.right"
        )
    }
}

// MARK: - React Native NativeModules bridge

@objc(HakumiIntents)
class HakumiIntentsModule: NSObject {
    @objc func donate(_ intentName: String) {
        guard #available(iOS 16.0, *) else { return }
        Task {
            switch intentName {
            case "AddNoteIntent":
                await AddNoteIntent.donate(AddNoteIntent())
            case "StartChatIntent":
                await StartChatIntent.donate(StartChatIntent())
            default:
                break
            }
        }
    }

    @objc static func requiresMainQueueSetup() -> Bool { false }
}
`

// ---------------------------------------------------------------------------
// ObjC bridge – required for React Native to find the NativeModule
// ---------------------------------------------------------------------------
const OBJC_BRIDGE_SOURCE = `#import <React/RCTBridgeModule.h>

RCT_EXTERN_MODULE(HakumiIntents, NSObject)
RCT_EXTERN_METHOD(donate:(NSString *)intentName)
`

// ---------------------------------------------------------------------------
// Step 1: write source files into ios/<targetName>/AppIntents/
// ---------------------------------------------------------------------------
function withAppIntentsFiles(config) {
  return withDangerousMod(config, [
    'ios',
    (modConfig) => {
      const targetName = modConfig.modRequest.projectName
      const appIntentsDir = path.join(
        modConfig.modRequest.platformProjectRoot,
        targetName,
        'AppIntents',
      )

      fs.mkdirSync(appIntentsDir, { recursive: true })
      fs.writeFileSync(path.join(appIntentsDir, 'HakumiAppIntents.swift'), SWIFT_SOURCE, 'utf-8')
      fs.writeFileSync(path.join(appIntentsDir, 'HakumiIntents.m'), OBJC_BRIDGE_SOURCE, 'utf-8')

      return modConfig
    },
  ])
}

// ---------------------------------------------------------------------------
// Step 2: register the files in the Xcode project's Compile Sources phase
// ---------------------------------------------------------------------------
function withAppIntentsXcode(config) {
  return withXcodeProject(config, (modConfig) => {
    const project = modConfig.modResults
    const targetName = modConfig.modRequest.projectName

    // Path relative to ios/
    const swiftFile = `${targetName}/AppIntents/HakumiAppIntents.swift`
    const bridgeFile = `${targetName}/AppIntents/HakumiIntents.m`

    // Find the native target key
    const nativeTargets = project.pbxNativeTargetSection()
    const targetKey = Object.keys(nativeTargets).find(
      (key) => !key.endsWith('_comment') && nativeTargets[key].name === targetName,
    )

    if (!targetKey) {
      throw new Error(
        `[with-app-intents] Could not find Xcode target "${targetName}". ` +
          'Ensure the app name in app.config.ts matches the Xcode project name.',
      )
    }

    const sources = project.pbxSourcesBuildPhaseObj(targetKey)

    function isAlreadyAdded(filename) {
      return sources?.files?.some((f) => {
        const ref = project.pbxFileReferenceSection()[f.value]
        return ref?.path?.includes(filename)
      })
    }

    // Find the PBX group UUID for the target's main group (e.g. "HakumiDev").
    // addSourceFile requires the group UUID (not its display name) when a group
    // is provided; passing null triggers addPluginFile which crashes when there
    // is no "Plugins" group (standard in Expo projects).
    const groups = project.hash.project.objects['PBXGroup']
    let targetGroupKey = null
    for (const key of Object.keys(groups)) {
      if (key.endsWith('_comment') && groups[key] === targetName) {
        targetGroupKey = key.replace(/_comment$/, '')
        break
      }
    }

    if (!isAlreadyAdded('HakumiAppIntents.swift')) {
      project.addSourceFile(swiftFile, { target: targetKey }, targetGroupKey)
    }

    if (!isAlreadyAdded('HakumiIntents.m')) {
      project.addSourceFile(bridgeFile, { target: targetKey }, targetGroupKey)
    }

    return modConfig
  })
}

// ---------------------------------------------------------------------------
// Compose: files must exist on disk before Xcode project is modified
// ---------------------------------------------------------------------------
module.exports = function withAppIntents(config) {
  config = withAppIntentsFiles(config)
  config = withAppIntentsXcode(config)
  return config
}
