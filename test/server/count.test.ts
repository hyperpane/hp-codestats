// Counting a file's lines: code, comments and blanks as each language writes
// them, strings stepped over, nested block comments, and the language of a
// file by its name or its `#!` line.

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { countLines } from '../../src/server/count.ts';
import { isGenerated, languageOf, languageOfShebang } from '../../src/server/languages.ts';

const syntax = (file: string) => languageOf(file)!.syntax;

test('C-like: line and block comments, code with a comment after is code', () => {
  const text = ['// a comment', 'const a = 1; // and one after', '', '/* a block', '   over lines */', 'b(); /* inline */', '   ', '/* one */ c();'].join('\n');
  assert.deepEqual(countLines(text, syntax('a.ts')), { lines: 8, code: 3, comments: 3, blanks: 2 });
});

test('a comment marker in a string isn’t a comment', () => {
  const text = ['const url = "http://example.com"; ', "const s = '/* not a comment';", 'x();', '`template', '// still the template`', 'y();'].join('\n');
  assert.deepEqual(countLines(text, syntax('a.js')), { lines: 6, code: 6, comments: 0, blanks: 0 });
});

test('an escaped quote doesn’t end the string', () => {
  assert.deepEqual(countLines('a = "say \\"/*\\" now"\n// c', syntax('a.c')), { lines: 2, code: 1, comments: 1, blanks: 0 });
});

test('nested block comments in Rust', () => {
  const text = ['/* outer', '/* inner */', 'still outer */', 'fn main() {}'].join('\n');
  assert.deepEqual(countLines(text, syntax('main.rs')), { lines: 4, code: 1, comments: 3, blanks: 0 });
  // In C they don't nest: the first */ ends it.
  assert.deepEqual(countLines(text, syntax('main.c')), { lines: 4, code: 2, comments: 2, blanks: 0 });
});

test('Python: # comments, docstrings over lines are code', () => {
  const text = ['# comment', 'def f():', '    """Docs', '    # not a comment', '    """', '    return 1  # after', ''].join('\n');
  assert.deepEqual(countLines(text, syntax('a.py')), { lines: 6, code: 5, comments: 1, blanks: 0 });
});

test('Lua: --[[ blocks ]] before -- lines', () => {
  const text = ['--[[ block', 'end ]]', '-- line', 'print(1)'].join('\n');
  assert.deepEqual(countLines(text, syntax('a.lua')), { lines: 4, code: 1, comments: 3, blanks: 0 });
});

test('HTML comments, Windows line endings, a missing last newline', () => {
  assert.deepEqual(countLines('<p>\r\n<!-- x -->\r\n\r\n</p>', syntax('a.html')), { lines: 4, code: 2, comments: 1, blanks: 1 });
  assert.deepEqual(countLines('', syntax('a.html')), { lines: 0, code: 0, comments: 0, blanks: 0 });
  assert.deepEqual(countLines('a\n', syntax('a.txt')), { lines: 1, code: 1, comments: 0, blanks: 0 });
});

test('languages by name, extension and #!', () => {
  assert.equal(languageOf('Dockerfile')?.name, 'Dockerfile');
  assert.equal(languageOf('Dockerfile.dev')?.name, 'Dockerfile');
  assert.equal(languageOf('Makefile')?.name, 'Makefile');
  assert.equal(languageOf('App.TSX')?.name, 'TSX');
  assert.equal(languageOf('CMakeLists.txt')?.name, 'CMake');
  assert.equal(languageOf('notes.xyz'), null);
  assert.equal(languageOfShebang('#!/usr/bin/env node')?.name, 'JavaScript');
  assert.equal(languageOfShebang('#!/usr/bin/python3.12 -u')?.name, 'Python');
  assert.equal(languageOfShebang('#!/bin/bash')?.name, 'Shell');
  assert.equal(languageOfShebang('no'), null);
  assert.ok(isGenerated('package-lock.json') && isGenerated('app.min.js') && isGenerated('Cargo.lock') && !isGenerated('app.js'));
});
