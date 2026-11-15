// Counting a folder: its files (the ones git has and doesn't ignore, in a
// repository; else every file but in node_modules, build output and the
// like), each one's language and lines, added up by language, by folder,
// and the longest files. Binary files, big ones and generated ones (lock
// files, minified ones) aren't counted, and are said.

import { readdir, readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import type { Host } from '@hyperpane/sdk/server';
import type { Counts, FileStats, FolderStats, LanguageStats, Stats } from '../shared/index.ts';
import { countLines } from './count.ts';
import { extensionOf, isGenerated, type Language, languageOf, languageOfShebang } from './languages.ts';

export interface Limits {
  /** Files counted at most. */
  maxFiles?: number;
  /** Bigger files aren't counted. */
  maxBytes?: number;
  /** How often progress is said, in milliseconds. */
  progressEvery?: number;
}

const SKIP = new Set([
  'node_modules',
  '.git',
  '.hg',
  '.svn',
  'dist',
  'build',
  'out',
  'target',
  'vendor',
  '.venv',
  'venv',
  '__pycache__',
  '.next',
  '.nuxt',
  '.svelte-kit',
  '.turbo',
  '.cache',
  'coverage',
  '.hyperpane',
  '.idea',
  '.vscode',
  'Pods',
  'DerivedData',
  '.gradle',
  '.dart_tool',
  '.terraform',
]);
const LARGEST = 100;
const READERS = 16;
const SNIFF = 8000;

const zero = (): Counts => ({ files: 0, lines: 0, code: 0, comments: 0, blanks: 0, bytes: 0 });
function add(to: Counts, f: { lines: number; code: number; comments: number; blanks: number; bytes: number }) {
  to.files++;
  to.lines += f.lines;
  to.code += f.code;
  to.comments += f.comments;
  to.blanks += f.blanks;
  to.bytes += f.bytes;
}
const byCode = (a: Counts & { name: string }, b: Counts & { name: string }) => b.code - a.code || b.lines - a.lines || a.name.localeCompare(b.name);

export async function count(host: Host, root: string, o: Limits & { signal?: AbortSignal; progress?(done: number, total: number): void } = {}): Promise<Stats> {
  const maxFiles = o.maxFiles ?? 100_000;
  const maxBytes = o.maxBytes ?? 2 * 1024 * 1024;
  const began = Date.now();
  const info = await stat(root);
  const file = info.isFile();
  if (!file && !info.isDirectory()) throw new Error(`${root} isn’t a folder or a file.`);

  let listed: string[];
  let git = false;
  if (file) listed = [path.basename(root)];
  else {
    const fromGit = await gitFiles(host, root, o.signal);
    git = !!fromGit;
    listed = fromGit ?? (await walk(root, maxFiles + 1, o.signal));
  }
  const truncated = listed.length > maxFiles;
  if (truncated) listed = listed.slice(0, maxFiles);
  const base = file ? path.dirname(root) : root;

  const totals = zero();
  const languages = new Map<string, LanguageStats>();
  const folders = new Map<string, FolderStats & { byLanguage: Map<string, number> }>();
  const files: FileStats[] = [];
  const skipped = { binary: 0, large: 0, generated: 0, other: 0 };
  const other = new Map<string, number>();

  let done = 0;
  let said = 0;
  const say = (force = false) => {
    const now = Date.now();
    if (!o.progress || (!force && now - said < (o.progressEvery ?? 150))) return;
    said = now;
    o.progress(done, listed.length);
  };

  const one = async (rel: string) => {
    const name = rel.slice(rel.lastIndexOf('/') + 1);
    if (isGenerated(name)) {
      skipped.generated++;
      return;
    }
    const full = path.join(base, ...rel.split('/'));
    let size: number;
    try {
      const s = await stat(full);
      if (!s.isFile()) return;
      size = s.size;
    } catch {
      return;
    }
    if (size > maxBytes) {
      skipped.large++;
      return;
    }
    let lang = languageOf(name);
    let bytes: Buffer;
    try {
      bytes = await readFile(full);
    } catch {
      return;
    }
    if (bytes.subarray(0, SNIFF).includes(0)) {
      skipped.binary++;
      return;
    }
    const text = bytes.toString('utf8');
    if (!lang && !extensionOf(name)) lang = languageOfShebang(text.slice(0, 200).split('\n')[0]);
    if (!lang) {
      skipped.other++;
      const ext = extensionOf(name);
      other.set(ext, (other.get(ext) ?? 0) + 1);
      return;
    }
    record(rel, lang, { ...countLines(text, lang.syntax), bytes: bytes.length });
  };

  const record = (rel: string, lang: Language, c: { lines: number; code: number; comments: number; blanks: number; bytes: number }) => {
    add(totals, c);
    let l = languages.get(lang.name);
    if (!l) languages.set(lang.name, (l = { name: lang.name, color: lang.color, ...zero() }));
    add(l, c);
    const slash = rel.indexOf('/');
    const top = file || slash < 0 ? '' : rel.slice(0, slash);
    let f = folders.get(top);
    if (!f) folders.set(top, (f = { name: top, languages: [], byLanguage: new Map(), ...zero() }));
    add(f, c);
    f.byLanguage.set(lang.name, (f.byLanguage.get(lang.name) ?? 0) + c.code);
    files.push({ path: rel, language: lang.name, ...c });
  };

  // A few readers at once, in the listed order.
  let next = 0;
  const reader = async () => {
    while (next < listed.length) {
      if (o.signal?.aborted) return;
      const rel = listed[next++];
      await one(rel);
      done++;
      say();
    }
  };
  await Promise.all(Array.from({ length: Math.min(READERS, listed.length) }, reader));
  if (o.signal?.aborted) throw new Error('Cancelled.');
  say(true);

  files.sort((a, b) => b.lines - a.lines || a.path.localeCompare(b.path));
  return {
    root,
    file,
    git,
    totals,
    languages: [...languages.values()].sort(byCode),
    folders: [...folders.values()]
      .map(({ byLanguage, ...f }) => ({
        ...f,
        languages: [...byLanguage].map(([name, code]) => ({ name, code })).sort((a, b) => b.code - a.code || a.name.localeCompare(b.name)),
      }))
      .sort(byCode),
    largest: files.slice(0, LARGEST),
    skipped: {
      ...skipped,
      otherKinds: [...other]
        .map(([ext, files]) => ({ ext, files }))
        .sort((a, b) => b.files - a.files || a.ext.localeCompare(b.ext))
        .slice(0, 8),
    },
    truncated,
    took: Date.now() - began,
  };
}

/** The files git has, and the ones it doesn't ignore, from `root` with `/`;
 * null when it's not in a repository, or there's no git. */
function gitFiles(host: Host, root: string, signal?: AbortSignal): Promise<string[] | null> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    let child: ReturnType<Host['spawn']>;
    try {
      child = host.spawn('git', ['-C', root, 'ls-files', '-z', '--cached', '--others', '--exclude-standard'], { stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      resolve(null);
      return;
    }
    const stop = () => child.kill();
    signal?.addEventListener('abort', stop, { once: true });
    const timer = setTimeout(stop, 30_000);
    child.stdout?.on('data', (d: Buffer) => chunks.push(d));
    child.on('error', () => {
      clearTimeout(timer);
      resolve(null);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      signal?.removeEventListener('abort', stop);
      if (code !== 0) return resolve(null);
      // A file both staged and changed is listed once; a deleted one is let
      // be when it's read.
      resolve([...new Set(Buffer.concat(chunks).toString('utf8').split('\0').filter(Boolean))]);
    });
  });
}

/** Every file under `root` but in the folders tools make, from it with `/`. */
async function walk(root: string, max: number, signal?: AbortSignal): Promise<string[]> {
  const found: string[] = [];
  const dirs = [''];
  while (dirs.length && found.length < max && !signal?.aborted) {
    const rel = dirs.shift()!;
    let entries: import('node:fs').Dirent[];
    try {
      entries = await readdir(path.join(root, ...rel.split('/').filter(Boolean)), { withFileTypes: true });
    } catch {
      continue;
    }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      const p = rel ? `${rel}/${e.name}` : e.name;
      if (e.isFile()) found.push(p);
      else if (e.isDirectory() && !SKIP.has(e.name) && (!e.name.startsWith('.') || e.name === '.github')) dirs.push(p);
    }
  }
  return found.slice(0, max);
}
