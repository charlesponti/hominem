import { resolver } from 'hono-openapi';

import { errorResponseSchema } from '../schemas/common';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SchemaType = any;

/**
 * Common HTTP error responses for reuse across routes
 */
export const commonResponses: Record<
  number,
  {
    description: string;
    content: {
      'application/json': {
        schema: SchemaType;
      };
    };
  }
> = {
  400: {
    description: 'Bad Request - Invalid input data',
    content: {
      'application/json': {
        schema: resolver(errorResponseSchema),
      },
    },
  },
  401: {
    description: 'Unauthorized - Authentication required',
    content: {
      'application/json': {
        schema: resolver(errorResponseSchema),
      },
    },
  },
  403: {
    description: 'Forbidden - Insufficient permissions',
    content: {
      'application/json': {
        schema: resolver(errorResponseSchema),
      },
    },
  },
  404: {
    description: 'Not Found - Resource does not exist',
    content: {
      'application/json': {
        schema: resolver(errorResponseSchema),
      },
    },
  },
  422: {
    description: 'Unprocessable Entity - Validation failed',
    content: {
      'application/json': {
        schema: resolver(errorResponseSchema),
      },
    },
  },
  429: {
    description: 'Too Many Requests - Rate limit exceeded',
    content: {
      'application/json': {
        schema: resolver(errorResponseSchema),
      },
    },
  },
  500: {
    description: 'Internal Server Error',
    content: {
      'application/json': {
        schema: resolver(errorResponseSchema),
      },
    },
  },
};

/**
 * Standard success response
 */
const successResponse = {
  200: {
    description: 'Success',
  },
};

/**
 * Created response (201)
 */
const createdResponse = {
  201: {
    description: 'Created successfully',
  },
};

/**
 * No content response (204)
 */
const noContentResponse = {
  204: {
    description: 'No content - Operation successful',
  },
};
