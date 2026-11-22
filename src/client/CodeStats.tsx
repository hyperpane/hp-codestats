// The Code Stats window: a folder's code counted. At the top where (the
// project's folder, or the path that came in at its port, or one typed),
// then the totals (files, lines, code, comments, blanks), a bar of its
// languages, and a table: by language, by folder, or the longest files
// (double-click one to open it). Under it what wasn't counted, and why.
//
// Its ports: a path in (a folder or a file: Explorer's, Git's, Editor's),
// and the stats out, as JSON, each time a count ends.

import { useEffect, useState } from 'react';
import { CircleAlert, FileQuestion, FolderOpen, FolderRoot, Pencil, RefreshCw } from 'lucide-react';
import { basename, formatSize, useData, useHost, useProject } from '@hyperpane/sdk/client';
import { Empty, NodeButton, Spinner, Tabs, Toolbar, ToolButton, cn } from '@hyperpane/ui';
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

  if (!project) return <Empty bordered={false} className="h-full" icon={<FolderOpen />} title="No project" description="Open a project to count its code." />;

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
      <Toolbar>
        <button
          type="button"
          onClick={() => void pick()}
          title={`${shownPath}\nClick to count another folder`}
          className="group rounded-control flex h-7 min-w-0 flex-1 items-center gap-2 px-2 text-left transition-colors duration-100 hover:bg-[var(--node-hover)] touch:h-9"
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
          <Pencil className="size-3 flex-none text-[var(--node-muted)] opacity-0 group-hover:opacity-100 touch:opacity-100" />
        </button>
        {at && <ToolButton label="Count the project’s folder" icon={FolderRoot} onClick={() => host.win.setData('path', null)} />}
        <ToolButton label="Count again" icon={RefreshCw} disabled={!!progress} onClick={() => setAgain((n) => n + 1)} />
      </Toolbar>
      {progress && <Progress {...progress} />}
      {error ? (
        <Empty
          bordered={false}
          className="flex-1"
          icon={<CircleAlert className="text-[var(--ansi-1)]" />}
          title="Couldn’t count it"
          description={error}
          action={
            <NodeButton onClick={() => setAgain((n) => n + 1)}>
              <RefreshCw />
              Try again
            </NodeButton>
          }
        />
      ) : !stats ? (
        <div className="flex flex-1 items-center justify-center gap-2 text-[var(--node-muted)]">
          <Spinner size="xs" />
          Counting
        </div>
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
        <Empty
          bordered={false}
          className="flex-1"
          icon={<FileQuestion />}
          title="No code here"
          description={stats.file ? 'This file is in no language it knows, or isn’t text.' : 'No file here is in a language it knows.'}
        />
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
      {/* Narrow: files and lines on a line, the three kinds of line under them. */}
      <div className="flex flex-none flex-col gap-3 border-b border-[var(--node-border)] p-3">
        <div className="grid grid-cols-5 gap-x-4 gap-y-3 max-sm:grid-cols-6">
          <Figure label="Files" value={t.files} className="max-sm:col-span-3" />
          <Figure label="Lines" value={t.lines} detail={formatSize(t.bytes)} className="max-sm:col-span-3" />
          <Figure label="Code" value={t.code} detail={percent(t.code / t.lines)} strong className="max-sm:col-span-2" />
          <Figure label="Comments" value={t.comments} detail={percent(t.comments / t.lines)} className="max-sm:col-span-2" />
          <Figure label="Blank" value={t.blanks} detail={percent(t.blanks / t.lines)} className="max-sm:col-span-2" />
        </div>
        <Languages stats={stats} />
      </div>
      {/* The table's head draws the line under these. */}
      <Tabs
        label="Count by"
        value={view}
        onValueChange={setView}
        className="border-b-0 px-2"
        items={[
          { value: 'languages', label: 'Languages', count: stats.languages.length },
          { value: 'folders', label: 'Folders', count: stats.folders.length, disabled: stats.file },
          { value: 'files', label: 'Longest files', disabled: stats.file },
        ]}
      />
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

function Figure({ label, value, detail, strong, className }: { label: string; value: number; detail?: string; strong?: boolean; className?: string }) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1', className)} title={`${number(value)} ${label.toLowerCase()}`}>
      <span className="text-2xs font-medium text-[var(--node-muted)]">{label}</span>
      <span className="flex items-baseline gap-1.5">
        <span className={cn('truncate text-lg tracking-tight tabular-nums', strong ? 'font-semibold' : 'font-medium')}>{compact(value)}</span>
        {detail && <span className="text-2xs truncate text-[var(--node-muted)] tabular-nums">{detail}</span>}
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
    <div className="flex flex-col gap-2">
      <div className="flex h-1.5 gap-px overflow-hidden rounded-full bg-[var(--node-hover)]">
        {stats.languages.map((l) => (
          <span
            key={l.name}
            title={`${l.name}: ${number(l.code)} lines of code (${percent(l.code / total)})`}
            style={{ width: `${(l.code / total) * 100}%`, background: l.color }}
          />
        ))}
      </div>
      <div className="text-2xs flex flex-wrap gap-x-3 gap-y-1 text-[var(--node-muted)]">
        {named.map((l) => (
          <span key={l.name} className="flex items-center gap-1.5">
            <span className="size-1.5 rounded-full" style={{ background: l.color }} />
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
    <div className="text-2xs flex flex-none flex-wrap gap-x-1 border-t border-[var(--node-border)] px-3 py-2 text-[var(--node-muted)]">
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
