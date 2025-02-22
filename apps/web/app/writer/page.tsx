'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { WritingActions } from '@/lib/writing'
import { ResultSkeleton } from './loading-skeleton'

export default function WriterPage() {
  const [sentence, setSentence] = useState('')
  const [word, setWord] = useState('')
  const [result, setResult] = useState<string | null>(null)
  const [alternatives, setAlternatives] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const handleDescribeWord = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          word,
          action: WritingActions.DESCRIBE_WORD,
        }),
      })
      const data = await response.json()
      setResult(data.result.description)
      setAlternatives(data.result.other_words)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleRewriteSentence = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sentence,
          word,
          action: WritingActions.REWRITE_SENTENCE,
        }),
      })
      const data = await response.json()
      setResult(data.result)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Writing Assistant</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Input
              placeholder="Enter a word to analyze"
              value={word}
              onChange={(e) => setWord(e.target.value)}
            />
            <Button onClick={handleDescribeWord} disabled={loading || !word} className="w-full">
              Analyze Word
            </Button>
          </div>

          <div className="space-y-2">
            <Input
              placeholder="Enter a sentence to rewrite"
              value={sentence}
              onChange={(e) => setSentence(e.target.value)}
            />
            <Button
              onClick={handleRewriteSentence}
              disabled={loading || !sentence || !word}
              className="w-full"
            >
              Rewrite Sentence
            </Button>
          </div>

          {loading ? (
            <ResultSkeleton />
          ) : (
            result && (
              <div className="mt-4 p-4 bg-slate-100 rounded-md">
                <h3 className="font-semibold mb-2">Result:</h3>
                <p>{result}</p>
                {alternatives.length > 0 && (
                  <div className="mt-2">
                    <h4 className="font-semibold">Alternative words:</h4>
                    <p>{alternatives.join(', ')}</p>
                  </div>
                )}
              </div>
            )
          )}
        </CardContent>
      </Card>
    </div>
  )
}
