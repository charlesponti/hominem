import { useState } from 'react';
import { DynamicColorIOS, Pressable, StyleSheet, Text, View } from 'react-native';

import { palette, theme, withAlpha } from '~/components/theme';
import { TextField } from '~/components/ui';
import { Button } from '~/components/ui/button';
import {
  type PersonPickerRecord,
  useCreatePerson,
  usePeopleSearch,
} from '~/services/people/use-people';

export function TaskPeoplePicker({
  selected,
  onChange,
}: {
  selected: PersonPickerRecord[];
  onChange: (people: PersonPickerRecord[]) => void;
}) {
  const [query, setQuery] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [createError, setCreateError] = useState('');
  const peopleQuery = usePeopleSearch(query);
  const createPerson = useCreatePerson();
  const results = peopleQuery.data?.people ?? [];
  const availableResults = results.filter(
    (person) => !selected.some((current) => current.id === person.id),
  );

  const addPerson = (person: PersonPickerRecord) => {
    onChange([...selected, person]);
    setQuery('');
  };

  const removePerson = (personId: string) => {
    onChange(selected.filter((person) => person.id !== personId));
  };

  const create = async () => {
    const name = displayName.trim();
    if (!name) return;
    try {
      const person = await createPerson.mutateAsync({
        displayName: name,
        email: email.trim() || null,
      });
      addPerson(person);
      setDisplayName('');
      setEmail('');
      setIsCreating(false);
      setCreateError('');
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : 'Unable to create person.');
    }
  };

  return (
    <View style={styles.container} testID="time-block-people">
      <View style={styles.selectedList}>
        {selected.map((person) => (
          <Pressable
            key={person.id}
            accessibilityLabel={`Remove ${person.displayName}`}
            style={styles.personChip}
            onPress={() => removePerson(person.id)}
            testID={`task-person-selected-${person.id}`}
          >
            <Text style={styles.personName}>{person.displayName}</Text>
            <Text style={styles.removeIcon}>×</Text>
          </Pressable>
        ))}
      </View>

      {!isCreating ? (
        <>
          <TextField
            onChangeText={setQuery}
            placeholder="Search people"
            testID="task-person-search"
            value={query}
          />
          {availableResults.map((person) => (
            <Pressable
              key={person.id}
              style={styles.resultRow}
              onPress={() => addPerson(person)}
              testID={`task-person-result-${person.id}`}
            >
              <Text style={styles.resultName}>{person.displayName}</Text>
              {person.email ? <Text style={styles.resultEmail}>{person.email}</Text> : null}
            </Pressable>
          ))}
          {query.trim() ? (
            <Button
              label={`Create “${query.trim()}”`}
              onPress={() => {
                setDisplayName(query.trim());
                setIsCreating(true);
              }}
              testID="task-person-create"
              variant="secondary"
            />
          ) : null}
        </>
      ) : (
        <View style={styles.createForm}>
          <TextField
            autoFocus
            onChangeText={setDisplayName}
            placeholder="Name"
            testID="task-person-create-name"
            value={displayName}
          />
          <TextField
            autoCapitalize="none"
            keyboardType="email-address"
            onChangeText={setEmail}
            placeholder="Email (optional)"
            testID="task-person-create-email"
            value={email}
          />
          {createError ? (
            <Text style={styles.createError} testID="task-person-create-error">
              {createError}
            </Text>
          ) : null}
          <View style={styles.createActions}>
            <View style={styles.cancelAction}>
              <Button label="Cancel" onPress={() => setIsCreating(false)} variant="secondary" />
            </View>
            <View style={styles.submitAction}>
              <Button
                disabled={!displayName.trim() || createPerson.isPending}
                label="Create person"
                loading={createPerson.isPending}
                onPress={() => void create()}
                testID="task-person-create-submit"
              />
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const ACTION_SELECTED_BACKGROUND = DynamicColorIOS({
  light: withAlpha(palette.light.primary, 0.15),
  dark: withAlpha(palette.dark.primary, 0.15),
});

const styles = StyleSheet.create({
  container: { gap: 12 },
  selectedList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  personChip: {
    backgroundColor: ACTION_SELECTED_BACKGROUND,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  personName: { ...theme.typography.footnote, color: theme.colors.foreground },
  removeIcon: { ...theme.typography.footnote, color: theme.colors.mutedForeground },
  resultRow: {
    borderColor: theme.colors.border,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  resultName: { color: theme.colors.foreground },
  resultEmail: { color: theme.colors.mutedForeground },
  createForm: { gap: 12 },
  createError: { ...theme.typography.footnote, color: theme.colors.destructive },
  createActions: { flexDirection: 'row', gap: 8 },
  cancelAction: { flex: 1 },
  submitAction: { flex: 1 },
});
