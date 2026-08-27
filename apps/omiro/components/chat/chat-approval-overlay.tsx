import { Modal, Pressable, Text, View } from 'react-native';

import { makeStyles, useThemeColor } from '~/components/theme';

type UnknownRecord = Record<string, unknown>;

function record(value: unknown): UnknownRecord {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : {};
}

function normalize(interrupt: unknown) {
  const root = record(interrupt);
  const value = record(root.value);
  const approval = record(root.approval ?? value.approval);
  const id =
    typeof approval.id === 'string'
      ? approval.id
      : typeof root.interruptId === 'string'
        ? root.interruptId
        : null;
  if (!id) return null;
  return {
    id,
    name:
      typeof root.toolName === 'string'
        ? root.toolName
        : typeof value.toolName === 'string'
          ? value.toolName
          : 'Action',
    preview: value.preview ?? root.preview ?? value.input ?? root.input,
  };
}

export function ChatApprovalOverlay({
  approve,
  interrupts,
}: {
  approve: (id: string, approved: boolean) => Promise<void>;
  interrupts: ReadonlyArray<unknown>;
}) {
  const [background, foreground, muted, primary] = useThemeColor([
    '--color-background',
    '--color-foreground',
    '--color-muted-foreground',
    '--color-primary',
  ]) as string[];
  const current = interrupts.map(normalize).find((value) => value !== null);
  if (!current) return null;

  return (
    <Modal animationType="slide" onRequestClose={() => undefined} transparent visible>
      <View style={[styles.card, { backgroundColor: background }]}>
        <Text style={[styles.title, { color: foreground }]}>Approve {current.name}?</Text>
        <Text style={[styles.description, { color: muted }]}>
          This action is waiting for your approval.
        </Text>
        {current.preview ? (
          <Text style={[styles.preview, { color: foreground }]}>
            {typeof current.preview === 'string'
              ? current.preview
              : JSON.stringify(current.preview, null, 2)}
          </Text>
        ) : null}
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            onPress={() => void approve(current.id, false)}
            style={styles.button}
          >
            <Text style={[styles.buttonText, { color: muted }]}>Reject</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => void approve(current.id, true)}
            style={[styles.button, { backgroundColor: primary }]}
          >
            <Text style={[styles.buttonText, { color: background }]}>Approve</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = makeStyles((theme) => ({
  card: { borderRadius: theme.radius.lg, padding: 20, gap: 12 },
  title: { ...theme.typography.title1, fontWeight: '700' },
  description: { ...theme.typography.body },
  preview: {
    ...theme.typography.mono,
    backgroundColor: theme.colors.muted,
    borderRadius: theme.radius.sm,
    padding: 10,
  },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 4 },
  button: { borderRadius: theme.radius.md, paddingHorizontal: 16, paddingVertical: 10 },
  buttonText: { ...theme.typography.body, fontWeight: '600' },
}));
