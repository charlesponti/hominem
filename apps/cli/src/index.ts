#! /usr/bin/env bun

import './env.ts'

import { Command } from 'commander'
import { command as aiCommand } from './commands/ai/index.ts'
import apiCommand from './commands/api-client'
import convertCommand from './commands/convert'
import { command as csvToJSONCommand } from './commands/csv-to-json.ts'
import financeCommand from './commands/finance/index.ts'
import { program as flattenDirectory } from './commands/flatten-directory.ts'
import { command as initCommand } from './commands/init.ts'
import scrapeCommand from './commands/scraper/scrape.ts'
import serveCommand from './commands/serve/index.ts'
import thothCommand from './commands/thoth'
import { initDb } from './db/index.ts'
import googleCommand from './google/cli.js'

async function init() {
  // Initialize the application
  // This is where you can add any global setup code
  await initDb()
  const program = new Command()

  program.version('1.0.0').description('Collection of useful tools')

  program.addCommand(initCommand)
  program.addCommand(scrapeCommand)
  program.addCommand(aiCommand)
  program.addCommand(financeCommand)
  program.addCommand(googleCommand)
  program.addCommand(thothCommand)
  program.addCommand(flattenDirectory)
  program.addCommand(csvToJSONCommand)
  program.addCommand(convertCommand)
  program.addCommand(serveCommand)
  program.addCommand(apiCommand)

  program.parse(Bun.argv)
}

init().catch((error) => {
  console.error('Error initializing the application:', error)
  process.exit(1)
})
