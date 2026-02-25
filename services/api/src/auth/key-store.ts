import {
  exportJWK,
  generateKeyPair,
  type JWK,
} from 'jose'

interface SigningKeyPair {
  privateKey: CryptoKey
  publicKey: CryptoKey
  publicJwk: JWK
  kid: string
}

let signingKeyPromise: Promise<SigningKeyPair> | null = null

function getRandomKid() {
  return `dev-${crypto.randomUUID()}`
}

async function generateSigningKey(): Promise<SigningKeyPair> {
  const { publicKey, privateKey } = await generateKeyPair('ES256', {
    extractable: true,
  })
  const publicJwk = await exportJWK(publicKey)
  const kid = getRandomKid()

  return {
    privateKey,
    publicKey,
    publicJwk: {
      ...publicJwk,
      use: 'sig',
      alg: 'ES256',
      kid,
    },
    kid,
  }
}

export async function getSigningKey(): Promise<SigningKeyPair> {
  if (!signingKeyPromise) {
    signingKeyPromise = generateSigningKey()
  }

  return signingKeyPromise
}

export async function getJwks() {
  const key = await getSigningKey()
  return {
    keys: [key.publicJwk],
  }
}
