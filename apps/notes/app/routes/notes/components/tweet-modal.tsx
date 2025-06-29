'use client'

import type { User } from '@supabase/supabase-js'
import { Loader2, RefreshCw, Send, Twitter } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router'
import { Button } from '~/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import { Textarea } from '~/components/ui/textarea'
import { useToast } from '~/components/ui/use-toast'
import { useTwitterPost } from '~/hooks/use-twitter'
import { useFeatureFlag } from '~/lib/hooks/use-feature-flags'

interface TweetModalProps {
  isOpen: boolean
  onClose: () => void
  initialText?: string
  contentId?: string
  user?: User | null
}

export function TweetModal({ isOpen, onClose, initialText = '', contentId, user }: TweetModalProps) {
  const { toast } = useToast()
  const isTwitterEnabled = useFeatureFlag('twitterIntegration')
  const { postTweet, isLoading } = useTwitterPost()
  const [tweetText, setTweetText] = useState(initialText)
  const [isOverLimit, setIsOverLimit] = useState(false)

  const TWEET_LIMIT = 280

  useEffect(() => {
    setTweetText(initialText)
  }, [initialText])

  useEffect(() => {
    setIsOverLimit(tweetText.length > TWEET_LIMIT)
  }, [tweetText])

  const handlePost = async () => {
    if (!tweetText.trim() || isOverLimit) return

    try {
      postTweet({
        text: tweetText,
        contentId,
        saveAsContent: true,
      })

      toast({
        title: 'Tweet Posted!',
        description: 'Your tweet has been posted successfully.',
      })

      onClose()
      setTweetText('')
    } catch (error) {
      console.error('Failed to post tweet:', error)
      toast({
        variant: 'destructive',
        title: 'Failed to Post Tweet',
        description: 'Unable to post tweet. Please try again.',
      })
    }
  }

  if (!isTwitterEnabled) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Twitter Integration Disabled</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <Twitter className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600 mb-4">
              Twitter integration is currently disabled. Please contact your administrator to enable
              this feature.
            </p>
            <Button onClick={onClose}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  if (!user) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Authentication Required</DialogTitle>
          </DialogHeader>
          <div className="text-center py-4">
            <p className="text-gray-600 mb-4">
              You need to be logged in to post tweets. Please sign in to continue.
            </p>
            <Link to="/account">
              <Button>Go to Account</Button>
            </Link>
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Twitter className="w-5 h-5" />
            Post to X (Twitter)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Textarea
              placeholder="What's happening?"
              value={tweetText}
              onChange={(e) => setTweetText(e.target.value)}
              className="min-h-[120px] resize-none"
              maxLength={TWEET_LIMIT}
            />
            <div className="flex justify-between items-center mt-2 text-sm text-gray-500">
              <span>
                {tweetText.length}/{TWEET_LIMIT} characters
              </span>
              {isOverLimit && <span className="text-red-500">Over character limit</span>}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button
              onClick={handlePost}
              disabled={isOverLimit || isLoading}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white"
            >
              {isLoading ? (
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Post Tweet
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
