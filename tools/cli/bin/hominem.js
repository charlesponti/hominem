#!/usr/bin/env node

import { execute } from '@oclif/core';

await execute({ development: false, dir: new URL('..', import.meta.url).pathname });
