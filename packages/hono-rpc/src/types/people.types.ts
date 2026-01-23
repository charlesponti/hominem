import { z } from 'zod';

import type { EmptyInput } from './utils';

import { peopleCreateSchema } from '../routes/people';

export type { PeopleListOutput, PeopleCreateOutput } from '../lib/typed-routes';

export type PeopleListInput = EmptyInput;
export type PeopleCreateInput = z.infer<typeof peopleCreateSchema>;
