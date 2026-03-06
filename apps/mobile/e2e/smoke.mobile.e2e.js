describe('Mobile smoke', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true, delete: true })
  })

  it('shows sign-in entrypoint', async () => {
    await waitFor(element(by.id('auth-screen')))
      .toBeVisible()
      .withTimeout(30000)
  })
})
