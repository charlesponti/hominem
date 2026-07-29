import * as z from 'zod';

import { CareerService } from '../../application/career.service';
import { MCP_SCOPES } from '../../auth/better-auth';
import {
  careerExperiencesQuerySchema,
  careerExperiencesSchema,
  careerPortfolioSchema,
} from '../../schemas/career.schema';
import { logRedaction } from '../evidence';
import { registerTool } from '../tools';

const careerService = new CareerService();

// No-input schema — the tool resolves the authenticated user's portfolio internally
const noInputSchema = z.object({});
const portfolioResultSchema = z.object({ portfolio: careerPortfolioSchema.nullable() });

/** Fields redacted from work experience responses for privacy */
const REDACTED_FIELDS = [
  'baseSalary',
  'signingBonus',
  'annualBonus',
  'currency',
  'bonusHistory',
  'salaryAdjustments',
  'salaryRange',
  'benefits',
  'performanceRatings',
  'reasonForLeaving',
  'exitNotes',
  'reportsTo',
  'directReports',
  'teamSize',
];

registerTool(
  'get_career_portfolio',
  {
    name: 'get_career_portfolio',
    title: 'Get your career portfolio',
    description:
      'Returns your own career portfolio data (name, title, bio, work experiences, skills — no compensation data).',
    inputSchema: noInputSchema,
    outputSchema: portfolioResultSchema,
    readOnly: true,
    scopes: MCP_SCOPES,
    sensitivity: 'standard',
    resultCap: 1,
  },
  async (ownerUserId, _input) => {
    const portfolio = await careerService.getOwnPortfolio(ownerUserId);
    if (!portfolio) {
      logRedaction('get_career_portfolio', REDACTED_FIELDS, 0);
      // Per FR-006: report no-data rather than implying completeness
      return { portfolio: null };
    }
    logRedaction('get_career_portfolio', REDACTED_FIELDS, portfolio.workExperiences.length);
    return { portfolio };
  },
);

registerTool(
  'list_career_experiences',
  {
    name: 'list_career_experiences',
    title: 'List career work experiences',
    description:
      'Returns the authenticated user work experiences (role, company, dates — no compensation data).',
    inputSchema: careerExperiencesQuerySchema,
    outputSchema: careerExperiencesSchema,
    readOnly: true,
    scopes: MCP_SCOPES,
    sensitivity: 'standard',
    resultCap: 50,
  },
  async (ownerUserId, input) => {
    const parsed = careerExperiencesQuerySchema.parse(input);
    const result = await careerService.listUserExperiences(ownerUserId, parsed.limit);

    logRedaction('list_career_experiences', REDACTED_FIELDS, result.experiences.length);

    // Enforce result cap — truncate if needed
    if (result.experiences.length > 50) {
      result.experiences = result.experiences.slice(0, 50);
    }

    return result;
  },
);
