import { useEffect, useState } from 'react';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select';
import { isInvitableRole, useUpdateMemberRole } from '~/hooks/use-collections';

export function RoleSelect({
  collectionId,
  memberId,
  role,
}: {
  collectionId: string;
  memberId: string;
  role: 'editor' | 'viewer';
}) {
  const updateRole = useUpdateMemberRole(collectionId);
  const [value, setValue] = useState(role);

  useEffect(() => setValue(role), [role]);

  function handleChange(next: string) {
    if (!isInvitableRole(next) || next === value) return;
    const previous = value;
    setValue(next);
    updateRole.mutate({ memberId, role: next }, { onError: () => setValue(previous) });
  }

  return (
    <Select disabled={updateRole.isPending} onValueChange={handleChange} value={value}>
      <SelectTrigger aria-label="Collaborator role" className="w-24" size="sm">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="viewer">Viewer</SelectItem>
        <SelectItem value="editor">Editor</SelectItem>
      </SelectContent>
    </Select>
  );
}
