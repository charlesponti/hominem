#! /usr/bin/env bun

import './env.ts'

import { Command } from 'commander'
import { command as aiCommand } from './commands/ai'
import authCommand from './commands/auth'
import convertCommand from './commands/convert'
import { command as initCommand } from './commands/init'
import { command as notesCommand } from './commands/notes'
import { command as possessionsCommand } from './commands/possessions'
import { command as toolsCommand } from './commands/tools'

async function init() {
  const program = new Command()

  program.version('1.0.0').description('Collection of useful tools')

  program.addCommand(authCommand)
  program.addCommand(initCommand)
  program.addCommand(aiCommand)
  program.addCommand(possessionsCommand)
  program.addCommand(notesCommand)
  program.addCommand(toolsCommand)
  program.addCommand(convertCommand)

  program.parse(process.argv)
}

init().catch((error) => {
  console.error('Error initializing the application:', error)
  process.exit(1)
})
