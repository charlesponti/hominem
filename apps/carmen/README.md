# Carmen App (Svelte Migration)

Carmen is a personal travel companion and list manager application that is being migrated from React to Svelte.

## Migration Status

The application is currently in the process of being migrated from React to Svelte. Some components have already been converted, while others are still in React.

See [CONVERSION.md](./CONVERSION.md) for the migration status and plan.

## Getting Started

First, run the development server:

```bash
pnpm dev
```

This will start the development server at http://localhost:53422.

## Setup and Development

### Installation

```bash
pnpm install
```

### Building

```bash
pnpm build
```

### Testing

```bash
# Run specific tests
pnpm test

# Run all tests
pnpm test:all

# Run tests with coverage
pnpm test:coverage

# Run E2E tests
pnpm test:e2e
```

### Linting and Type Checking

```bash
# Lint code
pnpm lint

# Fix linting issues
pnpm lint:fix

# Type check with Svelte Check
pnpm check
```

## Migration Tools

There are a few tools to help with the migration process:

### Conversion Script

A basic script to create Svelte component templates from React components:

```bash
node scripts/convert-to-svelte.js path/to/component.tsx
```

### Migration Guides

- [CONVERSION.md](./CONVERSION.md): Carmen-specific conversion guide
- [scripts/react-to-svelte.md](./scripts/react-to-svelte.md): General React to Svelte migration guide

## Project Structure

```
apps/carmen/
├── public/           # Static files
├── src/
│   ├── components/   # UI Components
│   │   ├── ui/       # Base UI components
│   │   └── ...       # Feature components
│   ├── layouts/      # Layout components
│   ├── lib/          # Utility functions and types
│   ├── routes/       # Route components
│   ├── test/         # Test utilities
│   ├── App.svelte    # Main app component
│   └── main.ts       # Entry point
├── scripts/          # Utility scripts
└── ...               # Config files
```

## Tools & Libraries

- [svelte-navigator](https://github.com/mefechoel/svelte-navigator) - Routing
- [@tanstack/svelte-query](https://tanstack.com/query/latest/docs/svelte/overview) - Data fetching
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Svelte with TypeScript](https://svelte.dev/docs/typescript) - Type safety
- [Vite](https://vitejs.dev/) - Build tool

## Contributing to the Migration

When converting components from React to Svelte:

1. Create a new `.svelte` file alongside the React component
2. Convert the React component to Svelte
3. Update imports in other components that use it
4. Test the component to ensure functionality is maintained
5. Update tests as needed

Follow the patterns and guidelines in [CONVERSION.md](./CONVERSION.md) to ensure consistency.