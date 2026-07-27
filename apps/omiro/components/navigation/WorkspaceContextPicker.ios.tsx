import { Host } from '@expo/ui';
import { Label, Picker } from '@expo/ui/swift-ui';
import {
  accessibilityLabel,
  accessibilityIdentifier,
  environment,
  labelStyle,
  pickerStyle,
  tag,
} from '@expo/ui/swift-ui/modifiers';
import { useColorMode } from '@ponti-studios/ui/native';
import type { SFSymbol } from 'expo-symbols';

export type WorkspaceContext = 'chats' | 'notes' | 'calendar';

const contextIcons: Record<WorkspaceContext, SFSymbol> = {
  chats: 'bubble.left.and.bubble.right.fill',
  notes: 'note.text',
  calendar: 'calendar',
};

interface WorkspaceContextPickerProps {
  value: WorkspaceContext;
  onChange: (value: WorkspaceContext) => void;
}

export function WorkspaceContextPicker({ value, onChange }: WorkspaceContextPickerProps) {
  const colorScheme = useColorMode();

  return (
    <Host style={{ height: 44, width: 220 }}>
      <Picker
        modifiers={[
          environment({ key: 'colorScheme', value: colorScheme }),
          pickerStyle('segmented'),
        ]}
        selection={value}
        onSelectionChange={(nextValue) => onChange(nextValue as WorkspaceContext)}
      >
        <WorkspaceContextOption value="chats" label="Chats" />
        <WorkspaceContextOption value="notes" label="Notes" />
        <WorkspaceContextOption value="calendar" label="Calendar" />
      </Picker>
    </Host>
  );
}

function WorkspaceContextOption({ value, label }: { value: WorkspaceContext; label: string }) {
  return (
    <Label
      title={label}
      systemImage={contextIcons[value]}
      modifiers={[
        labelStyle('iconOnly'),
        tag(value),
        accessibilityLabel(label),
        accessibilityIdentifier(`workspace-context-${value}`),
      ]}
    />
  );
}
