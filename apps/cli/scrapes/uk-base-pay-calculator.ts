import { test } from '@playwright/test'

test('test', async ({ page }) => {
  await page.goto('https://www.tax.service.gov.uk/estimate-paye-take-home-pay/your-pay')
  await page.getByRole('textbox', { name: 'Income amount' }).click()
  await page.getByRole('textbox', { name: 'Income amount' }).fill('140000')
  await page.getByRole('radio', { name: 'Yearly' }).check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('radio', { name: 'No' }).check()
  await page.getByRole('button', { name: 'Continue' }).click()
  await page.getByRole('button', { name: 'Calculate take-home pay' }).click()
  const tab = page.getByRole('tabpanel', { name: 'Yearly' })
  console.log(await tab.innerText())
})
