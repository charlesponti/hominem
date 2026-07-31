import { Badge, buttonVariants, Card, CardContent } from '@ponti-studios/ui/primitives';
import { ArrowLeft } from 'lucide-react';
import type { MetaFunction } from 'react-router';
import { Link } from 'react-router';

export const meta: MetaFunction = () => {
  return [
    { title: 'Sarah Chen | career' },
    {
      name: 'description',
      content: 'Demo portfolio showcasing a career professional portfolio',
    },
  ];
};

const demoPortfolio = {
  personalInfo: {
    name: 'Sarah Chen',
    title: 'Senior Product Designer',
    tagline:
      'I design digital experiences that connect user needs and business objectives with accessible, sustainable product systems.',
    bio: "With over 8 years in product design, I've led design initiatives at both high-growth startups and Fortune 500 companies.",
    location: 'San Francisco, CA',
    email: 'sarah.chen@example.com',
    availability: 'Available for new opportunities',
    stats: [
      { value: '8+', label: 'Years Experience' },
      { value: '50M+', label: 'Users Impacted' },
      { value: '15+', label: 'Product Launches' },
      { value: '95%', label: 'User Satisfaction' },
    ],
  },
  workExperience: [
    {
      title: 'Stripe',
      role: 'Senior Product Designer',
      start_date: '2022-01-01',
      end_date: null,
      description:
        "Leading design for Stripe's next-generation payment processing platform, focusing on developer experience and enterprise merchant tools.",
      metrics:
        'Improved developer onboarding completion rate by 40% and reduced time-to-first-payment by 60%',
      tags: ['Product Strategy', 'Developer Experience', 'Enterprise Design', 'Design Systems'],
    },
    {
      title: 'Figma',
      role: 'Product Designer',
      start_date: '2020-03-01',
      end_date: '2021-12-31',
      description:
        "Designed collaboration features for Figma's web platform, including real-time commenting, version history, and team libraries.",
      metrics:
        'Increased daily active collaborators by 300% and improved team adoption rate by 85%',
      tags: ['Collaboration', 'Real-time Systems', 'Team Workflows'],
    },
  ],
  skills: [
    ['Design', 'Product Design', 'UX Research', 'Design Systems', 'Prototyping', 'User Testing'],
    ['Tools', 'Figma', 'Sketch', 'Principle', 'Framer', 'Adobe Creative Suite'],
    ['Development', 'HTML/CSS', 'JavaScript', 'React', 'Design Tokens'],
  ],
  projects: [
    {
      title: 'Stripe Dashboard Redesign',
      description:
        'Complete redesign of the merchant dashboard with focus on data visualization and workflow optimization.',
      tags: ['Product Design', 'Data Visualization', 'Enterprise'],
    },
    {
      title: 'Figma Comments System',
      description: 'Real-time commenting and feedback system for design collaboration.',
      tags: ['Collaboration', 'Real-time', 'UX'],
    },
  ],
};

export default function Demo() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <Link to="/" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
          <ArrowLeft className="size-4" />
          Back to career
        </Link>
        <Badge variant="outline">Demo Portfolio</Badge>
      </div>

      <Card>
        <CardContent>
          <header className="space-y-6">
            <div className="space-y-3">
              <h1 className="heading-1 text-foreground">{demoPortfolio.personalInfo.name}</h1>
              <p className="subheading-2 text-muted-foreground">
                {demoPortfolio.personalInfo.title}
              </p>
              <p className="body-2 text-muted-foreground">{demoPortfolio.personalInfo.tagline}</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-4">
              {demoPortfolio.personalInfo.stats.map((stat) => (
                <div key={stat.label} className="rounded-md border border-border bg-muted/40 p-3">
                  <div className="heading-4 text-foreground">{stat.value}</div>
                  <div className="body-4 text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap gap-3 body-3 text-muted-foreground">
              <span>{demoPortfolio.personalInfo.location}</span>
              <span>{demoPortfolio.personalInfo.email}</span>
              <span className="text-success">{demoPortfolio.personalInfo.availability}</span>
            </div>
          </header>

          <section className="space-y-3">
            <h2 className="heading-3 text-foreground">About</h2>
            <p className="body-2 text-muted-foreground">{demoPortfolio.personalInfo.bio}</p>
          </section>

          <section className="space-y-5">
            <h2 className="heading-3 text-foreground">Experience</h2>
            {demoPortfolio.workExperience.map((job) => (
              <div key={`${job.title}-${job.start_date}`} className="border-l border-border pl-5">
                <div className="flex flex-col justify-between gap-2 sm:flex-row">
                  <div>
                    <h3 className="heading-4 text-foreground">{job.title}</h3>
                    <p className="body-3 text-muted-foreground">{job.role}</p>
                  </div>
                  <p className="body-4 text-muted-foreground">
                    {new Date(job.start_date).getFullYear()} -{' '}
                    {job.end_date ? new Date(job.end_date).getFullYear() : 'Present'}
                  </p>
                </div>
                <p className="body-3 mt-3 text-muted-foreground">{job.description}</p>
                <p className="body-4 mt-2 text-muted-foreground">{job.metrics}</p>
                <TagList tags={job.tags} />
              </div>
            ))}
          </section>

          <section className="space-y-5">
            <h2 className="heading-3 text-foreground">Skills</h2>
            {demoPortfolio.skills.map(([category, ...skills]) => (
              <div key={category} className="space-y-3">
                <h3 className="heading-4 text-foreground">{category}</h3>
                <TagList tags={skills} />
              </div>
            ))}
          </section>

          <section className="space-y-5">
            <h2 className="heading-3 text-foreground">Featured Projects</h2>
            {demoPortfolio.projects.map((project) => (
              <div key={project.title} className="rounded-md border border-border bg-muted/30 p-4">
                <h3 className="heading-4 text-foreground">{project.title}</h3>
                <p className="body-3 mt-2 text-muted-foreground">{project.description}</p>
                <TagList tags={project.tags} />
              </div>
            ))}
          </section>
        </CardContent>
      </Card>
    </div>
  );
}

function TagList({ tags }: { tags: string[] }) {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {tags.map((tag) => (
        <Badge key={tag} variant="outline">
          {tag}
        </Badge>
      ))}
    </div>
  );
}
