// Plain-text extraction from an HTML email body.
//
// Some banks send alert emails with no text/plain part at all: a DBS "Card
// Transaction Alert" is multipart/mixed wrapping a single text/html part.
// Before this existed, lib/gmail.ts handed the parsers '' for such an email,
// every parser returned null, and a real transaction was silently skipped as
// "unrecognised format" (sg-bank-formats-reference §3).
//
// Deliberately small and dependency-free — no new dependencies, and this runs
// inside the daily cron. It is NOT a general HTML renderer: it turns a
// label/value email into one line per visual line, which is all the parsers
// need. Anything fancier belongs in a library, and a library needs sign-off.
//
// Pure and client-safe: no imports, no env, no I/O.

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

/** Decode the handful of entities that appear in bank templates. */
function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, entity: string) => {
    if (entity.startsWith('#')) {
      const code =
        entity[1] === 'x' || entity[1] === 'X'
          ? parseInt(entity.slice(2), 16)
          : parseInt(entity.slice(1), 10);
      if (!Number.isFinite(code) || code <= 0 || code > 0x10ffff) return whole;
      return String.fromCodePoint(code);
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? whole;
  });
}

/**
 * Flatten an HTML email body to text.
 *
 * Order matters: line-breaking tags become newlines before the generic tag
 * strip, and entities are decoded last so that an escaped `&lt;b&gt;` in the
 * text can never be mistaken for markup.
 */
export function htmlToText(html: string): string {
  let text = html;

  // Comments first, before any element is removed. Order is load-bearing: an
  // element rule that deletes a comment's closing `-->` leaves the opening
  // `<!--` looking unterminated, and the comment rule would then run on to the
  // NEXT `-->` in the document, swallowing real content on the way.
  //
  // Outlook's conditional-comment hacks (`<!-->`) are deliberately malformed,
  // so clear them before the well-formed rule can start at one of them.
  text = text.replace(/<!-->/g, ' ');
  text = text.replace(/<!--[\s\S]*?-->/g, ' ');

  // Never-visible elements. <head> goes too: its <title> would otherwise land
  // in the body text as a stray line.
  text = text.replace(/<(script|style|head)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, ' ');

  text = text.replace(/<br\s*\/?>/gi, '\n');
  text = text.replace(/<\/(p|div|tr|td|th|table|li|h[1-6])\s*>/gi, '\n');
  text = text.replace(/<[^>]*>/g, ' ');

  text = decodeEntities(text);

  // Collapse: horizontal whitespace runs (bank templates pad values with
  // several spaces) become one space; blank lines disappear entirely.
  text = text.replace(/\r\n?/g, '\n').replace(/[^\S\n]+/g, ' ');
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '')
    .join('\n');
}
