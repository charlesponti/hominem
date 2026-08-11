import type { CareerCertificationRecord } from '@hominem/db';
import { Input } from '@ponti-studios/ui/forms';
import { Button, Label } from '@ponti-studios/ui/primitives';
import { AwardIcon, Trash2Icon } from 'lucide-react';
import { useState } from 'react';

import { AddButton } from '~/components/AddButton';
import { FormErrorAlert } from '~/components/FormErrorAlert';
import type { AccountActionResult, CertificationFormValues } from '~/lib/account/types';

export function CertificationsSection({
  certifications,
  onAdd,
  onDelete,
}: {
  certifications: CareerCertificationRecord[];
  onAdd: (values: CertificationFormValues) => Promise<AccountActionResult<unknown>>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [issuingOrganization, setIssuingOrganization] = useState('');
  const [issueDate, setIssueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const result = await onAdd({ name, issuingOrganization, issueDate: issueDate || null });
      if (result.success === false) {
        setError(result.error || 'Failed to add certification');
        return;
      }
      setName('');
      setIssuingOrganization('');
      setIssueDate('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add certification');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    setError(null);
    setBusyId(id);
    try {
      await onDelete(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove certification');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="heading-3">Certifications</h2>
        <p className="body-3 text-muted-foreground">
          Licenses and certifications that back up your experience.
        </p>
      </div>

      <FormErrorAlert message={error} />

      {certifications.length > 0 && (
        <ul className="flex flex-col gap-2">
          {certifications.map((certification) => (
            <li
              key={certification.id}
              className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3"
            >
              <AwardIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="body-3 truncate text-foreground">{certification.name}</p>
                <p className="footnote truncate text-muted-foreground">
                  {certification.issuingOrganization}
                  {certification.issueDate && ` · ${certification.issueDate}`}
                </p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={busyId === certification.id}
                onClick={() => handleDelete(certification.id)}
                aria-label={`Remove ${certification.name}`}
              >
                <Trash2Icon className="size-4" />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="grid grid-cols-1 items-end gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="cert-name">Name</Label>
          <Input
            id="cert-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="AWS Certified"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cert-org">Issuing organization</Label>
          <Input
            id="cert-org"
            value={issuingOrganization}
            onChange={(e) => setIssuingOrganization(e.target.value)}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cert-date">Issue date</Label>
          <Input id="cert-date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </div>
        <div className="sm:col-span-3">
          <AddButton type="submit" label="Add certification" disabled={isSubmitting} />
        </div>
      </form>
    </section>
  );
}
