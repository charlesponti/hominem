import { BottomSheetModal, BottomSheetView } from '@expo/ui/community/bottom-sheet';
import { useEffect, useRef } from 'react';

import { makeStyles } from '~/components/theme';

import { TimeBlockDetail, type TimeBlockDetailSource } from './TimeBlockDetail';

export interface TimeBlockSelection {
  id: string;
  source: TimeBlockDetailSource;
}

interface TimeBlockSheetProps {
  onDismiss: () => void;
  selection: TimeBlockSelection | null;
}

export function TimeBlockSheet({ onDismiss, selection }: TimeBlockSheetProps) {
  const styles = useStyles();
  const sheetRef = useRef<BottomSheetModal>(null);

  useEffect(() => {
    if (selection) {
      sheetRef.current?.present();
      return;
    }
    sheetRef.current?.dismiss();
  }, [selection?.id, selection?.source]);

  return (
    <BottomSheetModal
      enablePanDownToClose
      index={0}
      onDismiss={onDismiss}
      ref={sheetRef}
      snapPoints={['90%']}
    >
      <BottomSheetView style={styles.content}>
        {selection ? (
          <TimeBlockDetail
            id={selection.id}
            key={`${selection.source}:${selection.id}`}
            onClose={() => sheetRef.current?.dismiss()}
            source={selection.source}
          />
        ) : null}
      </BottomSheetView>
    </BottomSheetModal>
  );
}

const useStyles = makeStyles(() => ({
  content: { flex: 1 },
}));
