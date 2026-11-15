// The client part: the Code Stats window. The files are read and counted by
// the server part, where the project is.

import { mount } from '@hyperpane/sdk/client';
import { NodeMessage } from '@hyperpane/ui';
import { CodeStats } from './CodeStats.tsx';

mount((host) =>
  host.view.type === 'node' && host.view.kind === 'codestats' ? <CodeStats /> : <NodeMessage error>Code Stats has no “{host.view.type}” view here.</NodeMessage>,
);
