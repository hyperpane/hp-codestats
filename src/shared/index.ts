// What both parts share: a folder's (or a file's) stats as the server part
// counts them, and the events of a count.

/** Lines of one kind or another, and the files and bytes they're in. */
export interface Counts {
  files: number;
  /** Every line: code + comments + blanks. */
  lines: number;
  /** Lines with code on them (a comment after code counts as code). */
  code: number;
  /** Lines with only a comment. */
  comments: number;
  /** Lines with nothing but spaces. */
  blanks: number;
  bytes: number;
}

export interface LanguageStats extends Counts {
  name: string;
  /** Its color (GitHub's, where it has one). */
  color: string;
}

export interface FolderStats extends Counts {
  /** The first part of the files' paths ('' for the files right in it). */
  name: string;
  /** Its languages by code, the biggest first: name and lines of code. */
  languages: { name: string; code: number }[];
}

export interface FileStats {
  /** From the folder counted, with `/`. */
  path: string;
  language: string;
  lines: number;
  code: number;
  comments: number;
  blanks: number;
  bytes: number;
}

/** What wasn't counted, and why. */
export interface Skipped {
  /** Binary: images, archives, builds. */
  binary: number;
  /** Over the size counted. */
  large: number;
  /** Lock files, minified files, source maps. */
  generated: number;
  /** Text in no language it knows. */
  other: number;
  /** The extensions of those, the commonest first ('' for none). */
  otherKinds: { ext: string; files: number }[];
}

export interface Stats {
  /** The folder or file counted: a full path on the server. */
  root: string;
  /** It's one file. */
  file: boolean;
  /** The files are the ones git has, and those it doesn't ignore; else every
   * file but in node_modules, build output and the like. */
  git: boolean;
  totals: Counts;
  /** By code, the most first. */
  languages: LanguageStats[];
  /** By code, the most first. */
  folders: FolderStats[];
  /** The longest files, the longest first. */
  largest: FileStats[];
  skipped: Skipped;
  /** It stopped at so many files. */
  truncated: boolean;
  /** How long it took, in milliseconds. */
  took: number;
}

/** A count's events: how far it is, then the stats. */
export type CountEvent = { type: 'progress'; done: number; total: number } | { type: 'done'; stats: Stats };

/** What goes out of the `stats` port: the totals and each language's. */
export interface StatsOut {
  path: string;
  files: number;
  lines: number;
  code: number;
  comments: number;
  blanks: number;
  languages: { name: string; files: number; code: number; comments: number; blanks: number; lines: number }[];
}

export function statsOut(s: Stats): StatsOut {
  const { files, lines, code, comments, blanks } = s.totals;
  return {
    path: s.root,
    files,
    lines,
    code,
    comments,
    blanks,
    languages: s.languages.map(({ name, files, code, comments, blanks, lines }) => ({ name, files, code, comments, blanks, lines })),
  };
}
