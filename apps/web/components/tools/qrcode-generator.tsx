/* eslint-disable @next/next/no-img-element */
'use client'

import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import * as qrcode from 'qrcode'
import { useState } from 'react'

const QRCodeGenerator = () => {
  const [text, setText] = useState('')
  const [qrCode, setQrCode] = useState('')
  const [error, setError] = useState('')

  const generateQRCode = async () => {
    if (!text.trim()) {
      setError('Please enter some text')
      return
    }

    try {
      // Use Google Charts API to generate QR code
      const encodedText = encodeURIComponent(text)
      const qrUrl = await qrcode.toDataURL(encodedText, {
        errorCorrectionLevel: 'H',
      })
      setQrCode(qrUrl)
      setError('')
    } catch {
      setError('Failed to generate QR code')
    }
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle>QR Code Generator</CardTitle>
        <CardDescription>Enter text to generate a QR code</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex space-x-2">
          <Input
            type="text"
            placeholder="Enter text or URL"
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="flex-1"
          />
          <Button onClick={generateQRCode}>Generate</Button>
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {qrCode && (
          <div className="flex justify-center mt-4">
            <img src={qrCode} alt="Generated QR Code" className="border rounded-lg" />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default QRCodeGenerator
