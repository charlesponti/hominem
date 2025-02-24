import { google } from 'googleapis'
import { DEFAULT_SCOPES, GoogleOAuthService } from './auth'

export async function getSpreadsheetData({
  spreadsheetId,
  range,
}: { spreadsheetId: string; range: string }) {
  const service = new GoogleOAuthService({
    scopes: DEFAULT_SCOPES,
  })
  const client = await service.authorize()

  if (!client) {
    throw new Error('No client found')
  }

  const sheets = google.sheets({ version: 'v4', auth: client })
  const response = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range,
  })

  return response.data.values
}
