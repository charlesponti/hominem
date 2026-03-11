import { Alert, Form, Stack } from '@hominem/ui';
import { Button } from '@hominem/ui/button';
import { TextField } from '@hominem/ui/text-field';
import { type SyntheticEvent, useCallback, useId, useState } from 'react';

import { useCreateInvite } from '~/lib/hooks/use-invites';
import type { SentInvite } from '~/lib/types';

type SentInviteFormProps = {
  listId: string;
  onCreate: (invite: SentInvite) => void;
};

export default function SentInviteForm({ listId, onCreate }: SentInviteFormProps) {
  const [email, setEmail] = useState('');
  const emailId = useId();

  const mutation = useCreateInvite();

  const onNameChange = useCallback((e: SyntheticEvent<HTMLInputElement>) => {
    setEmail(e.currentTarget.value);
  }, []);

  const onFormSubmit = useCallback(
    async (e: SyntheticEvent<HTMLFormElement>) => {
      e.preventDefault();
      await mutation.mutateAsync({ listId, invitedUserEmail: email });
      setEmail('');
      onCreate({ listId, invitedUserEmail: email } as SentInvite);
    },
    [email, mutation, listId, onCreate],
  );

  return (
    <Stack gap="sm">
      {mutation.error && <Alert variant="destructive">{mutation.error.message}</Alert>}

      <Form className="flex items-center gap-1" onSubmit={onFormSubmit}>
        <TextField
          id={emailId}
          label="Email address"
          type="email"
          name="email"
          placeholder="colleague@example.com"
          value={email}
          onChange={onNameChange}
          className="flex-1 min-w-0"
          autoComplete="email"
        />

        <Button
          type="submit"
          className="px-4 py-2 font-medium"
          disabled={email.length === 0 || mutation.isPending}
        >
          <span>Invit{mutation.isPending ? <span>ing...</span> : 'e'}</span>
        </Button>
      </Form>
    </Stack>
  );
}
