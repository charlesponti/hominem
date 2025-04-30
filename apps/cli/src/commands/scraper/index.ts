import { Command } from 'commander'

import { command as scrapeCommand } from './scrape'

export const command = new Command('scraper')
  .description('Web scraping commands')
  .addCommand(scrapeCommand)

export default command
