// A table of counts: a name and its numbers, sorted by a column (click its
// head; again for the other way), with each row's share of the code drawn
// as a bar. A narrow window keeps the name, the code and the share.

import { useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { cn, styles, useTouch } from '@hyperpane/ui';
import { formatSize } from '@hyperpane/sdk/client';
import { number, percent } from './format.ts';

export interface Column<R> {
  id: string;
  label: string;
  value(r: R): number;
  /** Shown instead of the number. */
  show?(r: R): string;
  title?: string;
}

export interface Row {
  key: string;
  name: React.ReactNode;
  /** Sorted by, for the name column. */
  sortName: string;
  files?: number;
  code: number;
  comments: number;
  blanks: number;
  lines: number;
  bytes: number;
  /** A dot of its color. */
  color?: string;
  /** Under the name: a bar of its parts (each part's color and share). */
  parts?: { color: string; share: number; title: string }[];
  title?: string;
  onOpen?(): void;
}

const GRID =
  'grid grid-cols-[minmax(8rem,1fr)_repeat(6,minmax(3.5rem,auto))_6.5rem] items-center gap-x-3 px-2 max-sm:grid-cols-[minmax(0,1fr)_minmax(3.5rem,auto)_6.5rem]';
/** A column a narrow window does without. */
const WIDE_ONLY = (id: string) => id !== 'code' && 'max-sm:hidden';

const COLUMNS: Column<Row>[] = [
  { id: 'files', label: 'Files', value: (r) => r.files ?? 0 },
  { id: 'code', label: 'Code', value: (r) => r.code, title: 'Lines with code on them' },
  { id: 'comments', label: 'Comments', value: (r) => r.comments, title: 'Lines with only a comment' },
  { id: 'blanks', label: 'Blank', value: (r) => r.blanks, title: 'Empty lines' },
  { id: 'lines', label: 'Lines', value: (r) => r.lines, title: 'Every line' },
  { id: 'bytes', label: 'Size', value: (r) => r.bytes, show: (r) => formatSize(r.bytes) },
];

export function Table({ rows, total, nameLabel, noFiles }: { rows: Row[]; total: number; nameLabel: string; noFiles?: boolean }) {
  const [sort, setSort] = useState<{ by: string; up: boolean }>({ by: 'code', up: false });
  const touch = useTouch();
  const col = COLUMNS.find((c) => c.id === sort.by);
  const sorted = [...rows].sort((a, b) => {
    const d = col ? col.value(a) - col.value(b) : a.sortName.localeCompare(b.sortName);
    return (sort.up ? d : -d) || a.sortName.localeCompare(b.sortName);
  });
  const head = (id: string, label: string, title?: string, end = true) => (
    <button
      type="button"
      title={title}
      onClick={() => setSort((s) => ({ by: id, up: s.by === id ? !s.up : id === 'name' }))}
      className={cn(
        'flex h-6 items-center gap-0.5 uppercase hover:text-[var(--node-fg)]',
        end && 'justify-end',
        sort.by === id && 'text-[var(--node-fg)]',
        styles.focusRing,
      )}
    >
      {label}
      {sort.by === id && (sort.up ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />)}
    </button>
  );

  return (
    <div className="sm:min-w-[38rem]">
      <div
        className={cn(
          GRID,
          styles.stickyTop,
          'border-b border-[var(--node-border)] bg-[var(--node-bg)] text-[10.5px] font-medium tracking-wide text-[var(--node-muted)]',
        )}
      >
        {head('name', nameLabel, undefined, false)}
        {COLUMNS.map((c) =>
          c.id === 'files' && noFiles ? (
            <span key={c.id} className="max-sm:hidden" />
          ) : (
            <span key={c.id} className={cn(WIDE_ONLY(c.id))}>
              {head(c.id, c.label, c.title)}
            </span>
          ),
        )}
        {head('code', 'Share', 'Share of the code')}
      </div>
      {sorted.map((r) => {
        const share = total ? r.code / total : 0;
        return (
          // biome-ignore lint/a11y/useKeyWithClickEvents: a finger's tap opens the file, as a double-click does; the mouse's click does nothing.
          <div
            key={r.key}
            title={r.title}
            onDoubleClick={r.onOpen}
            // A tap opens it, with a finger.
            onClick={touch ? r.onOpen : undefined}
            className={cn(
              GRID,
              'min-h-7 border-b border-[var(--node-border)]/60 py-1 hover:bg-[var(--node-hover)] touch:min-h-10',
              r.onOpen && 'cursor-default',
            )}
          >
            <span className="flex min-w-0 flex-col gap-1">
              <span className="flex min-w-0 items-center gap-2">
                {r.color && <span className="size-2.5 flex-none rounded-full" style={{ background: r.color }} />}
                <span className="min-w-0 truncate">{r.name}</span>
              </span>
              {r.parts && r.parts.length > 0 && (
                <span className="flex h-1 overflow-hidden rounded-full bg-[var(--node-border)]">
                  {r.parts.map((p, i) => (
                    <span key={i} title={p.title} style={{ width: `${p.share * 100}%`, background: p.color }} />
                  ))}
                </span>
              )}
            </span>
            {COLUMNS.map((c) =>
              c.id === 'files' && noFiles ? (
                <span key={c.id} className="max-sm:hidden" />
              ) : (
                <span
                  key={c.id}
                  className={cn(
                    'text-right tabular-nums',
                    WIDE_ONLY(c.id),
                    c.id === sort.by ? 'text-[var(--node-fg)]' : 'text-[var(--node-muted)]',
                    c.id === 'code' && 'text-[var(--node-fg)]',
                  )}
                >
                  {c.show ? c.show(r) : number(c.value(r))}
                </span>
              ),
            )}
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--node-border)]">
                <span
                  className="block h-full rounded-full"
                  style={{ width: `${Math.max(share * 100, share > 0 ? 2 : 0)}%`, background: r.color ?? 'var(--node-accent)' }}
                />
              </span>
              <span className="w-10 text-right text-[var(--node-muted)] tabular-nums">{percent(share)}</span>
            </span>
          </div>
        );
      })}
    </div>
  );
}
