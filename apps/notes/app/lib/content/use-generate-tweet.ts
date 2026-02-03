import type { HonoClient } from '@hominem/hono-client';
import type { TweetGenerateInput, TweetGenerateOutput } from '@hominem/hono-rpc/types/tweet.types';

import { useHonoMutation } from '@hominem/hono-client/react';
import { useToast } from '@hominem/ui';
import { useState } from 'react';

export function useGenerateTweet() {
  const [generatedTweet, setGeneratedTweet] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const { toast } = useToast();

  const generateMutation = useHonoMutation<TweetGenerateOutput, TweetGenerateInput>(
    async (client: HonoClient, variables: TweetGenerateInput) => {
      const res = await client.api.tweet.generate.$post({ json: variables });
      return res.json() as Promise<TweetGenerateOutput>;
    },
    {
      onSuccess: (result) => {
        setGeneratedTweet(result.text);
      },
      onError: (error) => {
        toast({
          title: 'Error generating tweet',
          description: error.message,
          variant: 'destructive',
        });
      },
    },
  );

  const generateTweet = (params: TweetGenerateInput) => {
    generateMutation.mutate(params);
  };

  const regenerateTweet = (params: TweetGenerateInput) => {
    generateMutation.mutate(params);
  };

  const updateTweet = (text: string) => {
    setGeneratedTweet(text);
  };

  const resetTweet = () => {
    setGeneratedTweet('');
    setIsEditing(false);
  };

  return {
    generateTweet,
    regenerateTweet,
    updateTweet,
    resetTweet,
    generatedTweet,
    isEditing,
    setIsEditing,
    isGenerating: generateMutation.isPending,
  };
}
