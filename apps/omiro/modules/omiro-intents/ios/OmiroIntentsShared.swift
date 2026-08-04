import Foundation

enum OmiroIntentName: String {
  case addNote = "AddNoteIntent"
  case startChat = "StartChatIntent"
}

enum OmiroRoute: String {
  case addNote = "note/add"
  case startChat = "chat"
}

enum OmiroIntentError: Error {
  case invalidURL
}

func appScheme() -> String? {
  guard
    let urlTypes = Bundle.main.object(forInfoDictionaryKey: "CFBundleURLTypes") as? [[String: Any]]
  else {
    return nil
  }

  for urlType in urlTypes {
    if let schemes = urlType["CFBundleURLSchemes"] as? [String], let scheme = schemes.first, !scheme.isEmpty {
      return scheme
    }
  }

  return nil
}

func appURL(for route: OmiroRoute) -> URL? {
  guard let scheme = appScheme() else {
    return nil
  }

  return URL(string: "\(scheme)://\(route.rawValue)")
}
