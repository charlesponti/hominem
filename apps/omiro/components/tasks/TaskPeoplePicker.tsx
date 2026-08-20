import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from 'react-native';

import { makeStyles, withAlpha } from '~/components/theme';
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
    <View style={styles.s0} testID="time-block-people">
      <View style={styles.s1}>
        {selected.map((person) => (
          <Pressable
            key={person.id}
            accessibilityLabel={`Remove ${person.displayName}`}
            style={styles.s2}
            onPress={() => removePerson(person.id)}
            testID={`task-person-selected-${person.id}`}
          >
            <Text style={styles.s3}>{person.displayName}</Text>
            <Text style={styles.s4}>×</Text>
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
              style={styles.s5}
              onPress={() => addPerson(person)}
              testID={`task-person-result-${person.id}`}
            >
              <Text style={styles.s6}>{person.displayName}</Text>
              {person.email ? <Text style={styles.s7}>{person.email}</Text> : null}
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
        <View style={styles.s8}>
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
            <Text style={styles.s9} testID="task-person-create-error">
              {createError}
            </Text>
          ) : null}
          <View style={styles.s10}>
            <View style={styles.s11}>
              <Button label="Cancel" onPress={() => setIsCreating(false)} variant="secondary" />
            </View>
            <View style={styles.s12}>
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

const styles = makeStyles((theme) => ({
  s0: { gap: 12 },
  s1: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  s2: {
    backgroundColor: withAlpha(theme.colors.primary, 0.15),
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  s3: { ...theme.typography.footnote, color: theme.colors.foreground },
  s4: { ...theme.typography.footnote, color: theme.colors.mutedForeground },
  s5: {
    borderColor: theme.colors.border,
    borderRadius: 6,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  s6: { color: theme.colors.foreground },
  s7: { color: theme.colors.mutedForeground },
  s8: { gap: 12 },
  s9: { ...theme.typography.footnote, color: theme.colors.destructive },
  s10: { flexDirection: 'row', gap: 8 },
  s11: { flex: 1 },
  s12: { flex: 1 },
}));
