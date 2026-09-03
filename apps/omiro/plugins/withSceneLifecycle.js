const fs = require('node:fs');
const path = require('node:path');

const { withInfoPlist, withDangerousMod, withXcodeProject, withAppDelegate } = require('expo/config-plugins');

// Xcode 26's UIKit SDK now traps at launch (EXC_BREAKPOINT in
// _UIApplicationEvaluateRuntimeIssueForNoSceneLifecycleAdoption) when an app
// hasn't adopted the UIScene lifecycle (see Apple TN3187). Expo's iOS
// template doesn't emit scene support yet (expo/expo#46663, #46664), so we
// add it ourselves: a UIApplicationSceneManifest entry plus a SceneDelegate
// that takes over window creation from AppDelegate.
const SCENE_DELEGATE_SOURCE = `import React
import UIKit

class SceneDelegate: UIResponder, UIWindowSceneDelegate {
  var window: UIWindow?

  func scene(_ scene: UIScene, willConnectTo session: UISceneSession, options connectionOptions: UIScene.ConnectionOptions) {
    guard let windowScene = scene as? UIWindowScene,
      let appDelegate = UIApplication.shared.delegate as? AppDelegate,
      let factory = appDelegate.reactNativeFactory
    else {
      return
    }

    let window = UIWindow(windowScene: windowScene)
    factory.startReactNative(withModuleName: "main", in: window, launchOptions: nil)

    self.window = window
    appDelegate.window = window
  }

  // Forwarded so existing deep-link / universal-link handling in AppDelegate keeps working.
  func scene(_ scene: UIScene, openURLContexts URLContexts: Set<UIOpenURLContext>) {
    guard let url = URLContexts.first?.url,
      let appDelegate = UIApplication.shared.delegate as? AppDelegate
    else {
      return
    }
    _ = appDelegate.application(UIApplication.shared, open: url, options: [:])
  }

  func scene(_ scene: UIScene, continue userActivity: NSUserActivity) {
    guard let appDelegate = UIApplication.shared.delegate as? AppDelegate else {
      return
    }
    _ = appDelegate.application(UIApplication.shared, continue: userActivity, restorationHandler: { _ in })
  }
}
`;

function withSceneManifestInfoPlist(config) {
  return withInfoPlist(config, (config) => {
    config.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          {
            UISceneConfigurationName: 'Default Configuration',
            UISceneDelegateClassName: '$(PRODUCT_MODULE_NAME).SceneDelegate',
          },
        ],
      },
    };
    return config;
  });
}

function withSceneDelegateSourceFile(config) {
  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const targetDir = path.join(config.modRequest.platformProjectRoot, config.modRequest.projectName);
      fs.writeFileSync(path.join(targetDir, 'SceneDelegate.swift'), SCENE_DELEGATE_SOURCE);
      return config;
    },
  ]);

  return withXcodeProject(config, (config) => {
    const project = config.modResults;
    const relativePath = `${config.modRequest.projectName}/SceneDelegate.swift`;
    if (!project.hasFile(relativePath)) {
      project.addSourceFile(
        relativePath,
        {},
        project.findPBXGroupKey({ name: config.modRequest.projectName }),
      );
    }
    return config;
  });
}

function withAppDelegateSceneConfiguration(config) {
  return withAppDelegate(config, (config) => {
    let { contents } = config.modResults;

    const windowCreationBlock = `#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }`;

    const sceneAwareReplacement = `return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  // Hands window creation to SceneDelegate; see plugins/withSceneLifecycle.js.
  // Not \`override\`: ExpoAppDelegate doesn't implement this optional
  // UIApplicationDelegate method itself, so there's nothing to override.
  public func application(
    _ application: UIApplication,
    configurationForConnecting connectingSceneSession: UISceneSession,
    options: UIScene.ConnectionOptions
  ) -> UISceneConfiguration {
    let configuration = UISceneConfiguration(
      name: "Default Configuration",
      sessionRole: connectingSceneSession.role)
    configuration.delegateClass = SceneDelegate.self
    return configuration
  }`;

    if (contents.includes(sceneAwareReplacement)) {
      return config;
    }

    if (!contents.includes(windowCreationBlock)) {
      throw new Error(
        'withSceneLifecycle: could not find the expected window-creation block in AppDelegate.swift to patch for UIScene support. The Expo/RN template may have changed.',
      );
    }

    contents = contents.replace(windowCreationBlock, sceneAwareReplacement);
    config.modResults.contents = contents;
    return config;
  });
}

module.exports = function withSceneLifecycle(config) {
  config = withSceneManifestInfoPlist(config);
  config = withSceneDelegateSourceFile(config);
  config = withAppDelegateSceneConfiguration(config);
  return config;
};
