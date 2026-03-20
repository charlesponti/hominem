# Testing Strategy for Hominem Monorepo

Comprehensive testing approach for React Native (mobile), React Web, Electron (desktop), and shared services.

## Table of Contents
1. [Testing Philosophy](#testing-philosophy)
2. [Test Pyramid](#test-pyramid)
3. [Platform-Specific Testing](#platform-specific-testing)
4. [Shared Services Testing](#shared-services-testing)
5. [Test Standards & Patterns](#test-standards--patterns)
6. [CI/CD Integration](#cicd-integration)

---

## Testing Philosophy

**Coverage Goals:**
- 🎯 **Services/API:** 80% (database access, business logic, error handling)
- 🎯 **Packages/Shared:** 70% (utilities, validators, API contracts)
- 🎯 **Apps:** 40% (component integration, critical flows, not pixel-perfect)

**Test Principles:**
- ✅ Test behavior, not implementation
- ✅ Write tests BEFORE bugs happen, not after
- ✅ Fast tests (unit: <250ms, integration: <1000ms, E2E: <5000ms)
- ✅ Isolated tests (no random failures, no inter-test dependencies)
- ✅ Clear assertions (test ONE thing per `expect()`)
- ✅ Maintainable tests (refactor test code like production code)

---

## Test Pyramid

```
                    E2E & User Flows (5%)
                 /                        \
            Integration Tests (25%)
                 /                        \
         Unit Tests (70%)
```

Each level:
- **Unit Tests (70%):** Functions, utils, validators, pure logic
  - Speed: <250ms each
  - No external dependencies
  - Timezone/random seed controlled
  
- **Integration Tests (25%):** Modules, components with dependencies, API contracts
  - Speed: <1000ms each
  - Use real/mocked databases, real timers
  - Test module boundaries
  
- **E2E Tests (5%):** Critical user workflows, cross-platform flows
  - Speed: <5000ms per test
  - Real backend, real network
  - Focus on conversion funnels, critical paths

---

## Platform-Specific Testing

### **React Native (Mobile) - apps/mobile/**

#### Unit & Component Tests
```typescript
// tests/components/auth-button.test.tsx
import { render, screen, fireEvent } from '@testing-library/react-native';
import { AuthButton } from '@/components/auth-button';

describe('AuthButton', () => {
  it('calls onPress when tapped', () => {
    const onPress = vi.fn();
    render(<AuthButton onPress={onPress} />);
    
    fireEvent.press(screen.getByRole('button'));
    expect(onPress).toHaveBeenCalledTimes(1);
  });
});
```

#### Integration Tests
```typescript
// tests/integration/auth-flow.integration.test.ts
import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useAuth } from '@/hooks/use-auth';

describe('Auth Flow Integration', () => {
  it('logs in user with email and OTP', async () => {
    const { result } = renderHook(() => useAuth());
    
    act(() => {
      result.current.requestOtp('user@example.com');
    });
    
    await waitFor(() => {
      expect(result.current.otpSent).toBe(true);
    });
    
    act(() => {
      result.current.verifyOtp('123456');
    });
    
    await waitFor(() => {
      expect(result.current.isAuthenticated).toBe(true);
    });
  });
});
```

#### Native Module Testing
```typescript
// tests/integration/camera-access.integration.test.ts
import * as ImagePicker from 'expo-image-picker';
import { useImagePicker } from '@/hooks/use-image-picker';

describe('Native Module: Image Picker', () => {
  beforeEach(() => {
    vi.mock('expo-image-picker');
  });
  
  it('prompts for camera permission on iOS', async () => {
    const mock = vi.mocked(ImagePicker.requestCameraPermissionsAsync);
    mock.mockResolvedValueOnce({ granted: true, canAskAgain: true });
    
    const { result } = renderHook(() => useImagePicker());
    
    await act(() => result.current.selectImage('camera'));
    
    expect(mock).toHaveBeenCalled();
  });
});
```

#### Performance Tests
```typescript
// tests/performance/list-scroll.performance.test.ts
import { render } from '@testing-library/react-native';
import { ChatList } from '@/components/chat-list';

describe('ChatList Performance (1000 items)', () => {
  it('renders initial viewport in <200ms', () => {
    const start = performance.now();
    
    render(<ChatList items={generateMockMessages(1000)} />);
    
    const duration = performance.now() - start;
    expect(duration).toBeLessThan(200);
  });
});
```

---

### **React Web (Web) - apps/web/**

#### Component Tests
```typescript
// app/components/message-composer.test.tsx
import { render, screen, userEvent } from '@testing-library/react';
import { MessageComposer } from './message-composer';

describe('MessageComposer', () => {
  it('sends message when user submits form', async () => {
    const user = userEvent.setup();
    const onSend = vi.fn();
    
    render(<MessageComposer onSend={onSend} />);
    
    const input = screen.getByPlaceholderText('Type a message...');
    await user.type(input, 'Hello world');
    await user.click(screen.getByRole('button', { name: /send/i }));
    
    expect(onSend).toHaveBeenCalledWith('Hello world');
  });
});
```

#### E2E Tests (Playwright)
```typescript
// tests/e2e/auth.spec.ts
import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test('user can sign in with email and OTP', async ({ page }) => {
    await page.goto('/auth/signin');
    
    // Enter email
    await page.fill('input[type="email"]', 'user@example.com');
    await page.click('button:has-text("Send Code")');
    
    // Verify OTP was sent
    await expect(page.locator('text=Code sent')).toBeVisible();
    
    // Enter OTP (intercepted from test backend)
    const otp = await page.evaluate(() => 
      (window as any).__TEST_OTP__
    );
    
    await page.fill('input[placeholder="000000"]', otp);
    await page.click('button:has-text("Verify")');
    
    // Verify redirect to dashboard
    await expect(page).toHaveURL('/dashboard');
    await expect(page.locator('[data-testid="inbox"]')).toBeVisible();
  });
});
```

#### Accessibility Tests
```typescript
// tests/a11y/navigation.test.ts
import { test, expect } from '@playwright/test';
import { injectAxe, getViolations } from 'axe-playwright';

test('homepage has no critical accessibility violations', async ({ page }) => {
  await page.goto('/');
  await injectAxe(page);
  
  const violations = await getViolations(page, { 
    rules: { enabled: ['wcag21aa'] } 
  });
  
  expect(violations).toEqual([]);
});
```

---

### **Electron (Desktop) - apps/desktop/**

#### IPC Communication Tests
```typescript
// tests/integration/ipc-session.integration.test.ts
import { ipcRenderer } from 'electron';
import { useSessionStore } from '@/stores/session.store';

describe('IPC: Session Management', () => {
  it('syncs session state between windows', async () => {
    const store = useSessionStore();
    
    // Simulate main process update
    const handleSessionUpdate = vi.fn();
    ipcRenderer.on('session:updated', handleSessionUpdate);
    
    // Trigger update
    ipcRenderer.send('session:create', { userId: '123' });
    
    await waitFor(() => {
      expect(handleSessionUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({ userId: '123' })
      );
    });
  });
});
```

#### Multi-Window Tests
```typescript
// tests/integration/multi-window-state.integration.test.ts
describe('Multi-Window State Sync', () => {
  it('maintains state consistency across windows', async () => {
    const mainWindow = await createWindow();
    const settingsWindow = await createWindow();
    
    // Change theme in main window
    await mainWindow.evaluate(() => {
      (window as any).__store__.setTheme('dark');
    });
    
    // Verify settings window reflects change
    await expect(settingsWindow.locator('[data-theme="dark"]')).toBeVisible();
  });
});
```

---

## Shared Services Testing

### **Database Layer (packages/db)**

```typescript
// packages/db/src/connection.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createConnection } from './connection';

describe('Database Connection', () => {
  let connection: DbConnection;
  
  beforeEach(async () => {
    connection = await createConnection({ 
      database: 'test_db',
      Pool: { connectionTimeoutMillis: 5000 }
    });
  });
  
  afterEach(async () => {
    await connection.close();
  });
  
  it('connects and validates pool health', async () => {
    const health = await connection.health();
    expect(health.status).toBe('healthy');
    expect(health.poolSize).toBeGreaterThan(0);
  });
  
  it('handles connection errors gracefully', async () => {
    const badConn = await createConnection({ database: 'nonexistent' });
    
    await expect(badConn.query('SELECT 1')).rejects.toThrow('database');
  });
});
```

### **API Layer (services/api)**

#### Contract Tests
```typescript
// services/api/src/routes/auth.contract.test.ts
describe('POST /api/auth/email-otp/verify', () => {
  it('returns 200 with valid OTP', async () => {
    const response = await app.request('/api/auth/email-otp/verify', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@test.com', otp: '123456' }),
    });
    
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toMatchObject({
      accessToken: expect.any(String),
      user: expect.objectContaining({ email: 'user@test.com' }),
    });
  });
  
  it('returns 400 with invalid OTP and does not create session', async () => {
    const response = await app.request('/api/auth/email-otp/verify', {
      method: 'POST',
      body: JSON.stringify({ email: 'user@test.com', otp: 'invalid' }),
    });
    
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body).toEqual({
      code: 'INVALID_OTP',
      message: 'Invalid OTP',
    });
    
    // Verify no session was created
    const sessionResponse = await app.request('/api/auth/session', {
      headers: { Authorization: `Bearer invalid` },
    });
    expect(sessionResponse.status).toBe(401);
  });
});
```

### **RPC Contracts (packages/hono-rpc)**

```typescript
// packages/hono-rpc/src/routes/auth.route.test.ts
import { hc } from 'hono/client';
import { authRouter } from './auth.route';

describe('Auth RPC Contract', () => {
  const client = hc<typeof authRouter>('http://localhost:4040');
  
  it('verifyOtp returns proper response shape', async () => {
    const response = await client.auth['email-otp'].verify.$post({
      json: { email: 'user@test.com', otp: '123456' },
    });
    
    const body = await response.json();
    expect(body).toHaveProperty('accessToken');
    expect(body).toHaveProperty('tokenType', 'Bearer');
    expect(body.user).toHaveProperty('email');
  });
});
```

---

## Test Standards & Patterns

### **1. Naming Convention**

```
Unit Tests:        *.test.ts
Integration Tests: *.integration.test.ts
E2E Tests:         *.spec.ts (Playwright)
Contract Tests:    *.contract.test.ts (API)
Performance Tests: *.performance.test.ts
```

### **2. Test Structure (AAA Pattern)**

```typescript
describe('Feature Name', () => {
  it('does something specific', () => {
    // Arrange: Set up test data and mocks
    const input = { email: 'user@test.com', otp: '123456' };
    const mockDb = { verifyOtp: vi.fn().mockResolvedValue(true) };
    
    // Act: Execute the function/component
    const result = await verifyOtp(input, mockDb);
    
    // Assert: Verify the result
    expect(result.success).toBe(true);
    expect(mockDb.verifyOtp).toHaveBeenCalledWith(input);
  });
});
```

### **3. Mock Strategy**

**External Services (HTTP, databases):**
```typescript
vi.mock('node-fetch');
vi.mocked(fetch).mockResolvedValueOnce({
  json: () => Promise.resolve({ ok: true }),
});
```

**Environment Variables:**
```typescript
vi.stubEnv('API_KEY', 'test-key');
// Tests run with test-key
vi.unstubAllEnvs();
```

**Timers (for time-dependent logic):**
```typescript
vi.useFakeTimers();
vi.setSystemTime(new Date('2026-03-20'));
vi.advanceTimersByTime(5000); // Fast-forward 5s
vi.useRealTimers(); // Always restore
```

### **4. Assertion Patterns**

**❌ Weak:**
```typescript
expect(response.status).toBe(200);
```

**✅ Strong:**
```typescript
expect(response.status).toBe(200);
const body = await response.json();
expect(body).toMatchObject({
  accessToken: expect.stringMatching(/^[a-z0-9]{40,}$/),
  user: expect.objectContaining({
    email: 'user@test.com',
    id: expect.any(String),
  }),
});
```

### **5. Async Testing Pattern**

```typescript
// ✅ Correct: Use waitFor for async behavior
await waitFor(() => {
  expect(result.current.isLoading).toBe(false);
});

// ✅ Correct: Use try/catch for error paths
await expect(promise).rejects.toThrow('Expected error');

// ❌ Avoid: Arbitrary delays
// await new Promise(r => setTimeout(r, 1000)); // ← NO!
```

### **6. Test Data Generation**

```typescript
// ✅ Use factories instead of hardcoded data
const createMockUser = (overrides = {}) => ({
  id: randomUUID(),
  email: `user-${randomUUID()}@test.com`,
  createdAt: new Date(),
  ...overrides,
});

const user = createMockUser({ email: 'specific@test.com' });
```

---

## CI/CD Integration

### **GitHub Actions Workflow**

```yaml
# .github/workflows/code-quality.yml
jobs:
  test-unit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup
      - run: bun run test
      - run: bun run test:coverage
      - uses: codecov/codecov-action@v3
  
  test-contract:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:latest
        env:
          POSTGRES_PASSWORD: test
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup
      - run: bun run --filter @hominem/api test:contract
  
  test-e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup
      - run: bun run dev &  # Start server
      - run: bun run test:e2e
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

### **Coverage Requirements**

```javascript
// vitest.config.ts
export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      branches: 70,        // Branch coverage minimum
      lines: 80,           // Line coverage minimum
      functions: 80,
      statements: 80,
      exclude: [
        'node_modules/',
        'build/',
        '**/*.test.ts',
      ],
    },
  },
});
```

---

## 8-Week Implementation Roadmap

### **Week 1-2: Foundation**
- [ ] Create test data factories for all models
- [ ] Set up shared test utilities (mocking, fixtures)
- [ ] Document test patterns and standards
- [ ] Create CI workflow for test reports

### **Week 3-4: Database & Utils**
- [ ] Add database connection tests (0% → 40%)
- [ ] Test all API utility functions (email, redis, queues)
- [ ] Add error handling tests for critical paths
- [ ] Increase services/api coverage to 50%

### **Week 5-6: API Routes & Contracts**
- [ ] Add tests for untested routes (health, images, invites)
- [ ] Strengthen assertions in existing tests
- [ ] Add error case tests for all routes
- [ ] Achieve 60% services/api coverage

### **Week 7-8: E2E & Platform Tests**
- [ ] Add 5+ E2E tests for critical user flows
- [ ] Add performance tests for mobile lists
- [ ] Add accessibility tests for web app
- [ ] Create platform-specific test guidelines

---

## Success Metrics

| Metric | Today | Goal (8 weeks) |
|--------|-------|----------------|
| Overall Coverage | 16% | 50% |
| services/api Coverage | 37.5% | 70% |
| E2E Tests | 3 | 10+ |
| Untested Routes | 8+ | 0 |
| Failed CI Runs | Frequent | <1 per week |

---

## References

- Vitest Documentation: https://vitest.dev
- React Testing Library: https://testing-library.com/docs/react-testing-library
- Playwright: https://playwright.dev
- Testing Library Best Practices: https://kentcdodds.com/blog/common-mistakes-with-react-testing-library
