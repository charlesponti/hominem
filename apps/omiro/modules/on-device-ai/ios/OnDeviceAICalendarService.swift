import EventKit
import Foundation

func fetchCalendarEvents(startDate: String, endDate: String) throws -> [[String: Any]] {
  guard EKEventStore.authorizationStatus(for: .event) == .fullAccess else {
    throw OnDeviceAIException.missingPermission
  }

  let range = try calendarRange(startDate: startDate, endDate: endDate)
  let formatter = ISO8601DateFormatter()

  let store = EKEventStore()
  let predicate = store.predicateForEvents(withStart: range.start, end: range.end, calendars: nil)
  return store.events(matching: predicate)
    .sorted { $0.startDate < $1.startDate }
    .map { calendarEventRecord($0, formatter: formatter) }
}

func createCalendarEvent(
  title: String,
  startDate: String,
  endDate: String,
  location: String?,
  recurrenceRuleValue: String?
) throws -> [String: Any] {
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

func fetchCalendarEvent(id: String) throws -> [String: Any] {
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

func updateCalendarEvent(
  id: String,
  patch: [String: Any],
  recurrenceScope: String
) throws -> [String: Any] {
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
  let start = try patchDate(patch, key: "startDate") ?? existingStart
  let end = try patchDate(patch, key: "endDate") ?? existingEnd
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

func deleteCalendarEvent(id: String, recurrenceScope: String) throws {
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
