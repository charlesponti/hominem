export const FORMAT_COMMANDS = [
  'bold',
  'italic',
  'code',
  'strikethrough',
  'heading',
  'bullet',
  'numbered-list',
  'checklist',
  'blockquote',
  'indent',
  'outdent',
] as const;

export type FormatCommand = (typeof FORMAT_COMMANDS)[number];

export interface TextSelection {
  start: number;
  end: number;
}

export interface FormatCommandResult {
  text: string;
  selection: TextSelection;
}

function lineStart(text: string, pos: number): number {
  const idx = text.lastIndexOf('\n', pos - 1);
  return idx === -1 ? 0 : idx + 1;
}

function wrapSelection(
  text: string,
  sel: TextSelection,
  prefix: string,
  suffix: string,
): FormatCommandResult {
  if (sel.start === sel.end) {
    const next = text.slice(0, sel.start) + prefix + suffix + text.slice(sel.start);
    const cursor = sel.start + prefix.length;
    return { text: next, selection: { start: cursor, end: cursor } };
  }

  const before = text.slice(0, sel.start);
  const selected = text.slice(sel.start, sel.end);
  const after = text.slice(sel.end);

  if (selected.startsWith(prefix) && selected.endsWith(suffix)) {
    const inner = selected.slice(prefix.length, selected.length - suffix.length);
    return {
      text: before + inner + after,
      selection: { start: sel.start, end: sel.start + inner.length },
    };
  }

  const end = sel.end + prefix.length + suffix.length;
  return {
    text: before + prefix + selected + suffix + after,
    selection: { start: end, end },
  };
}

function toggleLinePrefix(text: string, sel: TextSelection, prefix: string): FormatCommandResult {
  const start = lineStart(text, sel.start);
  const hasPrefix = text.slice(start, start + prefix.length) === prefix;

  if (hasPrefix) {
    const next = text.slice(0, start) + text.slice(start + prefix.length);
    const offset = prefix.length;
    return {
      text: next,
      selection: {
        start: Math.max(sel.start - offset, start),
        end: Math.max(sel.end - offset, start),
      },
    };
  }

  const next = text.slice(0, start) + prefix + text.slice(start);
  return {
    text: next,
    selection: { start: sel.start + prefix.length, end: sel.end + prefix.length },
  };
}

function indentLine(text: string, sel: TextSelection, spaces = '  '): FormatCommandResult {
  const start = lineStart(text, sel.start);
  const next = text.slice(0, start) + spaces + text.slice(start);
  return {
    text: next,
    selection: { start: sel.start + spaces.length, end: sel.end + spaces.length },
  };
}

function outdentLine(text: string, sel: TextSelection): FormatCommandResult {
  const start = lineStart(text, sel.start);
  const slice = text.slice(start);
  const match = slice.match(/^( {1,2})/);
  if (!match) {
    return { text, selection: sel };
  }
  const removed = match[1].length;
  const next = text.slice(0, start) + text.slice(start + removed);
  return {
    text: next,
    selection: {
      start: Math.max(sel.start - removed, start),
      end: Math.max(sel.end - removed, start),
    },
  };
}

export function applyFormatCommand(
  text: string,
  selection: TextSelection,
  command: FormatCommand,
): FormatCommandResult {
  switch (command) {
    case 'bold':
      return wrapSelection(text, selection, '**', '**');
    case 'italic':
      return wrapSelection(text, selection, '_', '_');
    case 'code':
      return wrapSelection(text, selection, '`', '`');
    case 'strikethrough':
      return wrapSelection(text, selection, '~~', '~~');
    case 'heading':
      return toggleLinePrefix(text, selection, '# ');
    case 'bullet':
      return toggleLinePrefix(text, selection, '- ');
    case 'numbered-list':
      return toggleLinePrefix(text, selection, '1. ');
    case 'checklist':
      return toggleLinePrefix(text, selection, '- [ ] ');
    case 'blockquote':
      return toggleLinePrefix(text, selection, '> ');
    case 'indent':
      return indentLine(text, selection);
    case 'outdent':
      return outdentLine(text, selection);
  }
}
