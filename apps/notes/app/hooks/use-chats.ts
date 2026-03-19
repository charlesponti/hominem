import { useHonoMutation, useHonoUtils } from '@hominem/hono-client/react';

export function useDeleteChat() {
  const utils = useHonoUtils();

  return useHonoMutation<{ success: boolean }, { chatId: string }>(
    ({ chats }, variables) => chats.delete(variables),
    {
      onSuccess: () => {
        utils.invalidate(['chats', 'sidebar', 'list']);
      },
    },
  );
}
