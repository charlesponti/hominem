import { z } from 'zod'

import { createCommand } from '../../command-factory'
import { logout } from '@/utils/auth'

export default createCommand({
  name: 'auth logout',
  summary: 'Logout and clear tokens',
  description: 'Deletes locally stored auth credentials.',
  argNames: [],
  args: z.object({}),
  flags: z.object({}),
  outputSchema: z.object({
    loggedOut: z.literal(true)
  }),
  async run() {
    await logout()
    return {
      loggedOut: true
    }
  }
})
