import EventKit
import ExpoModulesCore
import Foundation
import FoundationModels
import os.log

public class OnDeviceAIModule: Module {
  public func definition() -> ModuleDefinition {
    Name("OnDeviceAI")

    Events("onDeviceAILog")

    AsyncFunction("getAvailability") { () async -> String in
      guard #available(iOS 26.0, *) else { return "unsupported" }
      switch SystemLanguageModel.default.availability {
      case .available:
        return "available"
      case .unavailable:
        return "unavailable"
      @unknown default:
        return "unavailable"
      }
    }

    AsyncFunction("getCalendarPermissions") { () async -> String in
      permissionStatusString(EKEventStore.authorizationStatus(for: .event))
    }

    AsyncFunction("requestCalendarPermissions") { () async -> String in
      let status = await requestCalendarAuthorization()
      return permissionStatusString(status)
    }

    AsyncFunction("getCalendarEvents") { (startDate: String, endDate: String) throws -> [[String: Any]] in
      try fetchCalendarEvents(startDate: startDate, endDate: endDate)
    }

    AsyncFunction("createCalendarEvent") { (
      title: String,
      startDate: String,
      endDate: String,
      location: String?,
      recurrenceRuleValue: String?
    ) throws -> [String: Any] in
      try createCalendarEvent(
        title: title,
        startDate: startDate,
        endDate: endDate,
        location: location,
        recurrenceRuleValue: recurrenceRuleValue
      )
    }

    AsyncFunction("getCalendarEvent") { (id: String) throws -> [String: Any] in
      try fetchCalendarEvent(id: id)
    }

    AsyncFunction("updateCalendarEvent") { (
      id: String,
      patch: [String: Any],
      recurrenceScope: String
    ) throws -> [String: Any] in
      try updateCalendarEvent(id: id, patch: patch, recurrenceScope: recurrenceScope)
    }

    AsyncFunction("deleteCalendarEvent") { (id: String, recurrenceScope: String) throws -> Void in
      try deleteCalendarEvent(id: id, recurrenceScope: recurrenceScope)
    }

    AsyncFunction("askCalendar") { (prompt: String) async throws -> OnDeviceAIResult in
      os_log("askCalendar AsyncFunction invoked", log: onDeviceAILog, type: .info)
      guard #available(iOS 26.0, *) else {
        throw OnDeviceAIException.modelUnavailable
      }

      let startedAt = Date()
      let response = try await runCalendarQuery(
        prompt: prompt,
        onLog: { event, message, durationMs in
          var payload: [String: Any] = [
            "type": event,
            "message": message,
            "timestamp": Date().timeIntervalSince1970 * 1000,
          ]
          if let durationMs {
            payload["durationMs"] = durationMs
          }
          self.sendEvent("onDeviceAILog", payload)
        }
      )
      os_log(
        "askCalendar AsyncFunction resolved after %{public}.0fms",
        log: onDeviceAILog,
        type: .info,
        Date().timeIntervalSince(startedAt) * 1000
      )
      return OnDeviceAIResult(text: response, isOnDevice: true)
    }
  }
}
