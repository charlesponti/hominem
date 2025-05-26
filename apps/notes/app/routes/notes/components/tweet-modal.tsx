'use client'

import { Loader2, RefreshCw, Twitter } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '~/components/ui/badge'
import { Button } from '~/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog'
import { Label } from '~/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { Textarea } from '~/components/ui/textarea'
import { useGenerateTweet } from '~/lib/content/use-generate-tweet'

interface TweetModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  noteContent: string
  noteTitle?: string | null
}

const TWEET_CHARACTER_LIMIT = 280

type ToneOption = 'professional' | 'casual' | 'engaging' | 'informative'
export function TweetModal({ open, onOpenChange, noteContent, noteTitle }: TweetModalProps) {
  const [tone, setTone] = useState<ToneOption>('engaging')
  const [includeHashtags, setIncludeHashtags] = useState(true)

  const {
    generateTweet,
    regenerateTweet,
    updateTweet,
    resetTweet,
    generatedTweet,
    isEditing,
    setIsEditing,
    isGenerating,
  } = useGenerateTweet()

  const characterCount = generatedTweet.length
  const isOverLimit = characterCount > TWEET_CHARACTER_LIMIT

  const handleGenerate = () => {
    const content = noteTitle ? `${noteTitle}\n\n${noteContent}` : noteContent
    generateTweet({
      content,
      tone,
      includeHashtags,
    })
  }

  const handleRegenerate = () => {
    const content = noteTitle ? `${noteTitle}\n\n${noteContent}` : noteContent
    regenerateTweet({
      content,
      tone,
      includeHashtags,
    })
  }

  const handleClose = () => {
    resetTweet()
    onOpenChange(false)
  }

  const handlePost = () => {
    // TODO: Implement Twitter API integration
    const tweetText = encodeURIComponent(generatedTweet)
    const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`
    window.open(twitterUrl, '_blank')
    handleClose()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Twitter className="h-5 w-5 text-blue-500" />
            Generate Tweet
          </DialogTitle>
          <DialogDescription>
            Generate a tweet from your note content. You can customize the tone and edit the result
            before posting.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Settings */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tone">Tone</Label>
              <Select value={tone} onValueChange={(value: ToneOption) => setTone(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select tone" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="casual">Casual</SelectItem>
                  <SelectItem value="engaging">Engaging</SelectItem>
                  <SelectItem value="informative">Informative</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Options</Label>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant={includeHashtags ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setIncludeHashtags(!includeHashtags)}
                >
                  Include #hashtags
                </Button>
              </div>
            </div>
          </div>

          {/* Generated Tweet */}
          {(generatedTweet || isGenerating) && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="tweet">Generated Tweet</Label>
                <div className="flex items-center gap-2">
                  <Badge variant={isOverLimit ? 'destructive' : 'secondary'}>
                    {characterCount}/{TWEET_CHARACTER_LIMIT}
                  </Badge>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRegenerate}
                    disabled={isGenerating}
                    className="flex items-center gap-1"
                  >
                    <RefreshCw className={`h-3 w-3 ${isGenerating ? 'animate-spin' : ''}`} />
                    Regenerate
                  </Button>
                </div>
              </div>

              {isGenerating ? (
                <div className="flex items-center justify-center p-8 border rounded-md">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="ml-2">Generating tweet...</span>
                </div>
              ) : (
                <Textarea
                  id="tweet"
                  value={generatedTweet}
                  onChange={(e) => updateTweet(e.target.value)}
                  placeholder="Your generated tweet will appear here..."
                  className="min-h-[100px] resize-none"
                  maxLength={TWEET_CHARACTER_LIMIT + 50} // Allow some buffer for editing
                />
              )}
            </div>
          )}

          {/* Note Preview */}
          <div className="space-y-2">
            <Label>Note Content</Label>
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-md border">
              {noteTitle && (
                <h4 className="font-medium text-sm text-slate-900 dark:text-slate-100 mb-2">
                  {noteTitle}
                </h4>
              )}
              <p className="text-sm text-slate-700 dark:text-slate-300 line-clamp-3">
                {noteContent}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>

          {!generatedTweet ? (
            <Button onClick={handleGenerate} disabled={isGenerating}>
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                'Generate Tweet'
              )}
            </Button>
          ) : (
            <Button
              onClick={handlePost}
              disabled={isOverLimit}
              className="bg-blue-500 hover:bg-blue-600 text-white"
            >
              <Twitter className="h-4 w-4 mr-2" />
              Post to Twitter
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
