#! /usr/bin/env bun

import './env.ts'

import { Command } from 'commander'
import { command as aiCommand } from './commands/ai'
import authCommand from './commands/auth'
import convertCommand from './commands/convert'
import { command as financeCommand } from './commands/finance'
import { command as initCommand } from './commands/init'
import { command as notesNotesCommand } from './commands/notes'
import { command as notionCommand } from './commands/notion'
import { command as notesCommand } from './commands/possessions.js'
import { command as toolsCommand } from './commands/tools'

async function init() {
  const program = new Command()

  program.version('1.0.0').description('Collection of useful tools')

  program.addCommand(authCommand)
  program.addCommand(initCommand)
  program.addCommand(aiCommand)
  program.addCommand(notesCommand)
  program.addCommand(notesNotesCommand)
  program.addCommand(toolsCommand)
  program.addCommand(convertCommand)
  program.addCommand(financeCommand)
  program.addCommand(notionCommand)

  program.parse(process.argv)
}

init().catch((error) => {
  console.error('Error initializing the application:', error)
  process.exit(1)
})
