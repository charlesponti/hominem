/**
 * Replace multiple spaces with a single space.
 * @param value The string to collapse whitespace in.
 * @returns The string with collapsed whitespace.
 */
export function collapseWhitespace(value: string): string {
  const trimmed = value.trim();
  let normalized = '';
  let previousWasWhitespace = false;

  for (const character of trimmed) {
    const isWhitespace = character.trim() === '';

    if (isWhitespace) {
      if (!previousWasWhitespace) {
        normalized += ' ';
      }
    } else {
      normalized += character;
    }

    previousWasWhitespace = isWhitespace;
  }

  return normalized;
}

export function slugifyText(value: string | null): string | null {
  const lowercased = (value ?? '').toLowerCase();
  let normalized = '';

  for (const character of lowercased) {
    const isAsciiAlphaNumeric =
      (character >= 'a' && character <= 'z') || (character >= '0' && character <= '9');

    if (isAsciiAlphaNumeric) {
      normalized += character;
    } else if (normalized.length > 0 && !normalized.endsWith('-')) {
      normalized += '-';
    }
  }

  if (normalized.endsWith('-')) {
    normalized = normalized.slice(0, -1);
  }

  return normalized.length > 0 ? normalized : null;
}

export function replaceUnderscores(value: string): string {
  return value.replace(/_/g, ' ');
}

export function humanizeIdentifier(value: string): string {
  return value.replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function buildContentPreview(
  excerpt: string | null,
  content: string,
  maxLength = 240,
): string {
  const normalized = collapseWhitespace(excerpt ?? content);
  return normalized.slice(0, maxLength);
}
