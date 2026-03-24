import AppIntents
import Foundation

// MARK: - AppIntents for the Control Center extension target
//
// These definitions MUST live in this target. Extensions are separate
// Xcode binaries and cannot reference types compiled into the main app.
// The main app has its own copies in HakumiDev/AppIntents/HakumiAppIntents.swift.

@available(iOS 16.0, *)
struct AddNoteIntent: AppIntent {
  static let title: LocalizedStringResource = "Add Note"
  static let description = IntentDescription("Open Hakumi to create a new note.")
  static let openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult {
    guard let url = URL(string: "hakumi://note/add") else { return .result() }
    await UIApplication.shared.open(url)
    return .result()
  }
}

@available(iOS 16.0, *)
struct StartChatIntent: AppIntent {
  static let title: LocalizedStringResource = "Open Sherpa"
  static let description = IntentDescription("Open the Hakumi AI assistant.")
  static let openAppWhenRun: Bool = true

  @MainActor
  func perform() async throws -> some IntentResult {
    guard let url = URL(string: "hakumi://sherpa") else { return .result() }
    await UIApplication.shared.open(url)
    return .result()
  }
}
