import { Command } from '@oclif/core'

export abstract class JsonCommand extends Command {
  static enableJsonFlag = true
}