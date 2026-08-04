import EventKit
import ExpoModulesCore
import Foundation
import FoundationModels
import os.log

let onDeviceAILog = OSLog(subsystem: "com.hominem.omiro", category: "OnDeviceAI")

// Mirrors the VoiceTranscriberException pattern: a stable `code` string the
// JS side can branch on instead of parsing free-text error messages.
final class OnDeviceAIException: Exception, @unchecked Sendable {
  private let messageText: String
  private let codeText: String

  init(code: String, message: String) {
    self.codeText = code
    self.messageText = message
    super.init()
  }

  override var reason: String { messageText }
  override var code: String { codeText }

  static var modelUnavailable: OnDeviceAIException {
    OnDeviceAIException(
      code: "MODEL_UNAVAILABLE",
      message: "Apple Intelligence is not available on this device."
    )
  }

  static var missingPermission: OnDeviceAIException {
    OnDeviceAIException(
      code: "MISSING_PERMISSION",
      message: "Calendar access is required to answer this question."
    )
  }

  static var generationFailed: OnDeviceAIException {
    OnDeviceAIException(
      code: "GENERATION_FAILED",
      message: "The on-device model failed to respond."
    )
  }
}

// Shared "yyyy-MM-dd" formatter for the tool's date-range arguments. Fixed
// POSIX locale and device time zone so parsing never depends on the user's
// region settings, only on the format the model was told to produce.
func dayFormatter() -> DateFormatter {
  let formatter = DateFormatter()
  formatter.dateFormat = "yyyy-MM-dd"
  formatter.locale = Locale(identifier: "en_US_POSIX")
  formatter.timeZone = .current
  return formatter
}

func iso8601Date(_ value: String) -> Date? {
  let fractionalFormatter = ISO8601DateFormatter()
  fractionalFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  if let date = fractionalFormatter.date(from: value) {
    return date
  }

  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime]
  return formatter.date(from: value)
}

func patchDate(_ patch: [String: Any], key: String) throws -> Date? {
  guard patch.keys.contains(key) else { return nil }
  guard let value = patch[key] as? String, let date = iso8601Date(value) else {
    throw OnDeviceAIException(
      code: "INVALID_DATE_RANGE",
      message: "Calendar event dates must be ISO 8601 timestamps."
    )
  }
  return date
}

func calendarRange(startDate: String, endDate: String) throws -> (start: Date, end: Date) {
  guard let start = iso8601Date(startDate), let end = iso8601Date(endDate), start < end else {
    throw OnDeviceAIException(
      code: "INVALID_DATE_RANGE",
      message: "Calendar event dates must be ISO 8601 timestamps."
    )
  }
  guard end.timeIntervalSince(start) <= 3650 * 24 * 60 * 60 else {
    throw OnDeviceAIException(
      code: "INVALID_DATE_RANGE",
      message: "Calendar event ranges cannot exceed ten years."
    )
  }
  return (start, end)
}

func calendarEventRecord(_ event: EKEvent, formatter: ISO8601DateFormatter) -> [String: Any] {
  [
    "id": event.eventIdentifier ?? UUID().uuidString,
    "title": event.title ?? "Untitled event",
    "startDate": formatter.string(from: event.startDate),
    "endDate": formatter.string(from: event.endDate),
    "isAllDay": event.isAllDay,
    "location": event.location as Any,
    "calendarTitle": event.calendar?.title as Any,
    "notes": event.notes as Any,
    "participants": event.attendees?.compactMap { participant in
      participant.name ?? participant.url.absoluteString
    } ?? [],
    "recurrenceDescription": event.recurrenceRules?.first?.description as Any,
    "isEditable": event.calendar?.allowsContentModifications ?? false,
  ]
}

func calendarSpan(_ scope: String) -> EKSpan {
  scope == "futureEvents" ? .futureEvents : .thisEvent
}

func recurrenceRule(_ value: String?) throws -> EKRecurrenceRule? {
  guard let value, !value.isEmpty else { return nil }

  var fields: [String: String] = [:]
  for field in value.uppercased().replacingOccurrences(of: "RRULE:", with: "").split(separator: ";") {
    let parts = field.split(separator: "=", maxSplits: 1).map(String.init)
    guard parts.count == 2, !parts[0].isEmpty, !parts[1].isEmpty, fields[parts[0]] == nil else {
      throw OnDeviceAIException(
        code: "INVALID_RECURRENCE_RULE",
        message: "This recurrence pattern is not supported."
      )
    }
    fields[parts[0]] = parts[1]
  }
  let frequency: EKRecurrenceFrequency
  switch fields["FREQ"] {
  case "DAILY": frequency = .daily
  case "WEEKLY": frequency = .weekly
  case "MONTHLY": frequency = .monthly
  case "YEARLY": frequency = .yearly
  default:
    throw OnDeviceAIException(
      code: "INVALID_RECURRENCE_RULE",
      message: "This recurrence pattern is not supported."
    )
  }
  let interval = max(Int(fields["INTERVAL"] ?? "1") ?? 1, 1)
  let weekdays: [EKRecurrenceDayOfWeek]? = fields["BYDAY"]?
    .split(separator: ",")
    .compactMap { day in
      switch day.suffix(2) {
      case "MO": return EKRecurrenceDayOfWeek(.monday)
      case "TU": return EKRecurrenceDayOfWeek(.tuesday)
      case "WE": return EKRecurrenceDayOfWeek(.wednesday)
      case "TH": return EKRecurrenceDayOfWeek(.thursday)
      case "FR": return EKRecurrenceDayOfWeek(.friday)
      case "SA": return EKRecurrenceDayOfWeek(.saturday)
      case "SU": return EKRecurrenceDayOfWeek(.sunday)
      default: return nil
      }
    }
  let end = Int(fields["COUNT"] ?? "").map { EKRecurrenceEnd(occurrenceCount: $0) }
  return EKRecurrenceRule(
    recurrenceWith: frequency,
    interval: interval,
    daysOfTheWeek: weekdays?.isEmpty == false ? weekdays : nil,
    daysOfTheMonth: nil,
    monthsOfTheYear: nil,
    weeksOfTheYear: nil,
    daysOfTheYear: nil,
    setPositions: nil,
    end: end
  )
}

// Human-readable "today" anchor, e.g. "Monday, 2026-07-20". Given to the
// model so it can resolve relative phrases ("this time last year", "end of
// next month") into concrete dates itself, instead of the tool guessing at
// day-count arithmetic on the model's behalf.
func todayAnchorString() -> String {
  let formatter = DateFormatter()
  formatter.dateFormat = "EEEE, yyyy-MM-dd"
  formatter.timeZone = .current
  return formatter.string(from: Date())
}

struct OnDeviceAIResult: Record {
  @Field
  var text: String = ""

  @Field
  var isOnDevice: Bool = true
}

func permissionStatusString(_ status: EKAuthorizationStatus) -> String {
  switch status {
  case .fullAccess:
    return "authorized"
  case .denied, .restricted, .writeOnly:
    return "denied"
  case .notDetermined:
    return "notDetermined"
  @unknown default:
    return "denied"
  }
}

func requestCalendarAuthorization() async -> EKAuthorizationStatus {
  let store = EKEventStore()
  do {
    _ = try await store.requestFullAccessToEvents()
  } catch {
    os_log(
      "requestCalendarAuthorization: request failed error=%{public}@",
      log: onDeviceAILog,
      type: .error,
      String(describing: error)
    )
  }
  return EKEventStore.authorizationStatus(for: .event)
}

@Generable
enum DayPart: String, CaseIterable, Sendable {
  case allDay
  case morning
  case afternoon
  case evening

  var hourRange: Range<Int>? {
    switch self {
    case .allDay:
      return nil
    case .morning:
      return 5..<12
    case .afternoon:
      return 12..<17
    case .evening:
      return 17..<22
    }
  }
}
