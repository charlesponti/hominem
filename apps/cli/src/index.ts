#! /usr/bin/env bun

import { Command } from 'commander'
import 'dotenv/config'

import { command as aiCommand } from './ai/index.ts'
import { command as csvToJSONCommand } from './commands/csv-to-json.ts'
import { program as flattenDirectory } from './commands/flatten-directory.ts'
import scrapeCommand from './commands/scraper/scrape.ts'
import thothCommand from './commands/thoth'
import financeCommand from './finance/index.ts'
import googleCommand from './google/cli.js'

const program = new Command()

program.version('1.0.0').description('Collection of useful tools')

program.addCommand(scrapeCommand)
program.addCommand(aiCommand)
program.addCommand(financeCommand)
program.addCommand(googleCommand)
program.addCommand(thothCommand)
program.addCommand(flattenDirectory)
program.addCommand(csvToJSONCommand)

program.parse(Bun.argv)
