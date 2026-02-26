import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'bun:test'

import { CliError } from '../../../src/v2/errors'
import { invokePluginRpc } from '../../../src/v2/plugin-rpc'
import { loadPluginManifest, resolvePluginEntry } from '../../../src/v2/plugin'

async function createPluginFixture(files: Record<string, string>): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'hominem-plugin-'))
  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(root, relativePath)
    await fs.mkdir(path.dirname(absolutePath), { recursive: true })
    await fs.writeFile(absolutePath, content, 'utf-8')
  }
  return root
}

describe('v2 plugin manifest and rpc', () => {
  it('rejects plugin entries that escape root', async () => {
    const root = await createPluginFixture({
      'hominem.plugin.json': JSON.stringify({
        name: 'escape',
        version: '1.0.0',
        entry: '../outside.js'
      })
    })
    const manifest = await loadPluginManifest(root)

    expect(() => resolvePluginEntry(root, manifest)).toThrow('Plugin entry must stay within plugin root')
  })

  it.skip('invokes plugin over json-rpc child-process boundary', async () => {
    const root = await createPluginFixture({
      'hominem.plugin.json': JSON.stringify({
        name: 'echo',
        version: '1.0.0',
        entry: 'plugin.sh'
      }),
      'plugin.sh': "cat >/dev/null\nprintf '%s\\n' '{\"id\":\"ok\",\"result\":{\"echoedMethod\":\"ping\"}}'"
    })

    const previousRuntime = process.env.HOMINEM_PLUGIN_RUNTIME
    process.env.HOMINEM_PLUGIN_RUNTIME = '/bin/sh'
    let result: Awaited<ReturnType<typeof invokePluginRpc>> | null = null
    try {
      result = await invokePluginRpc({
        pluginRoot: root,
        method: 'ping',
        params: { value: 1 }
      })
    } finally {
      if (previousRuntime === undefined) {
        delete process.env.HOMINEM_PLUGIN_RUNTIME
      } else {
        process.env.HOMINEM_PLUGIN_RUNTIME = previousRuntime
      }
    }

    expect(result).toEqual({ echoedMethod: 'ping' })
  })

  it.skip('maps plugin error envelope to cli error', async () => {
    const root = await createPluginFixture({
      'hominem.plugin.json': JSON.stringify({
        name: 'err',
        version: '1.0.0',
        entry: 'plugin.sh'
      }),
      'plugin.sh': "cat >/dev/null\nprintf '%s\\n' '{\"id\":\"err\",\"error\":{\"code\":\"PLUGIN_CUSTOM\",\"message\":\"failure\"}}'"
    })

    const previousRuntime = process.env.HOMINEM_PLUGIN_RUNTIME
    process.env.HOMINEM_PLUGIN_RUNTIME = '/bin/sh'
    try {
      await expect(invokePluginRpc({
        pluginRoot: root,
        method: 'fail'
      })).rejects.toMatchObject({
        code: 'PLUGIN_CUSTOM',
        category: 'dependency'
      } satisfies Pick<CliError, 'code' | 'category'>)
    } finally {
      if (previousRuntime === undefined) {
        delete process.env.HOMINEM_PLUGIN_RUNTIME
      } else {
        process.env.HOMINEM_PLUGIN_RUNTIME = previousRuntime
      }
    }
  })
})
