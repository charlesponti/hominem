import { Button, HStack, Host, TextField, useNativeState } from '@expo/ui/swift-ui';
import { accessibilityIdentifier, frame, padding } from '@expo/ui/swift-ui/modifiers';
import { Stack } from 'expo-router';
import { useEffect } from 'react';

import type { WorkspaceContext } from '~/components/workspace/workspace-types';

import { WorkspaceContextPicker } from './WorkspaceContextPicker.ios';

interface WorkspaceToolbarProps {
  activeContext: WorkspaceContext;
  isSearching: boolean;
  showSearch: boolean;
  searchPlaceholder: string;
  searchQuery: string;
  onContextChange: (context: WorkspaceContext) => void;
  onOpenSettings: () => void;
  onSearchCancel: () => void;
  onSearchChange: (query: string) => void;
  onSearchStart: () => void;
}

export function WorkspaceToolbar({
  activeContext,
  isSearching,
  showSearch,
  searchPlaceholder,
  searchQuery,
  onContextChange,
  onOpenSettings,
  onSearchCancel,
  onSearchChange,
  onSearchStart,
}: WorkspaceToolbarProps) {
  return (
    <>
      <Stack.Toolbar placement="left">
        <Stack.Toolbar.View hidden={isSearching}>
          <WorkspaceContextPicker value={activeContext} onChange={onContextChange} />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          accessibilityLabel="Open settings"
          hidden={isSearching}
          icon="person.crop.circle"
          onPress={onOpenSettings}
        />
        <Stack.Toolbar.Button
          accessibilityLabel="Search"
          hidden={isSearching || !showSearch}
          icon="magnifyingglass"
          onPress={onSearchStart}
        />
        <Stack.Toolbar.View hidden={!isSearching}>
          <WorkspaceToolbarActions
            searchPlaceholder={searchPlaceholder}
            searchQuery={searchQuery}
            onSearchCancel={onSearchCancel}
            onSearchChange={onSearchChange}
          />
        </Stack.Toolbar.View>
      </Stack.Toolbar>
    </>
  );
}

function WorkspaceToolbarActions({
  searchPlaceholder,
  searchQuery,
  onSearchCancel,
  onSearchChange,
}: Pick<
  WorkspaceToolbarProps,
  'searchPlaceholder' | 'searchQuery' | 'onSearchCancel' | 'onSearchChange'
>) {
  const queryState = useNativeState(searchQuery);

  useEffect(() => {
    queryState.set?.(searchQuery);
  }, [queryState, searchQuery]);

  return (
    <Host matchContents>
      <HStack
        alignment="center"
        modifiers={[padding({ leading: 8, trailing: 4 }), frame({ height: 44, width: 320 })]}
        spacing={8}
      >
        <TextField
          autoFocus
          modifiers={[accessibilityIdentifier('workspace-search-input'), frame({ width: 224 })]}
          placeholder={searchPlaceholder}
          text={queryState}
          onTextChange={onSearchChange}
        />
        <Button
          label="Cancel"
          modifiers={[accessibilityIdentifier('workspace-search-cancel')]}
          onPress={onSearchCancel}
          role="cancel"
        />
      </HStack>
    </Host>
  );
}
