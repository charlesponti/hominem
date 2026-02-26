import type { OutputFormat } from './contracts';

import { OUTPUT_FORMATS } from './contracts';

export interface ParseResult {
  commandTokens: string[];
  args: string[];
  flags: Record<string, string | boolean>;
  globals: {
    outputFormat: OutputFormat;
    quiet: boolean;
    verbose: boolean;
    interactive: boolean;
    help: boolean;
  };
}

function isOutputFormat(value: string): value is OutputFormat {
  return (OUTPUT_FORMATS as readonly string[]).includes(value);
}

export function parseArgv(argv: string[]): ParseResult {
  const globals = {
    outputFormat: 'text' as OutputFormat,
    quiet: false,
    verbose: false,
    interactive: false,
    help: false,
  };

  const commandTokens: string[] = [];
  const args: string[] = [];
  const flags: Record<string, string | boolean> = {};

  let commandFinalized = false;

  for (let index = 0; index < argv.length; index += 1) {
    const token = argv[index];

    if (token === '--help' || token === '-h') {
      globals.help = true;
      continue;
    }

    if (token === '--quiet') {
      globals.quiet = true;
      continue;
    }

    if (token === '--verbose') {
      globals.verbose = true;
      continue;
    }

    if (token === '--interactive') {
      globals.interactive = true;
      continue;
    }

    if (token === '--format') {
      const value = argv[index + 1];
      if (value && isOutputFormat(value)) {
        globals.outputFormat = value;
        index += 1;
      }
      continue;
    }

    if (token.startsWith('--format=')) {
      const value = token.split('=')[1];
      if (value && isOutputFormat(value)) {
        globals.outputFormat = value;
      }
      continue;
    }

    if (token.startsWith('--')) {
      commandFinalized = true;
      const [nameRaw, inlineValue] = token.slice(2).split('=');
      const name = nameRaw.trim();

      if (inlineValue) {
        flags[name] = inlineValue;
        continue;
      }

      const next = argv[index + 1];
      if (next && !next.startsWith('-')) {
        flags[name] = next;
        index += 1;
      } else {
        flags[name] = true;
      }
      continue;
    }

    if (!commandFinalized && args.length === 0) {
      commandTokens.push(token);
      continue;
    }

    args.push(token);
  }

  return {
    commandTokens,
    args,
    flags,
    globals,
  };
}
