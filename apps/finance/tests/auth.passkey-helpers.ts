import type { BrowserContext, Page } from '@playwright/test'

interface CdpSession {
  send(method: string, params?: Record<string, unknown>): Promise<unknown>
}

export interface VirtualPasskeyHandle {
  authenticatorId: string
}

async function createCdpSession(context: BrowserContext, page: Page): Promise<CdpSession> {
  const contextWithCdp = context as BrowserContext & {
    newCDPSession(target: Page): Promise<CdpSession>
  }
  return contextWithCdp.newCDPSession(page)
}

export async function setupVirtualPasskey(
  context: BrowserContext,
  page: Page,
): Promise<VirtualPasskeyHandle> {
  const cdp = await createCdpSession(context, page)
  await cdp.send('WebAuthn.enable')
  const result = (await cdp.send('WebAuthn.addVirtualAuthenticator', {
    options: {
      protocol: 'ctap2',
      transport: 'internal',
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  })) as { authenticatorId: string }

  return { authenticatorId: result.authenticatorId }
}

export async function teardownVirtualPasskey(
  context: BrowserContext,
  page: Page,
  handle: VirtualPasskeyHandle,
) {
  const cdp = await createCdpSession(context, page)
  await cdp.send('WebAuthn.removeVirtualAuthenticator', {
    authenticatorId: handle.authenticatorId,
  })
  await cdp.send('WebAuthn.disable')
}
