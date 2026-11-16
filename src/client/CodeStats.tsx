// The Code Stats window: a folder's code counted. At the top where (the
// project's folder, or the path that came in at its port, or one typed),
// then the totals (files, lines, code, comments, blanks), a bar of its
// languages, and a table: by language, by folder, or the longest files
// (double-click one to open it). Under it what wasn't counted, and why.
//
// Its ports: a path in (a folder or a file: Explorer's, Git's, Editor's),
// and the stats out, as JSON, each time a count ends.

import { useEffect, useState } from 'react';
import { FolderOpen, FolderRoot, Pencil, RefreshCw } from 'lucide-react';
import { basename, formatSize, useData, useHost, useProject } from '@hyperpane/sdk/client';
import { NodeMessage, ToolButton, cn } from '@hyperpane/ui';
import { type CountEvent, type Stats, statsOut } from '../shared/index.ts';
import { compact, duration, number, percent } from './format.ts';
import { type Row, Table } from './Table.tsx';

const ID = 'codestats';
type View = 'languages' | 'folders' | 'files';

export function CodeStats() {
  const host = useHost();
  const project = useProject();
  const data = useData();
  const at = data.path ?? '';
  const [stats, setStats] = useState<Stats | null>(null);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [again, setAgain] = useState(0);
  const [view, setView] = useState<View>('languages');

  // A path at the in-port is the one counted (kept in the window's data, so
  // it stays when the link goes).
  useEffect(
    () =>
      host.ports.onInput<unknown>('path', (value) => {
        if (typeof value === 'string' && value.trim() && value !== host.window?.data.path) host.win.setData('path', value.trim());
      }),
    [host],
  );

  useEffect(() => {
    if (!project) return;
    setProgress({ done: 0, total: 0 });
    setError(null);
    return host.subscribe<CountEvent>(
      ID,
      { op: 'count', project: project.id, path: at || undefined },
      (e) => {
        if (e.type === 'progress') setProgress({ done: e.done, total: e.total });
        else {
          setStats(e.stats);
          setProgress(null);
          host.ports.emit('stats', statsOut(e.stats));
        }
      },
      {
        resume: false,
        onEnd: (e) => {
          if (e) {
            setError(e);
            setProgress(null);
          }
        },
      },
    );
  }, [host, project?.id, at, again]);

  const name = stats ? basename(stats.root) || stats.root : at ? basename(at) : (project?.name ?? '');
  useEffect(() => {
    host.win.setTitle(name ? `Code Stats · ${name}` : 'Code Stats');
  }, [host, name]);

  if (!project) return <NodeMessage>Open a project to count its code</NodeMessage>;

  const folder = project.folder ?? null;
  const shownPath = stats?.root ?? at ?? folder ?? '';
  const inProject = folder && shownPath.startsWith(folder) ? shownPath.slice(folder.length).replace(/^[\\/]/, '') : null;
  const pick = async () => {
    const value = await host.ui.prompt({
      title: 'Count',
      label: 'A folder or a file: a full path, or one from the project’s folder. Empty: the project’s folder.',
      value: at,
      placeholder: folder ?? '',
    });
    if (value !== null) host.win.setData('path', value.trim() || null);
  };

  return (
    <div className="flex h-full flex-col text-xs text-[var(--node-fg)]">
      <div className="flex items-center gap-1 border-b border-[var(--node-border)] px-2 py-1">
        <button
          type="button"
          onClick={() => void pick()}
          title={`${shownPath}\nClick to count another folder`}
          className="group flex h-6 min-w-0 flex-1 items-center gap-1.5 rounded-[5px] px-1 text-left hover:bg-[var(--node-hover)]"
        >
          <FolderOpen className="size-3.5 flex-none text-[var(--node-muted)]" />
          <span className="min-w-0 truncate font-mono">
            {inProject === null ? (
              shownPath
            ) : (
              <>
                <span className="text-[var(--node-muted)]">{project.name}</span>
                {inProject && <span>/{inProject}</span>}
              </>
            )}
          </span>
          <Pencil className="size-3 flex-none text-[var(--node-muted)] opacity-0 group-hover:opacity-100" />
        </button>
        {at && <ToolButton label="Count the project’s folder" icon={FolderRoot} onClick={() => host.win.setData('path', null)} />}
        <ToolButton label="Count again" icon={RefreshCw} disabled={!!progress} onClick={() => setAgain((n) => n + 1)} />
      </div>
      {progress && <Progress {...progress} />}
      {error ? (
        <NodeMessage error>{error}</NodeMessage>
      ) : !stats ? (
        <NodeMessage>Counting</NodeMessage>
      ) : (
        <Body stats={stats} view={view} setView={setView} open={(p) => host.app.openFile(join(stats, p))} stale={!!progress} />
      )}
    </div>
  );
}

/** A file's full path, from the folder counted. */
function join(s: Stats, rel: string) {
  if (s.file) return s.root;
  const sep = s.root.includes('\\') && !s.root.includes('/') ? '\\' : '/';
  return s.root.replace(/[\\/]+$/, '') + sep + rel.split('/').join(sep);
}

function Progress({ done, total }: { done: number; total: number }) {
  return (
    <div className="h-0.5 overflow-hidden bg-[var(--node-border)]" title={total ? `${number(done)} of ${number(total)} files` : 'Listing the files'}>
      <div
        className={cn('h-full bg-[var(--node-accent)] transition-[width] duration-150', !total && 'w-1/4 animate-pulse')}
        style={total ? { width: `${(done / total) * 100}%` } : undefined}
      />
    </div>
  );
}

function Body({ stats, view, setView, open, stale }: { stats: Stats; view: View; setView(v: View): void; open(rel: string): void; stale: boolean }) {
  const t = stats.totals;
  const colors = new Map(stats.languages.map((l) => [l.name, l.color]));
  if (!t.files) {
    return (
      <div className="flex flex-1 flex-col">
        <NodeMessage>{stats.file ? 'This file is in no language it knows, or isn’t text' : 'No code here: no file in a language it knows'}</NodeMessage>
        <Footer stats={stats} />
      </div>
    );
  }

  const rows: Row[] =
    view === 'languages'
      ? stats.languages.map((l) => ({ ...l, key: l.name, sortName: l.name }))
      : view === 'folders'
        ? stats.folders.map((f) => ({
            ...f,
            key: f.name || '.',
            name: f.name ? <span className="font-mono">{f.name}/</span> : <span className="text-[var(--node-muted)] italic">Files right here</span>,
            sortName: f.name,
            parts: f.code
              ? f.languages.map((l) => ({ color: colors.get(l.name) ?? 'var(--node-muted)', share: l.code / f.code, title: `${l.name}: ${number(l.code)}` }))
              : [],
            title: f.languages
              .slice(0, 6)
              .map((l) => `${l.name} ${percent(f.code ? l.code / f.code : 0)}`)
              .join(' · '),
          }))
        : stats.largest.map((f) => ({
            ...f,
            key: f.path,
            name: <span className="font-mono">{f.path}</span>,
            sortName: f.path,
            color: colors.get(f.language),
            title: `${f.path} (${f.language})\nDouble-click to open it`,
            onOpen: () => open(f.path),
          }));

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col transition-opacity', stale && 'opacity-60')}>
      <div className="grid grid-cols-5 gap-px border-b border-[var(--node-border)] bg-[var(--node-border)]">
        <Figure label="Files" value={t.files} />
        <Figure label="Lines" value={t.lines} detail={formatSize(t.bytes)} />
        <Figure label="Code" value={t.code} detail={percent(t.code / t.lines)} strong />
        <Figure label="Comments" value={t.comments} detail={percent(t.comments / t.lines)} />
        <Figure label="Blank" value={t.blanks} detail={percent(t.blanks / t.lines)} />
      </div>
      <Languages stats={stats} />
      <div className="flex items-center gap-1 border-b border-[var(--node-border)] px-2 py-1">
        {(['languages', 'folders', 'files'] as const).map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={view === v}
            disabled={stats.file && v !== 'languages'}
            onClick={() => setView(v)}
            className={cn(
              'h-6 rounded-[5px] px-2 font-medium disabled:opacity-40',
              view === v ? 'bg-[var(--node-hover)] text-[var(--node-fg)]' : 'text-[var(--node-muted)] enabled:hover:text-[var(--node-fg)]',
            )}
          >
            {v === 'languages' ? `Languages ${stats.languages.length}` : v === 'folders' ? `Folders ${stats.folders.length}` : 'Longest files'}
          </button>
        ))}
      </div>
      <div className="min-h-0 flex-1 overflow-auto [scrollbar-gutter:stable]">
        <Table
          key={view}
          rows={rows}
          total={t.code}
          nameLabel={view === 'languages' ? 'Language' : view === 'folders' ? 'Folder' : 'File'}
          noFiles={view === 'files'}
        />
      </div>
      <Footer stats={stats} />
    </div>
  );
}

function Figure({ label, value, detail, strong }: { label: string; value: number; detail?: string; strong?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5 bg-[var(--node-bg)] px-2.5 py-2" title={`${number(value)} ${label.toLowerCase()}`}>
      <span className="text-[10.5px] font-medium tracking-wide text-[var(--node-muted)] uppercase">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span className={cn('truncate text-base tabular-nums', strong ? 'font-semibold' : 'font-medium')}>{compact(value)}</span>
        {detail && <span className="truncate text-[var(--node-muted)] tabular-nums">{detail}</span>}
      </span>
    </div>
  );
}

/** Every language as a part of one bar, by code, with the biggest named
 * under it. */
function Languages({ stats }: { stats: Stats }) {
  const total = stats.totals.code || 1;
  const named = stats.languages.filter((l) => l.code / total >= 0.01).slice(0, 8);
  const rest = stats.languages.length - named.length;
  return (
    <div className="flex flex-col gap-1.5 border-b border-[var(--node-border)] px-2.5 py-2">
      <div className="flex h-2 gap-px overflow-hidden rounded-full bg-[var(--node-border)]">
        {stats.languages.map((l) => (
          <span
            key={l.name}
            title={`${l.name}: ${number(l.code)} lines of code (${percent(l.code / total)})`}
            style={{ width: `${(l.code / total) * 100}%`, background: l.color }}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[var(--node-muted)]">
        {named.map((l) => (
          <span key={l.name} className="flex items-center gap-1.5">
            <span className="size-2 rounded-full" style={{ background: l.color }} />
            <span className="text-[var(--node-fg)]">{l.name}</span>
            <span className="tabular-nums">{percent(l.code / total)}</span>
          </span>
        ))}
        {rest > 0 && <span>and {rest} more</span>}
      </div>
    </div>
  );
}

function Footer({ stats }: { stats: Stats }) {
  const s = stats.skipped;
  const not = [
    s.binary && `${number(s.binary)} binary`,
    s.large && `${number(s.large)} over 2 MB`,
    s.generated && `${number(s.generated)} generated (lock files, minified)`,
    s.other && `${number(s.other)} in no language it knows (${s.otherKinds.map((k) => (k.ext ? `.${k.ext}` : 'no extension')).join(', ')})`,
  ].filter(Boolean);
  return (
    <div className="flex flex-wrap gap-x-1 border-t border-[var(--node-border)] px-2.5 py-1.5 text-[var(--node-muted)]">
      <span>
        {stats.git ? 'The files git has and doesn’t ignore' : stats.file ? 'One file' : 'Every file but in node_modules, build output and the like'}, counted in{' '}
        {duration(stats.took)}.
      </span>
      {stats.truncated && (
        <span className="text-[var(--ansi-3)]">It stopped at {number(stats.totals.files + s.binary + s.large + s.generated + s.other)} files.</span>
      )}
      {not.length > 0 && <span>Not counted: {not.join(', ')}.</span>}
    </div>
  );
}
