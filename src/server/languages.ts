// The languages it knows: each one's name, color (GitHub's, where it has
// one), the extensions and file names that are it, and how it writes
// comments and strings. A file is known by its name first, then its
// extension, then a `#!` line.

import type { Syntax } from './count.ts';

export interface Language {
  name: string;
  color: string;
  syntax: Syntax;
}

const C: Syntax = { line: ['//'], block: [['/*', '*/']], quotes: ['"', "'"] };
const JS: Syntax = { line: ['//'], block: [['/*', '*/']], quotes: ['"', "'", '`'] };
const NESTED: Syntax = { line: ['//'], block: [['/*', '*/']], nested: true, quotes: ['"'] };
const HASH: Syntax = { line: ['#'], quotes: ['"', "'"] };
const PYTHON: Syntax = { line: ['#'], quotes: ['"""', "'''", '"', "'"] };
const SQL: Syntax = { line: ['--'], block: [['/*', '*/']], quotes: ['"', "'"] };
const CSS: Syntax = { block: [['/*', '*/']], quotes: ['"', "'"] };
const SCSS: Syntax = { line: ['//'], block: [['/*', '*/']], quotes: ['"', "'"] };
const MARKUP: Syntax = { block: [['<!--', '-->']] };
const COMPONENT: Syntax = { line: ['//'], block: [['<!--', '-->'], ['/*', '*/']], quotes: ['"', "'", '`'] };
const DATA: Syntax = { quotes: ['"'] };
const TEXT: Syntax = {};
const LISP: Syntax = { line: [';'], quotes: ['"'] };
const ML: Syntax = { block: [['(*', '*)']], nested: true, quotes: ['"'] };
const HASKELL: Syntax = { line: ['--'], block: [['{-', '-}']], nested: true, quotes: ['"'] };

// name, color, syntax, extensions, file names.
const TABLE: [string, string, Syntax, string[], string[]?][] = [
  ['TypeScript', '#3178c6', JS, ['ts', 'mts', 'cts']],
  ['TSX', '#3178c6', JS, ['tsx']],
  ['JavaScript', '#f1e05a', JS, ['js', 'mjs', 'cjs']],
  ['JSX', '#f1e05a', JS, ['jsx']],
  ['Python', '#3572a5', PYTHON, ['py', 'pyi', 'pyw']],
  ['Rust', '#dea584', NESTED, ['rs']],
  ['Go', '#00add8', { ...C, quotes: ['"', "'", '`'] }, ['go']],
  ['C', '#555555', C, ['c', 'h']],
  ['C++', '#f34b7d', C, ['cpp', 'cc', 'cxx', 'c++', 'hpp', 'hh', 'hxx', 'h++', 'ipp', 'tpp', 'inl']],
  ['C#', '#178600', C, ['cs', 'csx']],
  ['Objective-C', '#438eff', C, ['m']],
  ['Objective-C++', '#6866fb', C, ['mm']],
  ['Java', '#b07219', C, ['java']],
  ['Kotlin', '#a97bff', { ...NESTED, quotes: ['"""', '"', "'"] }, ['kt', 'kts']],
  ['Scala', '#c22d40', { ...NESTED, quotes: ['"""', '"', "'"] }, ['scala', 'sc']],
  ['Groovy', '#4298b8', C, ['groovy', 'gradle']],
  ['Swift', '#f05138', { ...NESTED, quotes: ['"""', '"'] }, ['swift']],
  ['Dart', '#00b4ab', { ...C, quotes: ["'''", '"""', '"', "'"] }, ['dart']],
  ['Zig', '#ec915c', { line: ['//'], quotes: ['"'] }, ['zig']],
  ['PHP', '#4f5d95', { line: ['//', '#'], block: [['/*', '*/']], quotes: ['"', "'"] }, ['php', 'phtml']],
  ['Ruby', '#701516', HASH, ['rb', 'rake', 'gemspec', 'ru'], ['Gemfile', 'Rakefile', 'Podfile', 'Fastfile', 'Vagrantfile', 'Brewfile']],
  ['Perl', '#0298c3', HASH, ['pl', 'pm', 't']],
  ['Lua', '#000080', { line: ['--'], block: [['--[[', ']]']], quotes: ['"', "'"] }, ['lua']],
  ['R', '#198ce7', HASH, ['r', 'rmd']],
  ['Julia', '#a270ba', { line: ['#'], block: [['#=', '=#']], nested: true, quotes: ['"""', '"'] }, ['jl']],
  ['Nim', '#ffc200', { line: ['#'], block: [['#[', ']#']], nested: true, quotes: ['"""', '"'] }, ['nim', 'nims']],
  ['Elixir', '#6e4a7e', { line: ['#'], quotes: ['"""', '"', "'"] }, ['ex', 'exs']],
  ['Erlang', '#b83998', { line: ['%'], quotes: ['"'] }, ['erl', 'hrl']],
  ['Haskell', '#5e5086', HASKELL, ['hs', 'lhs']],
  ['Elm', '#60b5cc', HASKELL, ['elm']],
  ['OCaml', '#ef7a08', ML, ['ml', 'mli']],
  ['F#', '#b845fc', { line: ['//'], block: [['(*', '*)']], quotes: ['"'] }, ['fs', 'fsi', 'fsx']],
  ['Clojure', '#db5855', LISP, ['clj', 'cljs', 'cljc', 'edn']],
  ['Lisp', '#3fb68b', { ...LISP, block: [['#|', '|#']] }, ['lisp', 'lsp', 'cl', 'el', 'scm', 'ss', 'rkt']],
  ['Visual Basic', '#945db7', { line: ["'"], quotes: ['"'] }, ['vb', 'vbs', 'bas']],
  ['Fortran', '#4d41b1', { line: ['!'], quotes: ['"', "'"] }, ['f', 'f90', 'f95', 'f03', 'for']],
  ['Assembly', '#6e4c13', { line: [';', '#', '//'], quotes: ['"'] }, ['asm', 's', 'nasm']],
  ['Solidity', '#aa6746', C, ['sol']],
  ['V', '#4f87c4', NESTED, ['v']],
  ['Crystal', '#000100', HASH, ['cr']],
  ['GLSL', '#5686a5', C, ['glsl', 'vert', 'frag', 'geom', 'comp']],
  ['HLSL', '#aace60', C, ['hlsl', 'fx']],
  ['WGSL', '#1a5e9a', NESTED, ['wgsl']],
  ['Metal', '#8f14e9', C, ['metal']],
  ['CUDA', '#3a4e3a', C, ['cu', 'cuh']],
  ['Shell', '#89e051', HASH, ['sh', 'bash', 'zsh', 'ksh', 'fish', 'command'], ['.bashrc', '.zshrc', '.profile', '.bash_profile', '.zprofile']],
  ['PowerShell', '#012456', { line: ['#'], block: [['<#', '#>']], quotes: ['"', "'"] }, ['ps1', 'psm1', 'psd1']],
  ['Batch', '#c1f12e', { line: ['::', 'REM ', 'rem ', '@REM ', '@rem '], quotes: ['"'] }, ['bat', 'cmd']],
  ['HTML', '#e34c26', MARKUP, ['html', 'htm', 'xhtml']],
  ['XML', '#0060ac', MARKUP, ['xml', 'xsd', 'xsl', 'xslt', 'plist', 'csproj', 'fsproj', 'vbproj', 'props', 'targets', 'svg', 'xaml', 'storyboard', 'xib']],
  ['Vue', '#41b883', COMPONENT, ['vue']],
  ['Svelte', '#ff3e00', COMPONENT, ['svelte']],
  ['Astro', '#ff5a03', COMPONENT, ['astro']],
  ['CSS', '#663399', CSS, ['css', 'pcss', 'postcss']],
  ['SCSS', '#c6538c', SCSS, ['scss']],
  ['Sass', '#a53b70', SCSS, ['sass']],
  ['Less', '#1d365d', SCSS, ['less']],
  ['Stylus', '#ff6347', SCSS, ['styl']],
  ['SQL', '#e38c00', SQL, ['sql', 'psql', 'pgsql', 'mysql']],
  ['Prisma', '#0c344b', { line: ['//'], quotes: ['"'] }, ['prisma']],
  ['GraphQL', '#e10098', { line: ['#'], quotes: ['"""', '"'] }, ['graphql', 'gql']],
  ['Protocol Buffers', '#4a90e2', C, ['proto']],
  ['Terraform', '#7b42bc', { line: ['#', '//'], block: [['/*', '*/']], quotes: ['"'] }, ['tf', 'tfvars', 'hcl']],
  ['Nix', '#7e7eff', { line: ['#'], block: [['/*', '*/']], quotes: ['"', "''"] }, ['nix']],
  ['Dockerfile', '#384d54', HASH, ['dockerfile', 'containerfile'], ['Dockerfile', 'Containerfile']],
  ['Makefile', '#427819', HASH, ['mk', 'mak'], ['Makefile', 'makefile', 'GNUmakefile']],
  ['CMake', '#da3434', { line: ['#'], quotes: ['"'] }, ['cmake'], ['CMakeLists.txt']],
  ['Starlark', '#76d275', PYTHON, ['bzl', 'star'], ['BUILD', 'BUILD.bazel', 'WORKSPACE', 'Tiltfile']],
  ['YAML', '#cb171e', HASH, ['yml', 'yaml']],
  ['TOML', '#9c4221', HASH, ['toml']],
  ['INI', '#d1dbe0', { line: [';', '#'] }, ['ini', 'cfg', 'conf', 'properties', 'editorconfig'], ['.editorconfig', '.gitconfig']],
  ['JSON', '#cbcb41', DATA, ['json', 'jsonc', 'json5', 'webmanifest', 'har', 'geojson', 'ipynb']],
  ['CSV', '#237346', TEXT, ['csv', 'tsv']],
  ['Markdown', '#083fa1', MARKUP, ['md', 'markdown', 'mdx', 'mdc']],
  ['reStructuredText', '#141414', TEXT, ['rst']],
  ['AsciiDoc', '#73a0c5', { line: ['//'] }, ['adoc', 'asciidoc']],
  ['TeX', '#3d6117', { line: ['%'] }, ['tex', 'sty', 'cls', 'bib']],
  ['Plain Text', '#8b949e', TEXT, ['txt', 'text'], ['LICENSE', 'LICENCE', 'NOTICE', 'AUTHORS', 'CHANGELOG', 'COPYING']],
  ['Git config', '#f44d27', HASH, [], ['.gitignore', '.gitattributes', '.gitmodules', '.dockerignore', '.npmignore', '.prettierignore', '.eslintignore']],
  ['Handlebars', '#f7931e', { block: [['{{!--', '--}}'], ['{{!', '}}'], ['<!--', '-->']] }, ['hbs', 'handlebars', 'mustache']],
  ['Jinja', '#a52a22', { block: [['{#', '#}'], ['<!--', '-->']] }, ['jinja', 'jinja2', 'j2', 'njk']],
  ['Twig', '#c1d026', { block: [['{#', '#}'], ['<!--', '-->']] }, ['twig']],
  ['Razor', '#512be4', { block: [['@*', '*@'], ['<!--', '-->']] }, ['cshtml', 'razor']],
  ['Pug', '#a86454', { line: ['//-', '//'] }, ['pug', 'jade']],
  ['Haml', '#ece2a9', { line: ['-#', '/'] }, ['haml']],
  ['Smali', '#a0a0a0', { line: ['#'], quotes: ['"'] }, ['smali']],
  ['Gherkin', '#5b2063', { line: ['#'] }, ['feature']],
  ['Vim script', '#199f4b', { line: ['"'] }, ['vim'], ['.vimrc']],
  ['Awk', '#c30e9b', HASH, ['awk']],
  ['D', '#ba595e', { line: ['//'], block: [['/*', '*/'], ['/+', '+/']], quotes: ['"', '`'] }, ['d']],
  ['Pascal', '#e3f171', { line: ['//'], block: [['{', '}'], ['(*', '*)']], quotes: ["'"] }, ['pas', 'pp', 'dpr', 'lpr']],
  ['Ada', '#02f88c', { line: ['--'], quotes: ['"'] }, ['ada', 'adb', 'ads']],
  ['COBOL', '#005ca5', { line: ['*>'], quotes: ['"', "'"] }, ['cob', 'cbl', 'cpy']],
  ['Hare', '#9d7424', { line: ['//'], quotes: ['"'] }, ['ha']],
  ['Odin', '#60affe', NESTED, ['odin']],
  ['Gleam', '#ffaff3', { line: ['//'], quotes: ['"'] }, ['gleam']],
  ['Mojo', '#ff4c1f', PYTHON, ['mojo']],
  ['Cairo', '#ff4a48', { line: ['//'], quotes: ['"'] }, ['cairo']],
  ['Move', '#4a137a', C, ['move']],
  ['Typst', '#239dad', { line: ['//'], block: [['/*', '*/']] }, ['typ']],
];

const BY_NAME = new Map<string, Language>();
const BY_EXT = new Map<string, Language>();
const BY_FILE = new Map<string, Language>();
for (const [name, color, syntax, exts, files] of TABLE) {
  const lang = { name, color, syntax };
  BY_NAME.set(name, lang);
  for (const e of exts) BY_EXT.set(e, lang);
  for (const f of files ?? []) BY_FILE.set(f, lang);
}

export const languageNamed = (name: string) => BY_NAME.get(name);

/** A file's extension, lowercase ('' for none, and for `.gitignore`). */
export function extensionOf(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot > 0 ? name.slice(dot + 1).toLowerCase() : '';
}

/** The language of a file by its name, or null. `Dockerfile.dev` and
 * `Makefile.inc` count as their kind. */
export function languageOf(name: string): Language | null {
  const exact = BY_FILE.get(name);
  if (exact) return exact;
  const ext = extensionOf(name);
  if (ext) {
    const lang = BY_EXT.get(ext);
    if (lang) return lang;
  }
  const head = name.split('.')[0];
  if (head === 'Dockerfile' || head === 'Containerfile') return BY_NAME.get('Dockerfile')!;
  if (head === 'Makefile') return BY_NAME.get('Makefile')!;
  return null;
}

/** The language a `#!` line names (`#!/usr/bin/env node`), or null. */
export function languageOfShebang(firstLine: string): Language | null {
  if (!firstLine.startsWith('#!')) return null;
  const words = firstLine.slice(2).trim().split(/\s+/);
  let program = (words[0] ?? '').split('/').pop() ?? '';
  if (program === 'env') program = words.slice(1).find((w) => !w.startsWith('-')) ?? '';
  program = program.replace(/[\d.]+$/, '');
  const name = SHEBANG[program];
  return name ? BY_NAME.get(name)! : null;
}

const SHEBANG: Record<string, string> = {
  sh: 'Shell',
  bash: 'Shell',
  zsh: 'Shell',
  ksh: 'Shell',
  dash: 'Shell',
  fish: 'Shell',
  node: 'JavaScript',
  deno: 'TypeScript',
  bun: 'TypeScript',
  tsx: 'TypeScript',
  'ts-node': 'TypeScript',
  python: 'Python',
  ruby: 'Ruby',
  perl: 'Perl',
  php: 'PHP',
  lua: 'Lua',
  Rscript: 'R',
  julia: 'Julia',
  elixir: 'Elixir',
  awk: 'Awk',
  pwsh: 'PowerShell',
};

/** Files made by tools, not written: lock files, minified files, source maps. */
export function isGenerated(name: string): boolean {
  return LOCKS.has(name) || /\.min\.(js|css|mjs)$/i.test(name) || /\.(map|lock)$/i.test(name) || /[.-]bundle\.js$/i.test(name);
}

const LOCKS = new Set([
  'package-lock.json',
  'npm-shrinkwrap.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
  'bun.lock',
  'composer.lock',
  'Gemfile.lock',
  'Podfile.lock',
  'poetry.lock',
  'Pipfile.lock',
  'uv.lock',
  'go.sum',
  'flake.lock',
  'pubspec.lock',
  'mix.lock',
  'Package.resolved',
  'packages.lock.json',
  'deno.lock',
]);
