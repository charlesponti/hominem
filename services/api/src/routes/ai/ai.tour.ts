import { openai } from '@ai-sdk/openai';
import { UnauthorizedError, ValidationError, InternalError } from '@hominem/services';
import { logger } from '@hominem/utils/logger';
import { zValidator } from '@hono/zod-validator';
import { generateObject } from 'ai';
import { Hono } from 'hono';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as z from 'zod';

import type { AppEnv } from '../../server';

const TourCostBreakdown = z.object({
  transportation: z.object({
    vehicleRental: z.number(),
    fuel: z.number(),
    flights: z.number().optional(),
    equipmentTransport: z.number(),
  }),
  accommodation: z.object({
    hotelCosts: z.number(),
    numberOfNights: z.number(),
    crewAccommodation: z.number(),
  }),
  venues: z.object({
    averageVenueCost: z.number(),
    equipmentRental: z.number(),
    staffing: z.number(),
    insurance: z.number(),
  }),
  routing: z.array(
    z.object({
      city: z.string(),
      dateRange: z.string(),
      distanceFromPrevious: z.number().optional(),
    }),
  ),
  totalCost: z.number(),
});

const inputSchema = z.object({
  startingDate: z.string().optional(),
  startCity: z.string().min(1),
  endCity: z.string().min(1),
  genres: z.array(z.string()).optional(),
  numberOfBandMembers: z.number().min(1).default(4),
  numberOfCrewMembers: z.number().min(0).default(2),
  durationInDays: z.number().min(1).max(90).default(14),
});

export const aiTourRoutes = new Hono<AppEnv>();

// Generate tour cost breakdown
aiTourRoutes.post('/', zValidator('json', inputSchema), async (c) => {
  const user = c.get('user');
  if (!user) {
    throw new UnauthorizedError('Unauthorized');
  }

  try {
    const input = c.req.valid('json');
    const { genres = [] } = input;

    // Read the prompt template from the markdown file
    const promptTemplatePath = path.join(
      process.cwd(), // Use current working directory
      'src', // Relative path from CWD to src
      'prompts',
      'tour-cost-breakdown.md',
    );
    const promptTemplate = await fs.readFile(promptTemplatePath, 'utf-8');

    // Inject variables into the prompt template
    let prompt = promptTemplate
      .replace('{{durationInDays}}', input.durationInDays.toString())
      .replace('{{startCity}}', input.startCity)
      .replace('{{endCity}}', input.endCity)
      .replace('{{numberOfBandMembers}}', input.numberOfBandMembers.toString())
      .replace('{{numberOfCrewMembers}}', input.numberOfCrewMembers.toString())
      .replace('{{startingDate}}', input.startingDate || new Date().toISOString());

    const genresListBlock = genres.length > 0 ? `- Music genre: ${genres.join(', ')}` : '';
    prompt = prompt.replace('{{genresListBlock}}', genresListBlock);

    const genresForOptimization = genres.length > 0 ? genres.join('/') : 'generic';
    prompt = prompt.replace('{{genresForOptimization}}', genresForOptimization);

    const { object: tourBreakdown } = await generateObject({
      model: openai('gpt-4o-mini'),
      prompt,
      schema: TourCostBreakdown,
      temperature: 0.7,
    });

    return c.json(tourBreakdown);
  } catch (err) {
    if (err instanceof z.ZodError) {
      throw new ValidationError('Invalid input', { details: err.issues });
    }
    logger.error('Error generating tour breakdown', { error: err });
    throw new InternalError('Failed to generate tour breakdown');
  }
});
