// The server part: counts the lines of a project's code where it is, on the
// server.

import { serve } from '@hyperpane/sdk/server';
import { plugin } from './plugin.ts';

serve(plugin);
