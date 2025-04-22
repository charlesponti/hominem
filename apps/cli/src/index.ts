#! /usr/bin/env bun

import './env.ts'

import { Command } from 'commander'
import { command as aiCommand } from './commands/ai'
import authCommand from './commands/auth'
import convertCommand from './commands/convert'
import { command as csvToJSONCommand } from './commands/csv-to-json'
import { command as initCommand } from './commands/init'
import { command as notesCommand } from './commands/possessions.js'
import scrapeCommand from './commands/scraper/scrape'
import thothCommand from './commands/thoth'
import { initDb } from './db/index'

async function init() {
  // Initialize the application
  // This is where you can add any global setup code
  await initDb()
  const program = new Command()

  program.version('1.0.0').description('Collection of useful tools')

  program.addCommand(authCommand)
  program.addCommand(initCommand)
  program.addCommand(scrapeCommand)
  program.addCommand(aiCommand)
  program.addCommand(notesCommand)
  program.addCommand(thothCommand)
  program.addCommand(csvToJSONCommand)
  program.addCommand(convertCommand)

  program.parse(process.argv)
}

init().catch((error) => {
  console.error('Error initializing the application:', error)
  process.exit(1)
})
