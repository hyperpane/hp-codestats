// The server part's calls, apart from main.ts so the tests can make it with
// a test host: `count`, a subscription (how far it is, then the stats) of
// the project's folder, or a folder or file in it or anywhere on the server.

import path from 'node:path';
import { type Host, PluginError, json } from '@hyperpane/sdk/server';
import type { CountEvent } from '../shared/index.ts';
import { type Limits, count } from './stats.ts';

/** The folder or file to count: `path` (from the project's folder when it
 * isn't a full one), else the project's folder. */
export function where(host: Host, project: unknown, at: unknown): string {
  const folder = typeof project === 'string' && project ? host.projectFolder(project) : null;
  const p = typeof at === 'string' ? at.trim() : '';
  if (p && path.isAbsolute(p)) return path.normalize(p);
  if (!folder) throw new PluginError(p ? `${p} isn’t a full path, and this project’s folder is on another server.` : 'This project’s folder is on another server.');
  return p ? path.resolve(folder, p) : folder;
}

export function make(o: Limits = {}) {
  return json((host: Host) => ({
    subscriptions: {
      count: async ({ project, path: at }, out) => {
        const root = where(host, project, at);
        const stats = await count(host, root, {
          ...o,
          signal: out.signal,
          progress: (done, total) => void out.emit({ type: 'progress', done, total } satisfies CountEvent),
        }).catch((e: NodeJS.ErrnoException) => {
          if (e.code === 'ENOENT') throw new PluginError(`${root} isn’t there.`);
          if (e.code === 'EACCES' || e.code === 'EPERM') throw new PluginError(`${root} can’t be read.`);
          throw e;
        });
        out.emit({ type: 'done', stats } satisfies CountEvent);
      },
    },
  }));
}

export const plugin = make();
