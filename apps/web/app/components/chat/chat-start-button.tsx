import { LoaderCircle, LucideMessageCirclePlus } from 'lucide-react';
import { useCallback } from 'react';
import { useNavigate } from 'react-router';

import { Button } from '~/components/ui/button';
import { useCreateChat } from '~/hooks/use-chats';

export function useChatStart() {
  const navigate = useNavigate();
  const createChat = useCreateChat();

  const startChat = useCallback(() => {
    if (createChat.isPending) return;
    createChat.mutate(
      { title: 'New chat' },
      { onSuccess: (chat) => navigate(`/chat/${chat.id}`, { viewTransition: true }) },
    );
  }, [createChat, navigate]);

  return { isPending: createChat.isPending, startChat };
}

export function ChatStartButton({
  className,
  disabled,
  ...props
}: Omit<React.ComponentProps<typeof Button>, 'children' | 'onClick'>) {
  const { isPending, startChat } = useChatStart();

  return (
    <Button
      aria-label="Start a new chat"
      className={className}
      disabled={disabled || isPending}
      onClick={startChat}
      {...props}
    >
      {isPending ? <LoaderCircle className="animate-spin" /> : <LucideMessageCirclePlus />}
    </Button>
  );
}
