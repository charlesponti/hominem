import AppIntents
import ExpoModulesCore

@available(iOS 18.0, *)
public struct AddNoteIntent: AppIntent {
  public static let title: LocalizedStringResource = "Add a Note"
  public static let description = IntentDescription("Opens Omiro to create a new note.")

  public init() {}

  public func perform() async throws -> some IntentResult & OpensIntent {
    guard let url = appURL(for: .addNote) else {
      throw OmiroIntentError.invalidURL
    }

    return .result(opensIntent: OpenURLIntent(url))
  }
}

@available(iOS 18.0, *)
public struct StartChatIntent: AppIntent {
  public static let title: LocalizedStringResource = "Start a Chat"
  public static let description = IntentDescription("Opens Omiro chat.")

  public init() {}

  public func perform() async throws -> some IntentResult & OpensIntent {
    guard let url = appURL(for: .startChat) else {
      throw OmiroIntentError.invalidURL
    }

    return .result(opensIntent: OpenURLIntent(url))
  }
}

@available(iOS 18.0, *)
public struct OmiroShortcutsProvider: AppShortcutsProvider {
  public static var appShortcuts: [AppShortcut] {
    AppShortcut(
      intent: AddNoteIntent(),
      phrases: ["Add a note in \(.applicationName)", "New note in \(.applicationName)"],
      shortTitle: "Add Note",
      systemImageName: "square.and.pencil"
    )
    AppShortcut(
      intent: StartChatIntent(),
      phrases: ["Chat in \(.applicationName)", "Open chat in \(.applicationName)"],
      shortTitle: "Start Chat",
      systemImageName: "bubble.left.and.bubble.right"
    )
  }
}

@available(iOS 17.0, *)
public struct OmiroIntentsPackage: AppIntentsPackage {}

public class OmiroIntentsModule: Module {
  public func definition() -> ModuleDefinition {
    Name("OmiroIntents")

    AsyncFunction("donate") { (intentName: String) async -> Bool in
      guard #available(iOS 18.0, *) else {
        return false
      }

      guard let resolvedIntent = OmiroIntentName(rawValue: intentName) else {
        return false
      }

      do {
        switch resolvedIntent {
        case .addNote:
          try await IntentDonationManager.shared.donate(intent: AddNoteIntent())
        case .startChat:
          try await IntentDonationManager.shared.donate(intent: StartChatIntent())
        }
        return true
      } catch {
        return false
      }
    }
  }
}
