import type { CareerSocialLinksRecord } from '@hominem/db';
import { describe, expect, it } from 'vitest';

import type { ResumePortfolio } from '../portfolio.server';
import { formatPortfolioForLLM } from './portfolio-formatter';

const mockSocialLinks = {
  id: 'sl-1',
  ownerUserid: 'test-user-id',
  github: 'https://github.com/johndoe',
  linkedin: 'https://linkedin.com/in/johndoe',
  twitter: 'https://twitter.com/johndoe',
  website: 'https://johndoe.dev',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
} as CareerSocialLinksRecord;

const createMockPortfolio = (overrides: Partial<ResumePortfolio> = {}): ResumePortfolio => ({
  name: 'John Doe',
  jobTitle: 'Senior Software Engineer',
  currentLocation: 'San Francisco, CA',
  email: 'john.doe@example.com',
  phone: '+1 (555) 123-4567',
  bio: 'Passionate full-stack developer with 5+ years of experience building scalable web applications.',
  workExperiences: [
    {
      role: 'Senior Full Stack Developer',
      company: 'TechCorp Inc',
      startDate: '2022-01-01',
      endDate: null,
      description:
        'Led development of key features and mentored junior developers. Implemented CI/CD pipelines and improved deployment efficiency by 40%.',
    },
    {
      role: 'Frontend Developer',
      company: 'StartupXYZ',
      startDate: '2020-06-01',
      endDate: '2021-12-31',
      description:
        'Developed MVP for a fintech startup. Built responsive web application from scratch using modern technologies.',
    },
  ],
  skills: [
    {
      name: 'React',
      level: 90,
      category: 'Frontend',
      yearsOfExperience: 5,
      description: 'Expert in React development with hooks and context',
    },
    {
      name: 'Node.js',
      level: 85,
      category: 'Backend',
      yearsOfExperience: 4,
      description: 'Strong backend development skills',
    },
    {
      name: 'Docker',
      level: 75,
      category: null,
      yearsOfExperience: null,
      description: null,
    },
  ],
  projects: [
    {
      title: 'E-commerce Platform',
      status: 'completed',
      description:
        'Built a full-stack e-commerce platform with payment integration and admin dashboard.',
      technologies: ['React', 'Node.js', 'PostgreSQL', 'Stripe'],
      liveUrl: 'https://ecommerce-demo.com',
      githubUrl: 'https://github.com/johndoe/ecommerce',
    },
    {
      title: 'Task Management App',
      status: 'in-progress',
      description: 'A collaborative task management application with real-time updates.',
      technologies: ['Vue.js', 'Express', 'Socket.io'],
      liveUrl: null,
      githubUrl: 'https://github.com/johndoe/task-manager',
    },
  ],
  ...overrides,
});

describe('formatPortfolioForLLM', () => {
  it('should format complete portfolio data correctly', () => {
    const portfolio = createMockPortfolio();
    const result = formatPortfolioForLLM(portfolio, mockSocialLinks);

    expect(result).toContain('CANDIDATE PROFILE:');
    expect(result).toContain('Name: John Doe');
    expect(result).toContain('Current Role: Senior Software Engineer');
    expect(result).toContain('Location: San Francisco, CA');
    expect(result).toContain('Email: john.doe@example.com');
    expect(result).toContain('Phone: +1 (555) 123-4567');
  });

  it('should include professional summary', () => {
    const portfolio = createMockPortfolio();
    const result = formatPortfolioForLLM(portfolio, mockSocialLinks);

    expect(result).toContain('PROFESSIONAL SUMMARY:');
    expect(result).toContain('Passionate full-stack developer with 5+ years');
  });

  it('should format social links correctly', () => {
    const portfolio = createMockPortfolio();
    const result = formatPortfolioForLLM(portfolio, mockSocialLinks);

    expect(result).toContain('CONTACT LINKS:');
    expect(result).toContain('- LinkedIn: https://linkedin.com/in/johndoe');
    expect(result).toContain('- GitHub: https://github.com/johndoe');
    expect(result).toContain('- Website: https://johndoe.dev');
    expect(result).toContain('- Twitter: https://twitter.com/johndoe');
  });

  it('should handle missing social links gracefully', () => {
    const portfolio = createMockPortfolio();
    const result = formatPortfolioForLLM(portfolio, null);

    expect(result).toContain('CONTACT LINKS:');
    expect(result).not.toContain('- LinkedIn:');
    expect(result).not.toContain('- GitHub:');
  });

  it('should format work experience with dates', () => {
    const portfolio = createMockPortfolio();
    const result = formatPortfolioForLLM(portfolio, mockSocialLinks);

    expect(result).toContain('WORK EXPERIENCE:');
    expect(result).toContain('1. Senior Full Stack Developer at TechCorp Inc (Jan 2022 - Present)');
    expect(result).toContain('2. Frontend Developer at StartupXYZ (Jun 2020 - Dec 2021)');
  });

  it('should handle missing work experience dates', () => {
    const portfolio = createMockPortfolio({
      workExperiences: [
        {
          ...createMockPortfolio().workExperiences[0],
          startDate: null,
          endDate: null,
          description: null,
        },
      ],
    });
    const result = formatPortfolioForLLM(portfolio, mockSocialLinks);

    expect(result).toContain('(Unknown - Present)');
  });

  it('should categorize skills correctly', () => {
    const portfolio = createMockPortfolio();
    const result = formatPortfolioForLLM(portfolio, mockSocialLinks);

    expect(result).toContain('SKILLS:');
    expect(result).toContain('Frontend:');
    expect(result).toContain('- React (90% proficiency) - 5 years - Expert in React development');
    expect(result).toContain('Backend:');
    expect(result).toContain(
      '- Node.js (85% proficiency) - 4 years - Strong backend development skills',
    );
    expect(result).toContain('Other:');
    expect(result).toContain('- Docker (75% proficiency)');
  });

  it('should format projects with technologies and URLs', () => {
    const portfolio = createMockPortfolio();
    const result = formatPortfolioForLLM(portfolio, mockSocialLinks);

    expect(result).toContain('PROJECTS:');
    expect(result).toContain('1. E-commerce Platform (completed)');
    expect(result).toContain('Technologies: React, Node.js, PostgreSQL, Stripe');
    expect(result).toContain('Live URL: https://ecommerce-demo.com');
    expect(result).toContain('GitHub: https://github.com/johndoe/ecommerce');

    expect(result).toContain('2. Task Management App (in-progress)');
    expect(result).toContain('Technologies: Vue.js, Express, Socket.io');
    expect(result).toContain('GitHub: https://github.com/johndoe/task-manager');
    expect(result).not.toContain('Live URL: null');
  });

  it('should handle missing phone number', () => {
    const portfolio = createMockPortfolio({
      phone: null,
    });
    const result = formatPortfolioForLLM(portfolio, mockSocialLinks);

    expect(result).toContain('Name: John Doe');
    expect(result).toContain('Email: john.doe@example.com');
    expect(result).not.toContain('Phone:');
  });

  it('should handle empty arrays gracefully', () => {
    const portfolio = createMockPortfolio({
      workExperiences: [],
      skills: [],
      projects: [],
    });
    const result = formatPortfolioForLLM(portfolio, mockSocialLinks);

    expect(result).toContain('CANDIDATE PROFILE:');
    expect(result).toContain('WORK EXPERIENCE:');
    expect(result).toContain('SKILLS:');
    expect(result).toContain('PROJECTS:');
  });

  it('should handle skills without optional fields', () => {
    const portfolio = createMockPortfolio({
      skills: [
        {
          name: 'JavaScript',
          level: 80,
          category: 'Programming',
          yearsOfExperience: null,
          description: null,
        },
      ],
    });
    const result = formatPortfolioForLLM(portfolio, mockSocialLinks);

    expect(result).toContain('Programming:');
    expect(result).toContain('- JavaScript (80% proficiency)');
    expect(result).not.toContain('- JavaScript (80% proficiency) - ');
  });

  it('should handle projects without optional URLs', () => {
    const portfolio = createMockPortfolio({
      projects: [
        {
          title: 'Simple App',
          status: 'completed',
          description: 'A basic application',
          technologies: [],
          liveUrl: null,
          githubUrl: null,
        },
      ],
    });
    const result = formatPortfolioForLLM(portfolio, mockSocialLinks);

    expect(result).toContain('1. Simple App (completed)');
    expect(result).toContain('Description: A basic application');
    expect(result).not.toContain('Live URL:');
  });
});
