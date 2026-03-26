import { Header } from '@hominem/ui';

import { useInboxStream } from '~/hooks/use-inbox-stream';
import { WEB_BRAND } from '~/lib/brand';

export default function NotesHeader() {
  const { items } = useInboxStream();
  const latestNote = items.find((item) => item.kind === 'note');
  const latestChat = items.find((item) => item.kind === 'chat');

  return (
    <Header
      navItems={[
        { title: 'Notes', url: latestNote ? `/notes/${latestNote.id}` : '/notes/new' },
        { title: 'Chats', url: latestChat ? `/chat/${latestChat.id}` : '/chat' },
      ]}
      brandIcon={
        <img
          src={WEB_BRAND.logoPath}
          alt={WEB_BRAND.appName}
          className="size-6 rounded-md object-cover"
        />
      }
    />
  );
}
