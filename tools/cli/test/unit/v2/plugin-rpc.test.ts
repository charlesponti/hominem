import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { PassThrough } from 'node:stream'
import { EventEmitter } from 'node:events'
import type { ChildProcessByStdio, SpawnOptionsWithoutStdio } from 'node:child_process'
import type { Readable, Writable } from 'node:stream'
import { describe, expect, it } from 'bun:test'

import { CliError } from '../../../src/v2/errors'
import { invokePluginRpc } from '../../../src/v2/plugin-rpc'
import { loadPluginManifest, resolvePluginEntry } from '../../../src/v2/plugin'

type SpawnProcess = (
  command: string,
  args: string[],
  options: SpawnOptionsWithoutStdio
) => ChildProcessByStdio<Writable, Readable, Readable>

function createSpawnProcessMock(outputLine: string, exitCode = 0): SpawnProcess {
  return () => {
    const child = new EventEmitter() as EventEmitter & {
      stdin: PassThrough
      stdout: PassThrough
      stderr: PassThrough
    }
    child.stdin = new PassThrough()
    child.stdout = new PassThrough()
    child.stderr = new PassThrough()

    queueMicrotask(() => {
      child.stdout.write(`${outputLine}\n`)
      child.stdout.end()
      child.stderr.end()
      child.emit('close', exitCode)
    })

    return child as unknown as ChildProcessByStdio<Writable, Readable, Readable>
  }
}

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

  it('invokes plugin over json-rpc child-process boundary', async () => {
    const root = await createPluginFixture({
      'hominem.plugin.json': JSON.stringify({
        name: 'echo',
        version: '1.0.0',
        entry: 'plugin.mjs'
      }),
      'plugin.mjs': 'export {}'
    })

    const result = await invokePluginRpc({
      pluginRoot: root,
      method: 'ping',
      params: { value: 1 },
      spawnProcess: createSpawnProcessMock('{"id":"ok","result":{"echoedMethod":"ping"}}')
    })

    expect(result).toEqual({ echoedMethod: 'ping' })
  })

  it('maps plugin error envelope to cli error', async () => {
    const root = await createPluginFixture({
      'hominem.plugin.json': JSON.stringify({
        name: 'err',
        version: '1.0.0',
        entry: 'plugin.mjs'
      }),
      'plugin.mjs': 'export {}'
    })

    await expect(invokePluginRpc({
      pluginRoot: root,
      method: 'fail',
      spawnProcess: createSpawnProcessMock('{"id":"err","error":{"code":"PLUGIN_CUSTOM","message":"failure"}}')
    })).rejects.toMatchObject({
      code: 'PLUGIN_CUSTOM',
      category: 'dependency'
    } satisfies Pick<CliError, 'code' | 'category'>)
  })
})
