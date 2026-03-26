import path from 'node:path';

import { Args, Command } from '@oclif/core';

import { copySkillsDirectory } from '@/utils/skills-commands';

const TRANSFER_OPTIONS = {
  sourceNotDirectoryMessage: (source: string) => `source path is not a directory: ${source}`,
  missingSourceMessage: (source: string) => `failed to read skills directory at ${source}`,
  sourcePath: (cwd: string, src: string) => path.resolve(cwd, src),
  destPath: (cwd: string) => path.resolve(cwd, '.github/skills'),
};

export default class SkillsImport extends Command {
  static description = 'Copy skills from another location into `.github/skills`';
  static summary = 'Copy skills from another location into `.github/skills`';

  static override args = {
    src: Args.string({
      name: 'src',
      required: false,
      description: 'Source directory',
      default: '.',
    }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(SkillsImport);
    const result = await copySkillsDirectory(TRANSFER_OPTIONS, process.cwd(), args.src ?? '.');
    this.log(`Copied ${result.fileCount} files from ${result.source} to ${result.dest}`);
  }
}
