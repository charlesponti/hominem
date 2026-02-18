import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';

// ============================================================================
// APPROACH 1: Simple Query Client State (Recommended for simple shared state)
// ============================================================================

const SELECTED_ACCOUNT_KEY = ['selectedAccount'];
const USER_PREFERENCES_KEY = ['userPreferences'];
const GLOBAL_FILTERS_KEY = ['globalFilters'];

export function useSelectedAccount() {
  const queryClient = useQueryClient();

  const selectedAccount = queryClient.getQueryData<string>(SELECTED_ACCOUNT_KEY) || 'all';

  const setSelectedAccount = useCallback(
    (accountId: string) => {
      queryClient.setQueryData(SELECTED_ACCOUNT_KEY, accountId);
    },
    [queryClient],
  );

  return { selectedAccount, setSelectedAccount };
}

// ============================================================================
// APPROACH 2: Complex Object State
// ============================================================================

interface UserPreferences {
  theme: 'light' | 'dark';
  currency: string;
  dateFormat: string;
  notifications: boolean;
}

export function useUserPreferences() {
  const queryClient = useQueryClient();

  const preferences = queryClient.getQueryData<UserPreferences>(USER_PREFERENCES_KEY) || {
    theme: 'light',
    currency: 'USD',
    dateFormat: 'MM/dd/yyyy',
    notifications: true,
  };

  const setPreferences = useCallback(
    (newPreferences: Partial<UserPreferences>) => {
      queryClient.setQueryData(USER_PREFERENCES_KEY, (old: UserPreferences | undefined) => ({
        ...old,
        ...newPreferences,
      }));
    },
    [queryClient],
  );

  const updateTheme = useCallback(
    (theme: 'light' | 'dark') => {
      setPreferences({ theme });
    },
    [setPreferences],
  );

  return { preferences, setPreferences, updateTheme };
}

// ============================================================================
// APPROACH 3: Array State with CRUD Operations
// ============================================================================

interface GlobalFilter {
  id: string;
  name: string;
  type: 'account' | 'category' | 'date';
  value: string;
}

export function useGlobalFilters() {
  const queryClient = useQueryClient();

  const filters = queryClient.getQueryData<GlobalFilter[]>(GLOBAL_FILTERS_KEY) || [];

  const addFilter = useCallback(
    (filter: Omit<GlobalFilter, 'id'>) => {
      queryClient.setQueryData(GLOBAL_FILTERS_KEY, (old: GlobalFilter[] | undefined) => [
        ...(old || []),
        { ...filter, id: crypto.randomUUID() },
      ]);
    },
    [queryClient],
  );

  const removeFilter = useCallback(
    (id: string) => {
      queryClient.setQueryData(GLOBAL_FILTERS_KEY, (old: GlobalFilter[] | undefined) =>
        (old || []).filter((filter) => filter.id !== id),
      );
    },
    [queryClient],
  );

  const updateFilter = useCallback(
    (id: string, updates: Partial<GlobalFilter>) => {
      queryClient.setQueryData(GLOBAL_FILTERS_KEY, (old: GlobalFilter[] | undefined) =>
        (old || []).map((filter) => (filter.id === id ? { ...filter, ...updates } : filter)),
      );
    },
    [queryClient],
  );

  const clearFilters = useCallback(() => {
    queryClient.setQueryData(GLOBAL_FILTERS_KEY, []);
  }, [queryClient]);

  return { filters, addFilter, removeFilter, updateFilter, clearFilters };
}

// ============================================================================
// APPROACH 4: State with Persistence (using localStorage)
// ============================================================================

const PERSISTENT_SETTINGS_KEY = ['persistentSettings'];

interface PersistentSettings {
  sidebarCollapsed: boolean;
  defaultView: 'list' | 'grid';
  itemsPerPage: number;
}

export function usePersistentSettings() {
  const queryClient = useQueryClient();

  // Initialize from localStorage if not in cache
  const getInitialSettings = (): PersistentSettings => {
    const cached = queryClient.getQueryData<PersistentSettings>(PERSISTENT_SETTINGS_KEY);
    if (cached) return cached;

    try {
      const stored = localStorage.getItem('persistentSettings');
      return stored
        ? JSON.parse(stored)
        : {
            sidebarCollapsed: false,
            defaultView: 'list',
            itemsPerPage: 25,
          };
    } catch {
      return {
        sidebarCollapsed: false,
        defaultView: 'list',
        itemsPerPage: 25,
      };
    }
  };

  const settings = getInitialSettings();

  const setSettings = useCallback(
    (newSettings: Partial<PersistentSettings>) => {
      queryClient.setQueryData(PERSISTENT_SETTINGS_KEY, (old: PersistentSettings | undefined) => {
        const updated = { ...old, ...newSettings };
        // Persist to localStorage
        localStorage.setItem('persistentSettings', JSON.stringify(updated));
        return updated;
      });
    },
    [queryClient],
  );

  return { settings, setSettings };
}

// ============================================================================
// APPROACH 5: State with Validation and Type Safety
// ============================================================================

interface FormState {
  step: number;
  data: Record<string, unknown>;
  errors: Record<string, string>;
  isValid: boolean;
}

const FORM_STATE_KEY = ['formState'];

export function useFormState(formId: string) {
  const queryClient = useQueryClient();

  const formState = queryClient.getQueryData<FormState>([...FORM_STATE_KEY, formId]) || {
    step: 1,
    data: {},
    errors: {},
    isValid: false,
  };

  const setFormState = useCallback(
    (updates: Partial<FormState>) => {
      queryClient.setQueryData([...FORM_STATE_KEY, formId], (old: FormState | undefined) => ({
        ...old,
        ...updates,
      }));
    },
    [queryClient, formId],
  );

  const updateFormData = useCallback(
    (field: string, value: unknown) => {
      setFormState({
        data: { ...formState.data, [field]: value },
        errors: { ...formState.errors, [field]: '' }, // Clear field error
      });
    },
    [formState, setFormState],
  );

  const setFieldError = useCallback(
    (field: string, error: string) => {
      setFormState({
        errors: { ...formState.errors, [field]: error },
        isValid: false,
      });
    },
    [formState, setFormState],
  );

  const nextStep = useCallback(() => {
    setFormState({ step: formState.step + 1 });
  }, [formState.step, setFormState]);

  const prevStep = useCallback(() => {
    setFormState({ step: Math.max(1, formState.step - 1) });
  }, [formState.step, setFormState]);

  return {
    formState,
    setFormState,
    updateFormData,
    setFieldError,
    nextStep,
    prevStep,
  };
}
