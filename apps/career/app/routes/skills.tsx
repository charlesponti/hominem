import type { SkillRecord } from '@hominem/db';
import { db, runInTransaction, SkillRepository } from '@hominem/db';
import { FilterChip } from '@ponti-studios/ui/data-display';
import {
  Field,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@ponti-studios/ui/forms';
import { SectionIntro } from '@ponti-studios/ui/layout';
import { Button, Card, CardContent } from '@ponti-studios/ui/primitives';
import { LoaderPinwheel, PlusIcon, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useFetcher } from 'react-router';

import { FormErrorAlert } from '../components/FormErrorAlert';
import { useCareerEditorSubmission } from '../hooks/useCareerEditorSubmission';
import { logger } from '../lib/logger';
import { portfolioContext, userContext } from '../lib/middleware';
import { Route } from './+types/skills';

export const meta: Route.MetaFunction = () => [{ title: 'Skills | career' }];

type EditableSkill = Partial<SkillRecord> & {
  name: string;
  level: number;
  portfolioId: string;
  proof?: string | null;
  aiDerived?: boolean;
};

const CATEGORY_LABELS: Record<string, string> = {
  technical: 'Technical',
  data: 'Data',
  design: 'Design',
  product: 'Product',
  leadership: 'Leadership',
  other: 'Other',
};

const CATEGORY_ORDER = ['technical', 'data', 'design', 'product', 'leadership', 'other'];

interface SkillsEditorSectionProps {
  skills?: SkillRecord[] | null;
  portfolioId: string;
}

function SkillsEditorSection({ skills: initialSkills, portfolioId }: SkillsEditorSectionProps) {
  const [skills, setSkills] = useState<EditableSkill[]>(initialSkills || []);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState('technical');

  const saveFetcher = useFetcher();
  const deriveFetcher = useFetcher<{
    success: boolean;
    skills?: EditableSkill[];
    error?: string;
  }>();

  const { submissionError, clearSubmissionError } = useCareerEditorSubmission({
    fetcher: saveFetcher,
    errorMessage: "We couldn't save your skills. Try again.",
  });

  useEffect(() => {
    setSkills(initialSkills || []);
  }, [initialSkills]);

  useEffect(() => {
    if (deriveFetcher.data?.success && deriveFetcher.data.skills) {
      setSkills(deriveFetcher.data.skills as EditableSkill[]);
    }
  }, [deriveFetcher.data]);

  const saveSkills = (updatedSkills: EditableSkill[]) => {
    const formData = new FormData();
    formData.append(
      'skillsData',
      JSON.stringify(
        updatedSkills.map((skill) => ({
          id: skill.id,
          name: skill.name,
          category: skill.category,
          level: skill.level,
          portfolioId: skill.portfolioId,
        })),
      ),
    );
    clearSubmissionError();
    saveFetcher.submit(formData, { method: 'POST', action: '/skills' });
  };

  const handleRemoveSkill = (skillToRemove: EditableSkill) => {
    const updated = skills.filter((s) => (s.id ? s.id !== skillToRemove.id : s !== skillToRemove));
    setSkills(updated);
    saveSkills(updated);
  };

  const handleAddSkill = () => {
    if (!newSkillName.trim()) return;
    const newSkill: EditableSkill = {
      name: newSkillName.trim(),
      category: newSkillCategory,
      level: 70,
      portfolioId,
    };
    const updated = [...skills, newSkill];
    setSkills(updated);
    saveSkills(updated);
    setNewSkillName('');
    setShowAddForm(false);
  };

  const skillsByCategory = skills.reduce(
    (acc, skill) => {
      const category = skill.category || 'other';
      if (!acc[category]) acc[category] = [];
      acc[category].push(skill);
      return acc;
    },
    {} as Record<string, EditableSkill[]>,
  );

  const sortedCategories = Object.keys(skillsByCategory).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  const isSaving = saveFetcher.state === 'submitting';
  const isDeriving = deriveFetcher.state === 'submitting';
  const deriveError = deriveFetcher.data?.success === false ? deriveFetcher.data.error : null;

  return (
    <section className="flex flex-col gap-6">
      <SectionIntro
        title="Skills"
        actions={
          <>
            <Button
              type="button"
              variant="default"
              size="icon"
              onClick={() => setShowAddForm((v) => !v)}
              aria-label="Add skill"
            >
              <PlusIcon className="size-4" />
            </Button>
            <deriveFetcher.Form method="POST" action="/api/skills/derive">
              <Button
                type="submit"
                variant="outline"
                size="icon"
                disabled={isDeriving}
                aria-label={isDeriving ? 'Deriving skills' : 'Derive skills from work history'}
              >
                {isDeriving ? (
                  <LoaderPinwheel className="size-4 animate-spin" />
                ) : (
                  <Sparkles className="size-4" />
                )}
              </Button>
            </deriveFetcher.Form>
          </>
        }
      />

      <FormErrorAlert title="Skills weren't saved" message={submissionError} />
      <FormErrorAlert title="Couldn't derive skills" message={deriveError} />

      {showAddForm && (
        <Card>
          <CardContent>
            <div className="flex flex-col sm:flex-row items-end gap-3">
              <Field label="Skill">
                <Input
                  placeholder="e.g. TypeScript"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                  autoFocus
                />
              </Field>
              <Field label="Category">
                <Select value={newSkillCategory} onValueChange={(v) => v && setNewSkillCategory(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORY_ORDER.map((cat) => (
                      <SelectItem key={cat} value={cat}>
                        {CATEGORY_LABELS[cat]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <div className="flex gap-2 pb-0.5">
                <Button
                  type="button"
                  size="sm"
                  onClick={handleAddSkill}
                  disabled={!newSkillName.trim()}
                >
                  Add
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setShowAddForm(false);
                    setNewSkillName('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isSaving && (
        <div className="flex items-center gap-2 body-3 text-muted-foreground">
          <LoaderPinwheel className="size-4 animate-spin" />
          Saving…
        </div>
      )}

      {skills.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          <p className="body-3">No skills yet.</p>
          <p className="mt-1 body-3">
            Click <Sparkles className="inline size-3.5 mx-0.5" /> to extract skills from your work
            history, or <PlusIcon className="inline size-3.5 mx-0.5" /> to add one manually.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-border bg-card divide-y divide-border">
          {sortedCategories.map((category) => (
            <div key={category} className="px-4 py-3">
              <p className="ui-eyebrow mb-3">{CATEGORY_LABELS[category] ?? category}</p>
              <div className="flex flex-wrap gap-2">
                {skillsByCategory[category].map((skill, index) => (
                  <FilterChip
                    key={skill.id ?? `${category}-${index}`}
                    label={skill.name}
                    onRemove={() => handleRemoveSkill(skill)}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export async function loader({ context }: Route.LoaderArgs) {
  const portfolio = context.get(portfolioContext)!;
  const skills = await db
    .selectFrom('app.skills')
    .selectAll()
    .where('portfolioId', '=', portfolio.id)
    .orderBy('sortOrder', 'asc')
    .execute();
  return { skills, portfolioId: portfolio.id };
}

export async function action({ request, context }: Route.ActionArgs) {
  const user = context.get(userContext);
  if (!user) {
    return { success: false, error: 'Sign in again before saving your skills.' };
  }

  const portfolio = context.get(portfolioContext);
  if (!portfolio) {
    return { success: false, error: 'No portfolio found.' };
  }

  const formData = await request.formData();
  const skillsDataRaw = formData.get('skillsData');

  if (typeof skillsDataRaw !== 'string') {
    return { success: false, error: 'Invalid skills data.' };
  }

  try {
    const skillsData = JSON.parse(skillsDataRaw) as Array<{
      id?: string;
      name: string;
      category?: string;
      level?: number;
      portfolioId: string;
    }>;

    await runInTransaction((tx) =>
      SkillRepository.replaceSkills(tx, {
        ownerUserid: user.id,
        portfolioId: portfolio.id,
        skills: skillsData.map((skill, index) => ({
          name: skill.name,
          category: skill.category,
          level: skill.level ?? 70,
          aiDerived: false,
          proof: null,
          sortOrder: index,
        })),
      }),
    );

    return { success: true };
  } catch (error) {
    logger.error('Failed to save skills', error, {
      owner_userid: user.id,
      portfolioId: portfolio.id,
    });
    return { success: false, error: "We couldn't save your skills. Try again." };
  }
}

export default function Skills({ loaderData }: Route.ComponentProps) {
  return <SkillsEditorSection skills={loaderData.skills} portfolioId={loaderData.portfolioId} />;
}
