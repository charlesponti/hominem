import EventKit
import ExpoModulesCore
import Foundation
import FoundationModels
import os.log

private let onDeviceAILog = OSLog(subsystem: "com.hominem.omiro", category: "OnDeviceAI")

// Mirrors the VoiceTranscriberException pattern: a stable `code` string the
// JS side can branch on instead of parsing free-text error messages.
private final class OnDeviceAIException: Exception, @unchecked Sendable {
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
private func dayFormatter() -> DateFormatter {
  let formatter = DateFormatter()
  formatter.dateFormat = "yyyy-MM-dd"
  formatter.locale = Locale(identifier: "en_US_POSIX")
  formatter.timeZone = .current
  return formatter
}

private func iso8601Date(_ value: String) -> Date? {
  let fractionalFormatter = ISO8601DateFormatter()
  fractionalFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
  if let date = fractionalFormatter.date(from: value) {
    return date
  }

  let formatter = ISO8601DateFormatter()
  formatter.formatOptions = [.withInternetDateTime]
  return formatter.date(from: value)
}

private func calendarEventRecord(_ event: EKEvent, formatter: ISO8601DateFormatter) -> [String: Any] {
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

private func calendarSpan(_ scope: String) -> EKSpan {
  scope == "futureEvents" ? .futureEvents : .thisEvent
}

private func recurrenceRule(_ value: String?) throws -> EKRecurrenceRule? {
  guard let value, !value.isEmpty else { return nil }

  let fields = Dictionary(
    uniqueKeysWithValues: value
      .uppercased()
      .replacingOccurrences(of: "RRULE:", with: "")
      .split(separator: ";")
      .compactMap { field -> (String, String)? in
        let parts = field.split(separator: "=", maxSplits: 1).map(String.init)
        guard parts.count == 2 else { return nil }
        return (parts[0], parts[1])
      }
  )
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
private func todayAnchorString() -> String {
  let formatter = DateFormatter()
  formatter.dateFormat = "EEEE, yyyy-MM-dd"
  formatter.timeZone = .current
  return formatter.string(from: Date())
}

private struct OnDeviceAIResult: Record {
  @Field
  var text: String = ""

  @Field
  var isOnDevice: Bool = true
}

private func permissionStatusString(_ status: EKAuthorizationStatus) -> String {
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

private func requestCalendarAuthorization() async -> EKAuthorizationStatus {
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

// Coarse time-of-day filter so "what was I doing in the morning" narrows
// results without the model needing to reason about exact hours. Bounds are
// fixed here — in local wall-clock hours via Calendar — rather than left to
// the model, for the same reason day-boundary math is: it's the kind of
// arithmetic that's easy for a model to get subtly wrong and hard to notice.
@available(iOS 26.0, *)
@Generable
private enum DayPart: String, CaseIterable, Sendable {
  case allDay
  case morning
  case afternoon
  case evening
  case night

  /// Local hour-of-day bounds, upper exclusive. `allDay` applies no filter.
  var hourRange: Range<Int>? {
    switch self {
    case .allDay: return nil
    case .morning: return 5..<12
    case .afternoon: return 12..<17
    case .evening: return 17..<21
    case .night: return 21..<24
    }
  }
}

// A single narrow tool: read-only event lookup over an explicit date range,
// optionally narrowed to a part of the day. This is the spike's entire
// surface area — no write access, no other calendars, no attendee/organizer
// data exposed to the model.
//
// The tool itself does no relative-date reasoning ("last year", "next
// month") — it only resolves the exact startDate/endDate the model gives
// it, using Calendar day-boundary math. The model is told today's date and
// is responsible for turning what the user said into concrete dates before
// calling this tool. This split keeps date arithmetic (which broke once
// already, see lookupCalendarEvents history) in Swift/Calendar, while
// letting the model own open-ended natural-language interpretation, which a
// fixed Swift parameter shape could never fully anticipate.
@available(iOS 26.0, *)
private struct CalendarLookupTool: Tool {
  // EventKit's own guidance: predicateForEvents performs poorly over
  // multi-year ranges. A model mistake ("startDate 1900-01-01") shouldn't be
  // able to turn one tool call into a multi-second full-database scan.
  static let maxRangeDays = 3650

  let name = "lookupCalendarEvents"
  let description: String
  // Only primitive payloads cross this closure so it can stay @Sendable without
  // wrapping tool-call detail in a bespoke Sendable event type.
  let onLog: @Sendable (String, String, Double?) -> Void

  init(onLog: @escaping @Sendable (String, String, Double?) -> Void) {
    self.onLog = onLog
    self.description =
      "Looks up the user's calendar events within an explicit date range, any time in the "
      + "past or future. Today is \(todayAnchorString()). Resolve whatever the user said — "
      + "\"today\", \"this time last year\", \"end of next month\", \"in the morning\" — into "
      + "concrete startDate/endDate/dayPart values yourself before calling; this tool does not "
      + "interpret relative language."
  }

  @Generable
  struct Arguments {
    @Guide(description: "Start of the search range, formatted \"yyyy-MM-dd\". Inclusive.")
    var startDate: String

    @Guide(
      description:
        "End of the search range, formatted \"yyyy-MM-dd\". Inclusive — events any time on this day are included. May equal startDate for a single day."
    )
    var endDate: String

    @Guide(
      description:
        "Part of the day to restrict results to, only if the user asked for one (e.g. \"in the morning\" -> morning). Defaults to allDay when the user didn't mention a time of day."
    )
    var dayPart: DayPart?
  }

  func call(arguments: Arguments) async throws -> String {
    let dayPart = arguments.dayPart ?? .allDay
    let dayPartLabel = dayPart == .allDay ? "all day" : dayPart.rawValue
    let startedAt = Date()
    onLog(
      "tool_call",
      "Dates \(arguments.startDate) → \(arguments.endDate) · \(dayPartLabel)",
      nil
    )

    let status = EKEventStore.authorizationStatus(for: .event)
    guard status == .fullAccess else {
      onLog(
        "tool_error",
        "Calendar permission missing",
        Date().timeIntervalSince(startedAt) * 1000
      )
      throw OnDeviceAIException.missingPermission
    }

    let formatter = dayFormatter()
    guard
      let parsedStart = formatter.date(from: arguments.startDate),
      let parsedEnd = formatter.date(from: arguments.endDate)
    else {
      // A malformed date is a model mistake it can recover from, not an
      // infrastructure failure — return guidance instead of throwing so the
      // model can immediately retry with a corrected call.
      onLog(
        "tool_error",
        "Invalid date range \(arguments.startDate) → \(arguments.endDate)",
        Date().timeIntervalSince(startedAt) * 1000
      )
      return
        "Could not parse that date range. startDate and endDate must both be formatted "
        + "\"yyyy-MM-dd\". Today is \(todayAnchorString()). Retry with corrected dates."
    }

    // Model may hand back the range in either order — normalize rather than
    // erroring, since "endDate before startDate" is a model mistake, not a
    // user-facing one.
    let calendar = Calendar.current
    let start = calendar.startOfDay(for: min(parsedStart, parsedEnd))
    guard
      let requestedEnd = calendar.date(
        byAdding: .day, value: 1, to: calendar.startOfDay(for: max(parsedStart, parsedEnd))),
      let maxEnd = calendar.date(byAdding: .day, value: Self.maxRangeDays, to: start)
    else {
      onLog("tool_result", "Found 0 events", Date().timeIntervalSince(startedAt) * 1000)
      return "No events found."
    }
    let end = min(requestedEnd, maxEnd)

    let store = EKEventStore()
    let predicate = store.predicateForEvents(withStart: start, end: end, calendars: nil)
    var events = store.events(matching: predicate)
      .sorted { $0.startDate < $1.startDate }

    if let hourRange = dayPart.hourRange {
      events = events.filter { event in
        guard !event.isAllDay else { return false }
        let hour = calendar.component(.hour, from: event.startDate)
        return hourRange.contains(hour)
      }
    }

    guard !events.isEmpty else {
      onLog("tool_result", "Found 0 events", Date().timeIntervalSince(startedAt) * 1000)
      return "No events found between \(arguments.startDate) and \(arguments.endDate)."
    }

    let displayFormatter = DateFormatter()
    displayFormatter.dateStyle = .medium
    displayFormatter.timeStyle = .short

    // Capped at 20 — this is a spike, not a general-purpose export; a real
    // tool would need the same resultCap discipline the remote MCP tools
    // declare (see services/api/src/mcp/tools/career.ts).
    let lines = events.prefix(20).map { event -> String in
      let title = event.title ?? "Untitled event"
      let when =
        event.isAllDay
        ? "all day"
        : "\(displayFormatter.string(from: event.startDate)) - \(displayFormatter.string(from: event.endDate))"
      return "- \(title): \(when)"
    }

    onLog(
      "tool_result",
      "Found \(events.count) events",
      Date().timeIntervalSince(startedAt) * 1000
    )
    return lines.joined(separator: "\n")
  }
}

@available(iOS 26.0, *)
private func runCalendarQuery(
  prompt: String,
  onLog: @escaping @Sendable (String, String, Double?) -> Void
) async throws -> String {
  guard case .available = SystemLanguageModel.default.availability else {
    throw OnDeviceAIException.modelUnavailable
  }

  onLog("session_start", "Start model session", nil)
  let today = todayAnchorString()
  let instructions: String = """
    You help the user understand their calendar. Today is \(today). \
    Call lookupCalendarEvents whenever asked about their schedule, meetings, or events — \
    never guess. Before calling it, resolve whatever date or range the user implied \
    ("today", "this time last year", "end of next month") into an explicit \
    startDate/endDate using today's date as your anchor. Be concise.
    """
  let session = LanguageModelSession(
    tools: [CalendarLookupTool(onLog: onLog)],
    instructions: instructions
  )

  let promptStartedAt = Date()
  onLog("prompt_sent", "Prompt · \(prompt)", nil)
  do {
    let response = try await session.respond(to: prompt)
    onLog(
      "response_received",
      "Response · \(response.content.count) characters",
      Date().timeIntervalSince(promptStartedAt) * 1000
    )
    return response.content
  } catch {
    os_log(
      "runCalendarQuery: generation failed error=%{public}@",
      log: onDeviceAILog,
      type: .error,
      String(describing: error)
    )
    onLog(
      "generation_error",
      "Model generation failed",
      Date().timeIntervalSince(promptStartedAt) * 1000
    )
    throw OnDeviceAIException.generationFailed
  }
}

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
      guard EKEventStore.authorizationStatus(for: .event) == .fullAccess else {
        throw OnDeviceAIException.missingPermission
      }

      let formatter = ISO8601DateFormatter()
      guard let start = iso8601Date(startDate), let end = iso8601Date(endDate), start < end else {
        throw OnDeviceAIException(
          code: "INVALID_DATE_RANGE",
          message: "Calendar event dates must be ISO 8601 timestamps."
        )
      }

      let store = EKEventStore()
      let predicate = store.predicateForEvents(withStart: start, end: end, calendars: nil)
      return store.events(matching: predicate)
        .sorted { $0.startDate < $1.startDate }
        .map { calendarEventRecord($0, formatter: formatter) }
    }

    AsyncFunction("createCalendarEvent") { (
      title: String,
      startDate: String,
      endDate: String,
      location: String?,
      recurrenceRuleValue: String?
    ) throws -> [String: Any] in
      guard EKEventStore.authorizationStatus(for: .event) == .fullAccess else {
        throw OnDeviceAIException.missingPermission
      }

      guard let start = iso8601Date(startDate), let end = iso8601Date(endDate), start < end else {
        throw OnDeviceAIException(
          code: "INVALID_DATE_RANGE",
          message: "Calendar event dates must be ISO 8601 timestamps."
        )
      }

      let store = EKEventStore()
      guard let calendar = store.defaultCalendarForNewEvents else {
        throw OnDeviceAIException(
          code: "CALENDAR_UNAVAILABLE",
          message: "No calendar is available for new events."
        )
      }

      let event = EKEvent(eventStore: store)
      event.title = title
      event.startDate = start
      event.endDate = end
      event.location = location
      event.calendar = calendar
      event.recurrenceRules = try recurrenceRule(recurrenceRuleValue).map { [$0] }
      try store.save(event, span: .thisEvent)

      return calendarEventRecord(event, formatter: ISO8601DateFormatter())
    }

    AsyncFunction("getCalendarEvent") { (id: String) throws -> [String: Any] in
      guard EKEventStore.authorizationStatus(for: .event) == .fullAccess else {
        throw OnDeviceAIException.missingPermission
      }

      let store = EKEventStore()
      guard let event = store.event(withIdentifier: id) else {
        throw OnDeviceAIException(
          code: "EVENT_NOT_FOUND",
          message: "This calendar event is no longer available."
        )
      }

      return calendarEventRecord(event, formatter: ISO8601DateFormatter())
    }

    AsyncFunction("updateCalendarEvent") { (
      id: String,
      patch: [String: Any],
      recurrenceScope: String
    ) throws -> [String: Any] in
      guard EKEventStore.authorizationStatus(for: .event) == .fullAccess else {
        throw OnDeviceAIException.missingPermission
      }

      let store = EKEventStore()
      guard let event = store.event(withIdentifier: id) else {
        throw OnDeviceAIException(
          code: "EVENT_NOT_FOUND",
          message: "This calendar event is no longer available."
        )
      }
      guard event.calendar?.allowsContentModifications ?? false else {
        throw OnDeviceAIException(
          code: "EVENT_READ_ONLY",
          message: "This calendar does not allow changes from Omiro."
        )
      }

      if let title = patch["title"] as? String {
        event.title = title
      }
      if patch.keys.contains("location") {
        event.location = patch["location"] as? String
      }
      if patch.keys.contains("notes") {
        event.notes = patch["notes"] as? String
      }

      guard let existingStart = event.startDate, let existingEnd = event.endDate else {
        throw OnDeviceAIException(
          code: "INVALID_DATE_RANGE",
          message: "This calendar event does not have a valid time range."
        )
      }
      let start = (patch["startDate"] as? String).flatMap(iso8601Date) ?? existingStart
      let end = (patch["endDate"] as? String).flatMap(iso8601Date) ?? existingEnd
      guard start < end else {
        throw OnDeviceAIException(
          code: "INVALID_DATE_RANGE",
          message: "Calendar event dates must be ISO 8601 timestamps."
        )
      }
      event.startDate = start
      event.endDate = end

      try store.save(event, span: calendarSpan(recurrenceScope), commit: true)
      return calendarEventRecord(event, formatter: ISO8601DateFormatter())
    }

    AsyncFunction("deleteCalendarEvent") { (id: String, recurrenceScope: String) throws -> Void in
      guard EKEventStore.authorizationStatus(for: .event) == .fullAccess else {
        throw OnDeviceAIException.missingPermission
      }

      let store = EKEventStore()
      guard let event = store.event(withIdentifier: id) else {
        throw OnDeviceAIException(
          code: "EVENT_NOT_FOUND",
          message: "This calendar event is no longer available."
        )
      }
      guard event.calendar?.allowsContentModifications ?? false else {
        throw OnDeviceAIException(
          code: "EVENT_READ_ONLY",
          message: "This calendar does not allow changes from Omiro."
        )
      }

      try store.remove(event, span: calendarSpan(recurrenceScope), commit: true)
    }

    AsyncFunction("askCalendar") { (prompt: String) async throws -> OnDeviceAIResult in
      os_log("askCalendar AsyncFunction invoked", log: onDeviceAILog, type: .info)
      guard #available(iOS 26.0, *) else {
        throw OnDeviceAIException.modelUnavailable
      }

      let emitLog: @Sendable (String, String, Double?) -> Void = { [weak self] type, message, durationMs in
        var payload: [String: Any] = [
          "type": type,
          "message": message,
          "timestamp": Date().timeIntervalSince1970 * 1000,
        ]
        if let durationMs {
          payload["durationMs"] = durationMs
        }
        self?.sendEvent("onDeviceAILog", payload)
      }

      do {
        let text = try await runCalendarQuery(prompt: prompt, onLog: emitLog)
        os_log("askCalendar AsyncFunction resolving successfully", log: onDeviceAILog, type: .info)
        return OnDeviceAIResult(text: text, isOnDevice: true)
      } catch {
        os_log(
          "askCalendar AsyncFunction rejecting: %{public}@",
          log: onDeviceAILog,
          type: .error,
          String(describing: error)
        )
        throw error
      }
    }
  }
}
