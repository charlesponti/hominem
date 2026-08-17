import { TextField } from '@ponti-studios/ui/native';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Text } from 'react-native';

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
    const person = await createPerson.mutateAsync({
      displayName: name,
      email: email.trim() || null,
    });
    addPerson(person);
    setDisplayName('');
    setEmail('');
    setIsCreating(false);
  };

  return (
    <View className="gap-3" testID="time-block-people">
      <View className="flex-row flex-wrap gap-2">
        {selected.map((person) => (
          <Pressable
            key={person.id}
            accessibilityLabel={`Remove ${person.displayName}`}
            className="bg-primary/15 flex-row items-center gap-2 rounded-full px-3 py-2"
            onPress={() => removePerson(person.id)}
            testID={`task-person-selected-${person.id}`}
          >
            <Text className="text-foreground text-footnote">{person.displayName}</Text>
            <Text className="text-muted-foreground text-footnote">×</Text>
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
              className="border-border rounded-md border px-3 py-2"
              onPress={() => addPerson(person)}
              testID={`task-person-result-${person.id}`}
            >
              <Text className="text-foreground">{person.displayName}</Text>
              {person.email ? <Text className="text-muted-foreground">{person.email}</Text> : null}
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
        <View className="gap-3">
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
          <View className="flex-row gap-2">
            <View className="flex-1">
              <Button label="Cancel" onPress={() => setIsCreating(false)} variant="secondary" />
            </View>
            <View className="flex-1">
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
