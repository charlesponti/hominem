import { SkillRepository, db, type CareerSkillRecord } from '@hominem/db';
import { EmptyState } from '@ponti-studios/ui/feedback';
import { TextField } from '@ponti-studios/ui/forms';
import { SectionIntro } from '@ponti-studios/ui/layout';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@ponti-studios/ui/overlays';
import { Button } from '@ponti-studios/ui/primitives';
import { LightbulbIcon, PlusIcon, XIcon } from 'lucide-react';
import { useState } from 'react';
import { Form, useNavigation } from 'react-router';

import { logger } from '~/lib/logger';
import { userContext } from '~/lib/middleware';

import { Route } from './+types/skills';

export const meta: Route.MetaFunction = () => [
  { title: 'Skills | career' },
  { name: 'description', content: 'Skills and areas of expertise.' },
];

export async function loader({ context }: Route.LoaderArgs) {
  const user = context.get(userContext)!;

  try {
    const skills = await SkillRepository.list(db, user.id);
    return { skills };
  } catch (error) {
    logger.error('Error loading skills', error, { owner_userid: user.id });
    return { skills: [] as CareerSkillRecord[] };
  }
}

export async function action({ context, request }: Route.ActionArgs) {
  const user = context.get(userContext)!;
  const formData = await request.formData();
  const intent = formData.get('intent');

  if (intent === 'delete') {
    const id = formData.get('id');
    if (typeof id === 'string') {
      await SkillRepository.remove(db, user.id, id);
    }
    return { ok: true };
  }

  if (intent === 'create') {
    const name = formData.get('name');
    if (typeof name === 'string' && name.trim()) {
      const level = formData.get('level');
      const years = formData.get('yearsOfExperience');
      await SkillRepository.create(db, user.id, {
        name: name.trim(),
        category: (formData.get('category') as string) || null,
        level: level ? Number(level) : null,
        yearsOfExperience: years ? Number(years) : null,
      });
    }
    return { ok: true };
  }

  return { ok: false };
}

export default function SkillsRoute({ loaderData }: Route.ComponentProps) {
  const { skills } = loaderData;
  const [open, setOpen] = useState(false);
  const navigation = useNavigation();
  const isSubmitting = navigation.state === 'submitting';

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <SectionIntro title="Skills" description="Skills and areas of expertise." />
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <PlusIcon className="mr-2 size-4" />
              Add skill
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add skill</DialogTitle>
            </DialogHeader>
            <Form
              method="post"
              className="flex flex-col gap-4"
              onSubmit={() => setOpen(false)}
              navigate={false}
            >
              <input type="hidden" name="intent" value="create" />
              <TextField label="Name" name="name" required placeholder="TypeScript" />
              <TextField label="Category" name="category" placeholder="Technical" />
              <div className="grid grid-cols-2 gap-4">
                <TextField label="Level (1-100)" name="level" min={1} max={100} />
                <TextField label="Years of experience" name="yearsOfExperience" min={0} />
              </div>
              <DialogFooter>
                <Button type="submit" disabled={isSubmitting}>
                  Add skill
                </Button>
              </DialogFooter>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {skills.length === 0 ? (
        <EmptyState
          icon={<LightbulbIcon className="size-6" />}
          title="No skills yet"
          description="Add a skill to start building your profile."
          className="mt-6"
        />
      ) : (
        <div className="mt-6 flex flex-wrap gap-2">
          {skills.map((skill) => (
            <div
              key={skill.id}
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5"
            >
              <span className="body-3">{skill.name}</span>
              {skill.category && (
                <span className="footnote text-muted-foreground">{skill.category}</span>
              )}
              <Form method="post" navigate={false}>
                <input type="hidden" name="intent" value="delete" />
                <input type="hidden" name="id" value={skill.id} />
                <button
                  type="submit"
                  aria-label={`Remove ${skill.name}`}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <XIcon className="size-3.5" />
                </button>
              </Form>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
