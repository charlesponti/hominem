import { BottomSheetModal, BottomSheetView } from '@expo/ui/community/bottom-sheet';
import type { ArtifactType } from '@hominem/rpc/types';
import { useTheme } from '@shopify/restyle';
import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { theme } from '~/components/theme';

import { ClassificationReview } from './classification-review';

interface ChatPendingReview {
  proposedType: ArtifactType;
  proposedTitle: string;
  proposedChanges: string[];
  previewContent: string;
  items?: { title: string; description?: string }[];
}

interface ChatReviewOverlayProps {
  pendingReview: ChatPendingReview | null;
  isVisible: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export function ChatReviewOverlay({
  pendingReview,
  isVisible,
  onAccept,
  onReject,
}: ChatReviewOverlayProps) {
  const insets = useSafeAreaInsets();
  const { border: borderDefault, background } = useTheme().colors;
  const modalRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (isVisible && pendingReview) {
      modalRef.current?.present();
      return;
    }
    modalRef.current?.dismiss();
  }, [isVisible, pendingReview]);

  return (
    <BottomSheetModal
      ref={modalRef}
      enableDynamicSizing
      enablePanDownToClose={false}
      handleIndicatorStyle={{ backgroundColor: borderDefault, width: 40, height: 4 }}
      backgroundStyle={{ backgroundColor: background }}
      onDismiss={onReject}
    >
      <BottomSheetView style={[styles.sheetContent, { paddingBottom: insets.bottom + 24 }]}>
        {pendingReview ? (
          <ClassificationReview
            items={pendingReview.items}
            onAccept={onAccept}
            onReject={onReject}
            previewContent={pendingReview.previewContent}
            proposedChanges={pendingReview.proposedChanges}
            proposedTitle={pendingReview.proposedTitle}
            proposedType={pendingReview.proposedType}
          />
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheetContent: { paddingHorizontal: 24, paddingTop: 8 },
});
