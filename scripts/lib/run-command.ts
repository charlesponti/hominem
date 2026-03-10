import { spawnSync } from 'node:child_process';

export interface CommandResult {
  code: number | null;
  stderr: string;
  stdout: string;
}

export function runCommand(command: string, args: string[], allowFailure = false): CommandResult {
  const result = spawnSync(command, args, {
    encoding: 'utf-8',
    shell: false,
  });

  if (result.error) {
    if (allowFailure) {
      return {
        code: result.status,
        stderr: result.error.message,
        stdout: '',
      };
    }

    throw result.error;
  }

  const output = {
    code: result.status,
    stderr: result.stderr.trim(),
    stdout: result.stdout.trim(),
  };

  if (!allowFailure && result.status !== 0) {
    throw new Error(
      output.stderr || output.stdout || `${command} exited with code ${String(result.status)}`,
    );
  }

  return output;
}
