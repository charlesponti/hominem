import EventKit
import ExpoModulesCore
import Foundation
import FoundationModels
import os.log

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
func runCalendarQuery(
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
