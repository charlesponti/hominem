import './setup/base.setup'
import './setup/server-mocks.setup'

import { afterEach } from 'vitest'

import { cleanupApiAuthRedisState, cleanupApiAuthTestState } from './setup/auth-state.cleanup'

afterEach(async () => {
	await cleanupApiAuthTestState()
	await cleanupApiAuthRedisState()
})