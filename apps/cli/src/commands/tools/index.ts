import { Command } from 'commander'
import resumeToJSONCommand from './resume-to-json'

export const command = new Command()

command.name('tools')

command.addCommand(resumeToJSONCommand)
