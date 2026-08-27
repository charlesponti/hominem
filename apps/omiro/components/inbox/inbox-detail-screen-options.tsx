import { NavDrawerMenuButton } from '~/components/navigation/NavDrawerMenuButton';
import { IconButton } from '~/components/ui';
import AppIcon from '~/components/ui/icon';

interface DetailNavigation {
  canGoBack: () => boolean;
  goBack: () => void;
}

/**
 * Shared header config for the chat/note detail screens (chats/[id],
 * notes/[id]): a back button when there's history to return to, or the
 * app's drawer menu when there isn't (e.g. reached via a launch-time
 * redirect like resume-on-launch, which leaves no back history).
 */
export function createInboxDetailScreenOptions({ navigation }: { navigation: DetailNavigation }) {
  return {
    headerShown: true,
    title: '',
    headerLeft: () =>
      navigation.canGoBack() ? (
        <IconButton
          accessibilityLabel="Back"
          onPress={() => navigation.goBack()}
          testID="inbox-detail-back-button"
          variant="plain"
        >
          <AppIcon name="chevron.left" size={20} />
        </IconButton>
      ) : (
        <NavDrawerMenuButton />
      ),
  };
}
