import { InboxDetailChrome } from '~/components/inbox/InboxDetailChrome';
import { NoteScreen } from '~/components/inbox/NoteScreen';

export default function NoteDetailRoute() {
  return (
    <InboxDetailChrome>
      <NoteScreen />
    </InboxDetailChrome>
  );
}
