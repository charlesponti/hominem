import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { SignJWT, importPKCS8 } from 'jose'

interface CliOptions {
  keyPath: string
  teamId: string
  clientId: string
  keyId: string
  expiresDays: number
}

function getOption(name: string): string | undefined {
  const flag = `--${name}`
  const index = process.argv.indexOf(flag)
  if (index < 0) {
    return undefined
  }
  return process.argv[index + 1]
}

function parseExpiresDays(value: string | undefined): number {
  if (!value) {
    return 150
  }
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 180) {
    throw new Error('expires-days must be an integer in the range [1, 180]')
  }
  return parsed
}

function parseOptions(): CliOptions {
  const keyPath = getOption('key-path') ?? '.auth/AuthKey_2438T5MGLH.p8'
  const teamId = getOption('team-id') ?? process.env.APPLE_TEAM_ID ?? ''
  const clientId = getOption('client-id') ?? process.env.APPLE_CLIENT_ID ?? ''
  const keyId = getOption('key-id') ?? process.env.APPLE_KEY_ID ?? ''
  const expiresDays = parseExpiresDays(getOption('expires-days'))

  if (!teamId) {
    throw new Error('Missing team-id. Provide --team-id or APPLE_TEAM_ID.')
  }
  if (!clientId) {
    throw new Error('Missing client-id. Provide --client-id or APPLE_CLIENT_ID.')
  }
  if (!keyId) {
    throw new Error('Missing key-id. Provide --key-id or APPLE_KEY_ID.')
  }

  return {
    keyPath,
    teamId,
    clientId,
    keyId,
    expiresDays,
  }
}

async function main() {
  const options = parseOptions()
  const absoluteKeyPath = resolve(options.keyPath)
  const privateKeyPem = await readFile(absoluteKeyPath, 'utf8')
  const privateKey = await importPKCS8(privateKeyPem, 'ES256')

  const nowSeconds = Math.floor(Date.now() / 1000)
  const expirationSeconds = nowSeconds + options.expiresDays * 24 * 60 * 60

  const token = await new SignJWT({})
    .setProtectedHeader({
      alg: 'ES256',
      kid: options.keyId,
    })
    .setIssuer(options.teamId)
    .setSubject(options.clientId)
    .setAudience('https://appleid.apple.com')
    .setIssuedAt(nowSeconds)
    .setExpirationTime(expirationSeconds)
    .sign(privateKey)

  console.log('APPLE_CLIENT_SECRET=' + token)
}

main().catch((error: Error) => {
  console.error(`[apple-client-secret] ${error.message}`)
  process.exit(1)
})
