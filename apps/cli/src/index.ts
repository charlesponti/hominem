#! /usr/bin/env bun

import './env.ts'

import { Command } from 'commander'
import { command as aiCommand } from './commands/ai'
import authCommand from './commands/auth'
import convertCommand from './commands/convert'
import { command as financeCommand } from './commands/finance'
import { command as initCommand } from './commands/init'
import { command as notesCommand } from './commands/possessions.js'
import thothCommand from './commands/thoth'
import { command as toolsCommand } from './commands/tools'
import { initDb } from './db/index'

async function init() {
  await initDb()
  const program = new Command()

  program.version('1.0.0').description('Collection of useful tools')

  program.addCommand(authCommand)
  program.addCommand(initCommand)
  program.addCommand(aiCommand)
  program.addCommand(notesCommand)
  program.addCommand(thothCommand)
  program.addCommand(toolsCommand)
  program.addCommand(convertCommand)
  program.addCommand(financeCommand)

  program.parse(process.argv)
}

init().catch((error) => {
  console.error('Error initializing the application:', error)
  process.exit(1)
})
