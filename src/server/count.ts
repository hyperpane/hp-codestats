// Counting one file's lines: code, comments and blanks, as its language
// writes comments. A line with code on it is code, even with a comment
// after; a line with only a comment (or inside a block comment) is a
// comment; a line of spaces is blank. Strings are stepped over, so a `//`
// or `/*` in one isn't taken for a comment.

export interface Syntax {
  /** Line comments: `//`, `#`, `--`. */
  line?: readonly string[];
  /** Block comments: `[open, close]`. */
  block?: readonly (readonly [string, string])[];
  /** Block comments nest (Rust, Swift, Haskell). */
  nested?: boolean;
  /** String quotes. A one-character quote ends at the line's end, but a
   * backtick and the longer ones (`"""`) go on over lines. */
  quotes?: readonly string[];
}

export interface LineCounts {
  lines: number;
  code: number;
  comments: number;
  blanks: number;
}

const isSpace = (c: number) => c === 32 || c === 9 || c === 13 || c === 12 || c === 11 || c === 0xfeff;

/** A syntax ready for counting: what each token starts with, the longest
 * tokens first so `"""` is seen before `"`. */
interface Ready {
  line: string[];
  block: (readonly [string, string])[];
  quotes: string[];
  nested: boolean;
  starts: Set<number>;
}

const ready = new WeakMap<Syntax, Ready>();
function prepare(s: Syntax): Ready {
  let r = ready.get(s);
  if (r) return r;
  const longest = (a: string, b: string) => b.length - a.length;
  const line = [...(s.line ?? [])].sort(longest);
  const block = [...(s.block ?? [])].sort((a, b) => b[0].length - a[0].length);
  const quotes = [...(s.quotes ?? [])].sort(longest);
  const starts = new Set<number>([...line, ...block.map((b) => b[0]), ...quotes].map((t) => t.charCodeAt(0)));
  r = { line, block, quotes, nested: !!s.nested, starts };
  ready.set(s, r);
  return r;
}

export function countLines(text: string, syntax: Syntax): LineCounts {
  const s = prepare(syntax);
  const out: LineCounts = { lines: 0, code: 0, comments: 0, blanks: 0 };
  if (!text) return out;
  // What's open at the start of a line: a block comment (how deep, and how
  // it closes) or a string that goes on over lines.
  let block: readonly [string, string] | null = null;
  let depth = 0;
  let quote: string | null = null;

  const n = text.length;
  let start = 0;
  while (start < n) {
    let end = text.indexOf('\n', start);
    if (end < 0) end = n;
    let code = false;
    let comment = false;
    let i = start;
    while (i < end) {
      const c = text.charCodeAt(i);
      if (quote) {
        code = true;
        if (c === 92) {
          i += 2;
          continue;
        }
        if (text.startsWith(quote, i)) {
          i += quote.length;
          quote = null;
        } else i++;
        continue;
      }
      if (block) {
        if (s.nested && text.startsWith(block[0], i)) {
          depth++;
          i += block[0].length;
          comment = true;
          continue;
        }
        if (text.startsWith(block[1], i)) {
          i += block[1].length;
          comment = true;
          if (--depth === 0) block = null;
          continue;
        }
        if (!isSpace(c)) comment = true;
        i++;
        continue;
      }
      if (isSpace(c)) {
        i++;
        continue;
      }
      if (s.starts.has(c)) {
        const opens = s.block.find((b) => text.startsWith(b[0], i));
        if (opens) {
          block = opens;
          depth = 1;
          comment = true;
          i += opens[0].length;
          continue;
        }
        if (s.line.some((l) => text.startsWith(l, i))) {
          comment = true;
          break;
        }
        const q = s.quotes.find((q) => text.startsWith(q, i));
        if (q) {
          quote = q;
          code = true;
          i += q.length;
          continue;
        }
      }
      code = true;
      i++;
    }
    // A one-character string doesn't go on to the next line.
    if (quote && quote.length === 1 && quote !== '`') quote = null;
    out.lines++;
    if (code) out.code++;
    else if (comment) out.comments++;
    else out.blanks++;
    start = end + 1;
  }
  return out;
}
