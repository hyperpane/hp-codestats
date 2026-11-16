// Counting a folder through the server part: by language, by folder, the
// longest files, what isn't counted; git's files in a repository (ignored
// ones left out); a path in the project or a full one; a single file.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';
import { stream, testHost } from '@hyperpane/sdk/testing';
import { make } from '../../src/server/plugin.ts';
import type { CountEvent, Stats } from '../../src/shared/index.ts';

let git = true;
try {
  execFileSync('git', ['--version'], { stdio: 'ignore' });
} catch {
  git = false;
}

function project() {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'codestats-'));
  const host = testHost({ id: 'codestats', projects: [{ id: 'p1', name: 'app', folder: dir }] });
  const plugin = make({ maxBytes: 1000 })(host);
  const write = (rel: string, text: string | Buffer) => {
    mkdirSync(path.dirname(path.join(dir, rel)), { recursive: true });
    writeFileSync(path.join(dir, rel), text);
  };
  const count = async (at?: string) => {
    const s = stream<CountEvent>(plugin, { op: 'count', project: 'p1', path: at });
    const ended = await s.end;
    if (ended) throw new Error(ended);
    const done = s.events.find((e) => e.type === 'done');
    assert.ok(done && done.type === 'done');
    return done.stats as Stats;
  };
  return { dir, write, count };
}

function sample(p: ReturnType<typeof project>) {
  p.write('src/a.ts', '// hi\nexport const a = 1;\n\nexport const b = 2;\n');
  p.write('src/b.py', '# x\nprint(1)\n');
  p.write('README.md', '# App\n\nText.\n');
  p.write('bin/run', '#!/usr/bin/env bash\necho hi\n');
  p.write('package-lock.json', '{}\n');
  p.write('logo.png', Buffer.from([0x89, 0x50, 0, 0, 1, 2]));
  p.write('big.ts', 'x();\n'.repeat(400));
  p.write('notes.xyz', 'what\n');
  p.write('node_modules/dep/index.js', 'module.exports = 1;\n');
}

test('counts by language and folder, and says what it left out', async () => {
  const p = project();
  sample(p);
  const s = await p.count();
  assert.equal(s.root, p.dir);
  assert.equal(s.git, false);
  assert.deepEqual(
    s.languages.map((l) => [l.name, l.files, l.code, l.comments, l.blanks]),
    // By code, then lines; the #! line is a comment.
    [
      ['TypeScript', 1, 2, 1, 1],
      ['Markdown', 1, 2, 0, 1],
      ['Python', 1, 1, 1, 0],
      ['Shell', 1, 1, 1, 0],
    ],
  );
  assert.deepEqual(s.totals, { files: 4, lines: 11, code: 6, comments: 3, blanks: 2, bytes: s.totals.bytes });
  assert.deepEqual(
    s.folders.map((f) => [f.name, f.files, f.code]),
    [
      ['src', 2, 3],
      ['', 1, 2],
      ['bin', 1, 1],
    ],
  );
  assert.equal(s.largest[0].path, 'src/a.ts');
  assert.deepEqual({ ...s.skipped, otherKinds: undefined }, { binary: 1, large: 1, generated: 1, other: 1, otherKinds: undefined });
  assert.deepEqual(s.skipped.otherKinds, [{ ext: 'xyz', files: 1 }]);
});

test('in a repository: git’s files, not the ignored ones', { skip: !git }, async () => {
  const p = project();
  sample(p);
  p.write('.gitignore', 'ignored/\nnode_modules/\n');
  p.write('ignored/x.ts', 'a();\n');
  execFileSync('git', ['init', '-q'], { cwd: p.dir });
  const s = await p.count();
  assert.equal(s.git, true);
  assert.ok(!s.largest.some((f) => f.path.startsWith('ignored/') || f.path.startsWith('node_modules/')));
  assert.ok(s.languages.some((l) => l.name === 'Git config'));
});

test('a folder in the project, a full path, a single file', async () => {
  const p = project();
  sample(p);
  const src = await p.count('src');
  assert.equal(src.root, path.join(p.dir, 'src'));
  assert.equal(src.totals.files, 2);
  const full = await p.count(path.join(p.dir, 'bin'));
  assert.deepEqual(
    full.languages.map((l) => l.name),
    ['Shell'],
  );
  const one = await p.count('src/a.ts');
  assert.equal(one.file, true);
  assert.deepEqual([one.totals.files, one.largest[0].path], [1, 'a.ts']);
});

test('a path that isn’t there says so', async () => {
  const p = project();
  await assert.rejects(p.count('nope'), /isn’t there/);
});
