export interface ChatMessageFileRecord {
  type: 'image' | 'file' | 'audio';
  fileId?: string;
  url?: string;
  filename?: string;
  mimeType?: string;
  size?: number;
  metadata?: Record<string, unknown>;
}

export interface ChatMessageToolCallRecord {
  toolName: string;
  type: 'tool-call';
  toolCallId: string;
  args: Record<string, unknown>;
  /**
   * Tool-call lifecycle. `pending` and `rejected` describe confirmation;
   * `completed` and `failed` describe execution. Absent (undefined) means
   * the call predates lifecycle tracking.
   */
  status?: 'completed' | 'pending' | 'rejected' | 'failed';
  /**
   * Human-readable description of the specific record a `pending` call
   * would affect (e.g. a skill's name/level), so an approval UI can show
   * more than a raw id. Only ever set for `requiresConfirmation` tools.
   */
  preview?: Record<string, unknown> | null;
}

type UnknownRecord = Record<string, unknown>;
type FieldValidator = readonly [key: string, isValid: (value: unknown) => boolean];

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string';
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || typeof value === 'number';
}

function isOptionalRecord(value: unknown): boolean {
  return value === undefined || isRecord(value);
}

function isOptionalNullableRecord(value: unknown): boolean {
  return value === undefined || value === null || isRecord(value);
}

function isString(value: unknown): boolean {
  return typeof value === 'string';
}

function isOptionalToolCallStatus(value: unknown): boolean {
  return (
    value === undefined ||
    value === 'completed' ||
    value === 'pending' ||
    value === 'rejected' ||
    value === 'failed'
  );
}

function isChatMessageFileType(value: unknown): boolean {
  return value === 'image' || value === 'file' || value === 'audio';
}

function isToolCallType(value: unknown): boolean {
  return value === 'tool-call';
}

function hasValidFields(record: UnknownRecord, fields: readonly FieldValidator[]): boolean {
  return fields.every(([key, isValid]) => isValid(record[key]));
}

const CHAT_MESSAGE_FILE_FIELDS: FieldValidator[] = [
  ['type', isChatMessageFileType],
  ['fileId', isOptionalString],
  ['url', isOptionalString],
  ['filename', isOptionalString],
  ['mimeType', isOptionalString],
  ['size', isOptionalNumber],
  ['metadata', isOptionalRecord],
];

const CHAT_MESSAGE_TOOL_CALL_FIELDS: FieldValidator[] = [
  ['toolName', isString],
  ['type', isToolCallType],
  ['toolCallId', isString],
  ['args', isRecord],
  ['status', isOptionalToolCallStatus],
  ['preview', isOptionalNullableRecord],
];

function isChatMessageFileRecord(value: unknown): value is ChatMessageFileRecord {
  if (!isRecord(value)) return false;
  return hasValidFields(value, CHAT_MESSAGE_FILE_FIELDS);
}

function isChatMessageToolCallRecord(value: unknown): value is ChatMessageToolCallRecord {
  if (!isRecord(value)) return false;
  return hasValidFields(value, CHAT_MESSAGE_TOOL_CALL_FIELDS);
}

export function parseChatMessageFiles(value: unknown): ChatMessageFileRecord[] | null {
  if (!Array.isArray(value)) return null;
  const parsed = value.map((item) => {
    if (!isChatMessageFileRecord(item)) return null;
    return item;
  });
  return parsed.every((item): item is ChatMessageFileRecord => item !== null) ? parsed : null;
}

export function parseChatMessageToolCalls(value: unknown): ChatMessageToolCallRecord[] | null {
  if (!Array.isArray(value)) return null;
  const parsed = value.map((item) => {
    if (!isChatMessageToolCallRecord(item)) return null;
    return item;
  });
  return parsed.every((item): item is ChatMessageToolCallRecord => item !== null) ? parsed : null;
}
