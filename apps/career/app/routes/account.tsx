import {
  CareerRepository,
  CertificationRepository,
  SocialLinksRepository,
  db,
  type CareerCertificationRecord,
} from '@hominem/db';
import { TextField } from '@ponti-studios/ui/forms';
import { Button } from '@ponti-studios/ui/primitives';
import { redirect } from 'react-router';
import { Form } from 'react-router';

import { logger } from '~/lib/logger';
import { userContext } from '~/lib/middleware';

import type { Route } from './+types/account';

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext);
  if (!user) throw redirect('/login');

  const [profile, socialLinks, certifications] = await Promise.all([
    CareerRepository.getProfile(db, user.id),
    SocialLinksRepository.get(db, user.id),
    CertificationRepository.list(db, user.id),
  ]);

  return { user, profile, socialLinks, certifications };
}

export async function action({ context, request }: Route.ActionArgs) {
  const user = context.get(userContext);
  if (!user) throw redirect('/login');

  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'update-social-links') {
    await SocialLinksRepository.save(db, user.id, {
      github: (formData.get('github') as string) || null,
      linkedin: (formData.get('linkedin') as string) || null,
      twitter: (formData.get('twitter') as string) || null,
      website: (formData.get('website') as string) || null,
    });
    return { ok: true };
  }

  if (intent === 'add-certification') {
    const name = (formData.get('name') as string)?.trim();
    const issuingOrganization = (formData.get('issuingOrganization') as string)?.trim();
    if (name && issuingOrganization) {
      await CertificationRepository.create(db, user.id, {
        name,
        issuingOrganization,
        issueDate: (formData.get('issueDate') as string) || null,
      });
    }
    return { ok: true };
  }

  if (intent === 'delete-certification') {
    const id = formData.get('id');
    if (typeof id === 'string') {
      await CertificationRepository.remove(db, user.id, id);
    }
    return { ok: true };
  }

  logger.error('Unknown account action intent', undefined, { intent, owner_userid: user.id });
  return { ok: false };
}

export const meta = () => [{ title: 'Profile | career' }];

function CertificationRow({ certification }: { certification: CareerCertificationRecord }) {
  return (
    <div className="flex items-center justify-between py-3">
      <div className="min-w-0">
        <p className="body-2 truncate">{certification.name}</p>
        <p className="footnote text-muted-foreground truncate">
          {certification.issuingOrganization}
          {certification.issueDate && ` • ${certification.issueDate}`}
        </p>
      </div>
      <Form method="post" navigate={false}>
        <input type="hidden" name="intent" value="delete-certification" />
        <input type="hidden" name="id" value={certification.id} />
        <button
          type="submit"
          className="footnote text-muted-foreground hover:text-destructive-text"
        >
          Remove
        </button>
      </Form>
    </div>
  );
}

export default function AccountRoute({ loaderData }: Route.ComponentProps) {
  const { user, profile, socialLinks, certifications } = loaderData;

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="heading-2 mb-6">Your Profile</h1>

        <div className="rounded-lg border border-border p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="footnote text-muted-foreground">Name</p>
              <p className="body-2">
                {profile?.firstName ?? '—'} {profile?.lastName ?? ''}
              </p>
            </div>
            <div>
              <p className="footnote text-muted-foreground">Email</p>
              <p className="body-2">{profile?.email ?? user.email ?? '—'}</p>
            </div>
            <div>
              <p className="footnote text-muted-foreground">Phone</p>
              <p className="body-2">{profile?.phone ?? '—'}</p>
            </div>
            <div>
              <p className="footnote text-muted-foreground">Location</p>
              <p className="body-2">{profile?.location ?? '—'}</p>
            </div>
            <div>
              <p className="footnote text-muted-foreground">Industry</p>
              <p className="body-2">{profile?.industry ?? '—'}</p>
            </div>
            {profile?.linkedinUrl && (
              <div>
                <p className="footnote text-muted-foreground">LinkedIn</p>
                <a
                  href={profile.linkedinUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="body-2 text-blue-600 hover:underline"
                >
                  {profile.linkedinUrl}
                </a>
              </div>
            )}
          </div>

          {profile?.headline && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="footnote text-muted-foreground">Headline</p>
              <p className="body-2">{profile.headline}</p>
            </div>
          )}

          {profile?.summary && (
            <div className="mt-4 pt-4 border-t border-border">
              <p className="footnote text-muted-foreground">Summary</p>
              <p className="body-2 whitespace-pre-wrap">{profile.summary}</p>
            </div>
          )}
        </div>
      </div>

      <div>
        <h2 className="heading-3 mb-4">Social links</h2>
        <Form method="post" className="rounded-lg border border-border p-6">
          <input type="hidden" name="intent" value="update-social-links" />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="GitHub"
              name="github"
              defaultValue={socialLinks?.github ?? ''}
              placeholder="https://github.com/you"
            />
            <TextField
              label="LinkedIn"
              name="linkedin"
              defaultValue={socialLinks?.linkedin ?? ''}
              placeholder="https://linkedin.com/in/you"
            />
            <TextField
              label="Twitter / X"
              name="twitter"
              defaultValue={socialLinks?.twitter ?? ''}
              placeholder="https://x.com/you"
            />
            <TextField
              label="Website"
              name="website"
              defaultValue={socialLinks?.website ?? ''}
              placeholder="https://you.dev"
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button type="submit">Save social links</Button>
          </div>
        </Form>
      </div>

      <div>
        <h2 className="heading-3 mb-4">Certifications</h2>
        <div className="rounded-lg border border-border p-6">
          {certifications.length > 0 && (
            <div className="divide-y divide-border mb-4">
              {certifications.map((certification) => (
                <CertificationRow key={certification.id} certification={certification} />
              ))}
            </div>
          )}
          <Form method="post" navigate={false} className="grid grid-cols-3 gap-4 items-end">
            <input type="hidden" name="intent" value="add-certification" />
            <TextField label="Name" name="name" required placeholder="AWS Certified" />
            <TextField label="Issuing organization" name="issuingOrganization" required />
            <TextField label="Issue date" name="issueDate" />
            <div className="col-span-3">
              <Button type="submit" variant="outline">
                Add certification
              </Button>
            </div>
          </Form>
        </div>
      </div>
    </div>
  );
}
