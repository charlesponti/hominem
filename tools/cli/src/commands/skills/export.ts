import path from 'node:path';

import { Args, Command } from '@oclif/core';

import { copySkillsDirectory } from '@/utils/skills-commands';

const TRANSFER_OPTIONS = {
  sourceNotDirectoryMessage: (source: string) => `failed to read skills directory at ${source}`,
  missingSourceMessage: (source: string) => `failed to read skills directory at ${source}`,
  sourcePath: (cwd: string) => path.resolve(cwd, '.github/skills'),
  destPath: (cwd: string, dest: string) => path.resolve(cwd, dest),
};

export default class SkillsExport extends Command {
  static description = 'Copy the local `.github/skills` folder to another location';
  static summary = 'Copy the local `.github/skills` folder to another location';

  static override args = {
    dest: Args.string({
      name: 'dest',
      required: false,
      description: 'Destination directory',
      default: '.',
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(SkillsExport);
    const result = await copySkillsDirectory(TRANSFER_OPTIONS, process.cwd(), args.dest ?? '.');
    this.log(`Copied ${result.fileCount} files from ${result.source} to ${result.dest}`);
  }
}
