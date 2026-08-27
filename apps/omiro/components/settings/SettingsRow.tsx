import type { SFSymbol } from 'expo-symbols';
import type { ReactNode } from 'react';
import { Pressable, Text, View } from 'react-native';

import { useAppTheme, useStyles } from '~/components/theme';
import AppIcon from '~/components/ui/icon';

function useSettingsRowStyles() {
  return useStyles((theme) => ({
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
    rowContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
    labelContent: { flex: 1, gap: 2 },
    label: {},
    description: { fontSize: 13, color: theme.colors.mutedForeground },
    staticRow: { paddingHorizontal: 16 },
    pressableRow: { paddingHorizontal: 16 },
    sectionLabel: {
      fontSize: 13,
      fontWeight: '600',
      color: theme.colors.mutedForeground,
      paddingHorizontal: 16,
    },
  }));
}

export function SettingsRow({
  icon,
  label,
  description,
  onPress,
  accessory,
  destructive,
  testID,
}: {
  icon: SFSymbol;
  label: string;
  description?: string;
  onPress?: () => void;
  accessory?: ReactNode;
  destructive?: boolean;
  testID?: string;
}) {
  const {
    destructive: destructiveColor,
    foreground: textPrimaryColor,
    tertiary: tertiaryColor,
  } = useAppTheme().colors;
  const styles = useSettingsRowStyles();

  const labelColor = destructive ? destructiveColor : textPrimaryColor;

  const content = (
    <View style={[styles.row, { minHeight: 44 }]}>
      <View style={styles.rowContent}>
        <AppIcon name={icon} size={18} tintColor={destructive ? destructiveColor : tertiaryColor} />
        <View style={styles.labelContent}>
          <Text style={[styles.label, { color: labelColor }]}>{label}</Text>
          {description ? <Text style={styles.description}>{description}</Text> : null}
        </View>
      </View>
      {accessory}
    </View>
  );

  if (!onPress) {
    return (
      <View testID={testID} style={styles.staticRow}>
        {content}
      </View>
    );
  }

  return (
    <Pressable
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [styles.pressableRow, pressed ? { opacity: 0.6 } : undefined]}
    >
      {content}
    </Pressable>
  );
}

export function SectionLabel({ children }: { children: string }) {
  const styles = useSettingsRowStyles();
  return <Text style={styles.sectionLabel}>{children}</Text>;
}
