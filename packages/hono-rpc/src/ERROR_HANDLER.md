# ApiResult Error Handler Documentation

## Overview

This document explains how to handle `ApiResult` responses in frontend applications. The `ApiResult` type is a discriminated union that clients use to safely handle both success and error cases with full TypeScript type narrowing.

## ApiResult Type

```typescript
type ApiResult<T> =
  | { success: true; data: T }
  | { success: false; code: ErrorCode; message: string; details?: Record<string, unknown> };
```

## Error Codes

All API errors are categorized with specific error codes:

| Code               | HTTP Status | Meaning                  | User Action                                |
| ------------------ | ----------- | ------------------------ | ------------------------------------------ |
| `VALIDATION_ERROR` | 400         | Input validation failed  | Highlight form fields, show error messages |
| `UNAUTHORIZED`     | 401         | User not authenticated   | Redirect to login                          |
| `FORBIDDEN`        | 403         | User lacks permission    | Show access denied message                 |
| `NOT_FOUND`        | 404         | Resource doesn't exist   | Show 404 page or go back                   |
| `CONFLICT`         | 409         | Resource already exists  | Suggest alternatives                       |
| `UNAVAILABLE`      | 503         | Service temporarily down | Show retry option                          |
| `INTERNAL_ERROR`   | 500         | Unexpected server error  | Show generic error message                 |

## Consuming ApiResult

### Basic Pattern: Type Narrowing

```typescript
const result = await someApiCall();

if (result.success) {
  // TypeScript knows result.data is the expected type
  console.log(result.data.id);
  console.log(result.data.name);
} else {
  // TypeScript knows result.code and result.message exist
  console.error(`Error ${result.code}: ${result.message}`);

  // Access optional details
  if (result.details) {
    console.log(result.details);
  }
}
```

### With React Query

```typescript
const mutation = useMutation({
  mutationFn: async (input) => {
    const response = await fetch('/api/lists/create', {
      method: 'POST',
      body: JSON.stringify(input),
    });
    return response.json() as ApiResult<List>;
  },
  onSuccess: (result) => {
    if (result.success) {
      // result.data is List
      setLists((prev) => [...prev, result.data]);
      toast.success('List created');
    } else {
      // result.code and result.message available
      handleError(result);
    }
  },
});
```

### Error Handling Utility

Create a centralized error handler:

```typescript
// lib/utils/handle-api-error.ts
import type { ApiError } from '@hominem/services';
import { toast } from 'sonner'; // or your toast library

export function handleApiError(error: ApiError) {
  const messages: Record<string, { title: string; description: string }> = {
    VALIDATION_ERROR: {
      title: 'Invalid Input',
      description: 'Please check your input and try again.',
    },
    UNAUTHORIZED: {
      title: 'Not Signed In',
      description: 'Please sign in to continue.',
    },
    FORBIDDEN: {
      title: 'Access Denied',
      description: "You don't have permission for this action.",
    },
    NOT_FOUND: {
      title: 'Not Found',
      description: "The item you're looking for doesn't exist.",
    },
    CONFLICT: {
      title: 'Already Exists',
      description: 'This item already exists.',
    },
    UNAVAILABLE: {
      title: 'Service Unavailable',
      description: 'Service is temporarily unavailable. Please try again.',
    },
    INTERNAL_ERROR: {
      title: 'Something Went Wrong',
      description: 'An unexpected error occurred. Please try again.',
    },
  };

  const config = messages[error.code] || messages.INTERNAL_ERROR;

  // Handle specific error codes differently if needed
  if (error.code === 'UNAUTHORIZED') {
    window.location.href = '/login';
    return;
  }

  toast.error(config.title, {
    description: error.message || config.description,
  });

  // Log for debugging
  console.error(`[${error.code}]`, error.message, error.details);
}
```

### With tRPC (React Router Apps)

For apps still using tRPC:

```typescript
// lib/hooks/use-safe-mutation.ts
import type { TRPCClientErrorLike } from '@trpc/client';
import { useMutation } from '@tanstack/react-query';
import type { ApiResult } from '@hominem/services';

export function useSafeMutation<TInput, TOutput>(
  mutationFn: (input: TInput) => Promise<ApiResult<TOutput>>,
  options?: {
    onSuccess?: (data: TOutput) => void;
    onError?: (error: any) => void;
  },
) {
  return useMutation({
    mutationFn,
    onSuccess: (result) => {
      if (result.success) {
        options?.onSuccess?.(result.data);
      } else {
        // Handle error via standard pattern
        handleApiError(result);
      }
    },
    onError: (error) => {
      console.error('Mutation failed:', error);
      options?.onError?.(error);
    },
  });
}
```

## Error Boundary Implementation

```typescript
// components/ApiErrorBoundary.tsx
import type { ReactNode } from 'react'
import { Component } from 'react'
import type { ApiError } from '@hominem/services'

interface Props {
  children: ReactNode
  fallback?: (error: ApiError) => ReactNode
}

interface State {
  hasError: boolean
  error: ApiError | null
}

export class ApiErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: ApiError): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: ApiError) {
    console.error('Error caught by boundary:', error)
  }

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error)
      }

      return (
        <div className="flex items-center justify-center p-8">
          <div className="rounded-lg border border-red-200 bg-red-50 p-6">
            <h2 className="text-lg font-semibold text-red-900">
              Error: {this.state.error.code}
            </h2>
            <p className="mt-2 text-red-800">
              {this.state.error.message}
            </p>
            {this.state.error.details && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-semibold text-red-700">
                  Details
                </summary>
                <pre className="mt-2 overflow-auto bg-red-100 p-2 text-xs">
                  {JSON.stringify(this.state.error.details, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
```

## Common Patterns

### Form Submission with Validation Errors

```typescript
const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

const handleSubmit = async (formData: FormData) => {
  const result = await createListMutation.mutateAsync(formData);

  if (!result.success) {
    if (result.code === 'VALIDATION_ERROR' && result.details?.fields) {
      // Set individual field errors
      const errors = result.details.fields as Record<string, string>;
      setFieldErrors(errors);
    } else {
      handleApiError(result);
    }
  } else {
    // Success - result.data is available
    setFieldErrors({});
    router.navigate(`/lists/${result.data.id}`);
  }
};
```

### Retry Logic

```typescript
async function callApiWithRetry<T>(fn: () => Promise<ApiResult<T>>, maxRetries = 3): Promise<T> {
  let lastError: ApiError | null = null;

  for (let i = 0; i < maxRetries; i++) {
    const result = await fn();

    if (result.success) {
      return result.data;
    }

    lastError = result;

    // Only retry on specific error codes
    if (![503, 500].includes(getStatusForCode(result.code))) {
      throw result;
    }

    // Exponential backoff
    await new Promise((resolve) => setTimeout(resolve, Math.pow(2, i) * 1000));
  }

  throw lastError;
}
```

## Testing

### Mock ApiResult Responses

```typescript
// test/mocks/api.ts
import type { ApiResult } from '@hominem/services';

export function mockSuccess<T>(data: T): ApiResult<T> {
  return { success: true, data };
}

export function mockError(
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'INTERNAL_ERROR',
  message: string,
): ApiResult<never> {
  return {
    success: false,
    code,
    message,
  };
}
```

### Test Component with ApiResult

```typescript
// components/__tests__/ListForm.test.tsx
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ListForm } from '../ListForm'
import { mockSuccess, mockError } from '../../test/mocks/api'

test('shows validation error when list name is missing', async () => {
  const createListMutation = vi.fn(() =>
    Promise.resolve(mockError('VALIDATION_ERROR', 'Name is required'))
  )

  render(<ListForm onCreateList={createListMutation} />)

  const submitButton = screen.getByText('Create')
  await userEvent.click(submitButton)

  expect(screen.getByText('Name is required')).toBeInTheDocument()
})

test('navigates to list on success', async () => {
  const createListMutation = vi.fn(() =>
    Promise.resolve(mockSuccess({ id: '123', name: 'My List' }))
  )

  const navigate = vi.fn()
  render(<ListForm onCreateList={createListMutation} onSuccess={navigate} />)

  const submitButton = screen.getByText('Create')
  await userEvent.click(submitButton)

  expect(navigate).toHaveBeenCalledWith('/lists/123')
})
```

## Migration Checklist

For each component or hook using API calls:

- [ ] Identify all API calls (fetch, tRPC, axios, etc.)
- [ ] Wrap responses with `ApiResult<T>` type
- [ ] Replace runtime checks (`if ('error' in response)`) with type narrowing (`if (result.success)`)
- [ ] Add error handling using centralized `handleApiError` utility
- [ ] Test both success and error paths
- [ ] Verify no `any` types in API handling code
- [ ] Remove old error handling patterns

## Performance Notes

- Type narrowing is **compile-time only** - zero runtime overhead
- The discriminator pattern is used by React Query and other libraries
- Error details are optional and won't bloat the response
- Serialization is automatic - no additional overhead

## Further Reading

- [TypeScript Discriminated Unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
- [React Query Error Handling](https://tanstack.com/query/latest/docs/react/guides/important-defaults#query-retry)
- [Hono Error Handling](https://hono.dev/docs/guides/error-handling)
