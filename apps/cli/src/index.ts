#! /usr/bin/env bun

import './env.ts'

import { Command } from 'commander'
import { command as aiCommand } from './ai/index.ts'
import apiCommand from './commands/api-client'
import convertCommand from './commands/convert'
import { command as csvToJSONCommand } from './commands/csv-to-json.ts'
import { program as flattenDirectory } from './commands/flatten-directory.ts'
import { command as initCommand } from './commands/init.ts'
import scrapeCommand from './commands/scraper/scrape.ts'
import serveCommand from './commands/serve'
import thothCommand from './commands/thoth'
import financeCommand from './finance/index.ts'
import googleCommand from './google/cli.js'

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
