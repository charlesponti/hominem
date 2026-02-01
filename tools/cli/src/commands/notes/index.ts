import { Command } from 'commander';

import { rewriteCommand } from './rewrite';

export const command = new Command('notes')
  .description('Manage notes and import content from various sources')
  .addCommand(rewriteCommand);

export default command;
