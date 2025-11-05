# MCP Server Testing

This directory contains the test suite for the Hominem MCP server using Vitest.

## Test Structure

```
test/
├── functional.test.ts   # End-to-end tests against running MCP server
└── schemas.test.ts      # Schema validation tests for tool responses
```

## Running Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with UI
npm run test:ui

# Run tests with coverage
npm run test:coverage
```

## Test Suites

### Functional Tests (`functional.test.ts`)

Tests the MCP server's actual functionality by:
- Starting a real MCP server process
- Connecting an MCP client
- Executing various tools and verifying responses
- Testing error handling

**What it tests:**
- Server initialization and connection
- Tool discovery (all 26 tools are registered)
- Tool execution (workout, nutrition, sleep analysis)
- Resource listing
- Error handling for invalid inputs

**Note:** Tests will use fallback responses when the LLM (lmstudio) is not available, which is expected behavior.

### Schema Tests (`schemas.test.ts`)

Tests Zod schema validation for tool responses:
- Workout recommendation schema
- Nutrition analysis schema
- Sleep analysis schema

**What it tests:**
- Valid data passes validation
- Invalid data is rejected
- Boundary conditions (e.g., sleep scores 0-100)
- Required vs optional fields

## Configuration

Test configuration is in `vitest.config.ts`:
- 30 second timeout for tests (server startup takes time)
- Tests in `test/**/*.test.ts`
- Node environment
- Coverage reports in multiple formats

## CI/CD Integration

Tests are part of the monorepo's test suite and run via:
```bash
# From monorepo root
npm test
```

The workspace configuration in `/vitest.workspace.ts` includes this MCP test suite.

## Adding New Tests

1. Create a new `.test.ts` file in the `test/` directory
2. Import testing utilities from vitest:
   ```typescript
   import { describe, expect, it } from 'vitest'
   ```
3. For functional tests, reuse the `beforeAll`/`afterAll` setup from `functional.test.ts`
4. Run tests to verify they pass

## Debugging Tests

To debug individual tests:
```bash
# Run a specific test file
npm test test/schemas.test.ts

# Use the Vitest UI for interactive debugging
npm run test:ui
```

## Coverage

Generate coverage reports with:
```bash
npm run test:coverage
```

Coverage reports are generated in:
- Text format (console)
- JSON format (`coverage/coverage-final.json`)
- HTML format (`coverage/index.html`)
