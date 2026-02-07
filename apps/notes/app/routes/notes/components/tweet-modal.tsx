import { useToast } from '@hominem/ui';
import { Button } from '@hominem/ui/button';
import { Badge } from '@hominem/ui/components/ui/badge';
import { Label } from '@hominem/ui/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hominem/ui/components/ui/select';
import { Textarea } from '@hominem/ui/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@hominem/ui/dialog';
import { Loader2, RefreshCw, Twitter } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router';

import { useGenerateTweet } from '~/lib/content/use-generate-tweet';
import { useFeatureFlag } from '~/lib/hooks/use-feature-flags';
import { useTwitterAccounts, useTwitterPost } from '~/lib/hooks/use-twitter-oauth';

interface TweetModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  noteContent: string;
  noteTitle?: string | null | undefined;
  contentId?: string; // Optional: link to existing content
}

const TWEET_CHARACTER_LIMIT = 280;

const DEFAULT_STRATEGIES = [
  { value: 'storytelling', label: '📖 Storytelling', description: 'Create a narrative arc' },
  {
    value: 'question',
    label: '❓ Question',
    description: 'Start with thought-provoking questions',
  },
  { value: 'statistic', label: '📊 Statistic', description: 'Lead with compelling data' },
  { value: 'quote', label: '💬 Quote', description: 'Transform insights into quotable statements' },
  { value: 'tip', label: '💡 Tip', description: 'Present actionable advice' },
  {
    value: 'behind-the-scenes',
    label: '🎬 Behind the Scenes',
    description: 'Share process or journey',
  },
  {
    value: 'thread-starter',
    label: '🧵 Thread Starter',
    description: 'Create intrigue for threads',
  },
  { value: 'controversy', label: '⚡ Controversy', description: 'Present contrarian perspectives' },
  { value: 'listicle', label: '📝 Listicle', description: 'Break down into numbered points' },
  { value: 'education', label: '🎓 Education', description: 'Focus on teaching concepts' },
];

export function TweetModal({
  open,
  onOpenChange,
  noteContent,
  noteTitle,
  contentId,
}: TweetModalProps) {
  const [strategy, setStrategy] = useState<string>('storytelling');
  const twitterIntegrationEnabled = useFeatureFlag('twitterIntegration');

  const { generateTweet, regenerateTweet, updateTweet, resetTweet, generatedTweet, isGenerating } =
    useGenerateTweet();

  const { data: twitterAccounts, isLoading: isLoadingAccounts } = useTwitterAccounts();
  const postTweet = useTwitterPost();
  const { toast } = useToast();

  const hasTwitterAccount = !!twitterAccounts && twitterAccounts.length > 0;
  const canPost = twitterIntegrationEnabled && hasTwitterAccount;
  const characterCount = generatedTweet.length;
  const isOverLimit = characterCount > TWEET_CHARACTER_LIMIT;

  const handleGenerate = () => {
    const content = noteTitle ? `${noteTitle}\n\n${noteContent}` : noteContent;
    generateTweet({
      content,
      strategy,
    });
  };

  const handleRegenerate = () => {
    const content = noteTitle ? `${noteTitle}\n\n${noteContent}` : noteContent;
    regenerateTweet({
      content,
      strategy,
    });
  };

  const handleClose = () => {
    resetTweet();
    onOpenChange(false);
  };

  const handlePost = () => {
    if (canPost) {
      // Post using API
      postTweet.mutate(
        {
          text: generatedTweet,
          ...(contentId && { contentId }), // Link to existing content if provided
          saveAsContent: true, // Always save as content for better tracking
        },
        {
          onSuccess: (_data) => {
            const message = contentId
              ? 'Tweet posted and content updated!'
              : 'Tweet posted and saved to notes!';
            toast({
              title: 'Tweet posted successfully!',
              description: message,
            });
            handleClose();
          },
          onError: (error) => {
            console.error('Failed to post tweet:', error);
            toast({
              title: 'Failed to post tweet',
              description: 'There was an error posting your tweet. Please try again.',
              variant: 'destructive',
            });
          },
        },
      );
    } else {
      // Fallback to browser intent (always available as backup)
      const tweetText = encodeURIComponent(generatedTweet);
      const twitterUrl = `https://twitter.com/intent/tweet?text=${tweetText}`;
      window.open(twitterUrl, '_blank');
      handleClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-131">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Twitter className="size-5 text-foreground" />
            Generate Tweet
          </DialogTitle>
          <DialogDescription>
            Generate a tweet from your note content using AI. Customize the content strategy, then
            edit before posting.
            {!isLoadingAccounts && (
              <div className="mt-2 space-y-2">
                {twitterIntegrationEnabled ? (
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={hasTwitterAccount ? 'default' : 'secondary'}
                      className="text-xs"
                    >
                      {hasTwitterAccount
                        ? '✓ X account connected - can post directly'
                        : 'No X account connected'}
                    </Badge>
                    {!hasTwitterAccount && (
                      <Link
                        to="/account"
                        className="text-xs text-foreground hover:text-foreground/80 underline"
                      >
                        Connect account
                      </Link>
                    )}
                  </div>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    ℹ️ Anyone can generate tweets - connect X account to post directly
                  </Badge>
                )}
              </div>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Settings */}
          <div className="grid grid-cols-1 gap-4">
            <div className="space-y-2">
              <Label htmlFor="strategy">Content Strategy</Label>
              <Select value={strategy} onValueChange={(value: string) => setStrategy(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select content strategy" />
                </SelectTrigger>
                <SelectContent>
                  {DEFAULT_STRATEGIES.map((s) => (
                    <SelectItem key={s.value} value={s.value}>
                      <div className="flex flex-col">
                        <span>{s.label}</span>
                        <span className="text-xs text-muted-foreground">{s.description}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
                    <RefreshCw className={`size-3 ${isGenerating ? '' : ''}`} />
                    Regenerate
                  </Button>
                </div>
              </div>

              {isGenerating ? (
                <div className="flex items-center justify-center p-8 border rounded-md">
                  <Loader2 className="size-6" />
                  <span className="ml-2">Generating tweet...</span>
                </div>
              ) : (
                <Textarea
                  id="tweet"
                  value={generatedTweet}
                  onChange={(e) => updateTweet(e.target.value)}
                  placeholder="Your generated tweet will appear here..."
                  className="min-h-25 resize-none"
                  maxLength={TWEET_CHARACTER_LIMIT + 50} // Allow some buffer for editing
                />
              )}
            </div>
          )}

          {/* Note Preview */}
          <div className="space-y-2">
            <Label>Note Content</Label>
            <div className="p-3 border border-border rounded-md">
              {noteTitle && (
                <h4 className="font-medium text-sm text-foreground mb-2">{noteTitle}</h4>
              )}
              <p className="text-sm text-muted-foreground line-clamp-3">{noteContent}</p>
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
                  <Loader2 className="size-4 mr-2" />
                  Generating...
                </>
              ) : (
                'Generate Tweet'
              )}
            </Button>
          ) : (
            <Button
              onClick={handlePost}
              disabled={isOverLimit || postTweet.isPending}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {postTweet.isPending ? (
                <>
                  <Loader2 className="size-4 mr-2" />
                  Posting...
                </>
              ) : (
                <>
                  <Twitter className="size-4 mr-2" />
                  {canPost ? 'Post to X' : 'Open in X'}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
