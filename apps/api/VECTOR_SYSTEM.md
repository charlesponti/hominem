# Vector System Documentation

This document describes the new vector system that uses Supabase's built-in vector capabilities, Drizzle ORM, OpenAI embeddings, and tRPC for type-safe API calls.

## Overview

The vector system has been completely rewritten to leverage:
- **Supabase pgvector**: For vector storage and similarity search
- **Drizzle ORM**: For type-safe database operations
- **Supabase Storage**: For file storage (CSV uploads)
- **OpenAI API**: For embedding generation
- **tRPC**: For type-safe API endpoints

## Architecture

### Components

1. **SupabaseVectorService** (`src/services/vector.service.ts`)
   - Handles all vector operations using Drizzle ORM
   - Manages file uploads to Supabase Storage
   - Processes CSV files and generates embeddings using OpenAI
   - Performs vector similarity searches with pgvector

2. **Vector tRPC Router** (`src/trpc/routers/vector.ts`)
   - Provides type-safe API endpoints
   - Handles authentication and authorization
   - Validates input using Zod schemas

3. **Drizzle Schema** (`packages/utils/src/db/schema/vector-documents.schema.ts`)
   - Defines the vector_documents table structure
   - Includes pgvector column and indexes
   - Provides TypeScript types for type safety

4. **OpenAI Client** (`src/lib/openai.ts`)
   - Generates embeddings using OpenAI's text-embedding-3-small model
   - Handles API rate limiting and error responses
   - Uses existing OpenAI configuration

### Database Schema

The system uses a `vector_documents` table defined in Drizzle schema:

```typescript
export const vectorDocuments = pgTable(
  'vector_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    content: text('content').notNull(),
    metadata: text('metadata'), // JSON string for additional metadata
    embedding: vector('embedding', { dimensions: 1536 }), // OpenAI text-embedding-3-small
    userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }),
    source: text('source'), // Source identifier (file, url, etc.)
    sourceType: text('source_type'), // Type of source (file, manual, chat, etc.)
    title: text('title'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [
    index('vector_documents_embedding_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),
    index('vector_documents_user_id_idx').on(table.userId),
    index('vector_documents_source_idx').on(table.source),
    index('vector_documents_source_type_idx').on(table.sourceType),
  ]
)
```

## API Endpoints

All vector operations are now available through tRPC at `/trpc/vector/*`:

### Mutations (Write Operations)

#### `vector.uploadCsv`
Upload and process a CSV file into vectors.

```typescript
const result = await trpc.vector.uploadCsv.mutate({
  indexName: 'my-dataset'
})
```

#### `vector.ingestMarkdown`
Ingest markdown text into the vector store.

```typescript
const result = await trpc.vector.ingestMarkdown.mutate({
  text: '# My Document\n\nContent here...',
  metadata: { title: 'My Document', category: 'notes' }
})
```

#### `vector.deleteUserDocuments`
Delete documents by user ID and optionally by source.

```typescript
const result = await trpc.vector.deleteUserDocuments.mutate({
  source: 'my-dataset' // optional
})
```

#### `vector.deleteUserFile`
Delete a file from Supabase Storage.

```typescript
const result = await trpc.vector.deleteUserFile.mutate({
  filePath: 'user-id/dataset/timestamp_file.csv'
})
```

### Queries (Read Operations)

#### `vector.query`
Query the vector store for similar documents.

```typescript
const result = await trpc.vector.query.query({
  query: 'What is machine learning?',
  indexName: 'my-dataset',
  limit: 10
})
```

#### `vector.searchUserDocuments`
Search documents belonging to the authenticated user.

```typescript
const result = await trpc.vector.searchUserDocuments.query({
  query: 'machine learning',
  limit: 10,
  threshold: 0.7
})
```

#### `vector.getUserDocuments`
Get all documents for the authenticated user.

```typescript
const result = await trpc.vector.getUserDocuments.query({
  limit: 50,
  offset: 0
})
```

#### `vector.getUserFiles`
Get files from Supabase Storage for the user.

```typescript
const result = await trpc.vector.getUserFiles.query({
  indexName: 'my-dataset' // optional
})
```

## Setup Requirements

### 1. Supabase Configuration

Ensure your Supabase project has:
- pgvector extension enabled
- `vector_documents` table created with proper schema
- Storage bucket `vector-files` created for CSV uploads

### 2. Environment Variables

```bash
# Supabase
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI (for embeddings)
OPENAI_API_KEY=your_openai_api_key
```

### 3. Storage Bucket Setup

Create a storage bucket named `vector-files` with:
- Private access (files are user-specific)
- File size limit: 50MB
- Allowed MIME types: `text/csv`, `application/csv`

## Migration from Legacy System

The old REST endpoints are deprecated but still available for backward compatibility:

- `POST /api/vector/upload-csv/:indexName` → `POST /trpc/vector.uploadCsv`
- `POST /api/vector/query/:indexName` → `POST /trpc/vector.query`
- `POST /api/vector/ingest/markdown` → `POST /trpc/vector.ingestMarkdown`

Legacy endpoints return HTTP 410 (Gone) with migration instructions.

## Usage Examples

### Client-Side Usage

```typescript
import { trpc } from './lib/trpc'

// Upload CSV file
const uploadMutation = trpc.vector.uploadCsv.useMutation()
const handleUpload = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  
  await uploadMutation.mutateAsync({
    indexName: 'my-dataset'
  })
}

// Query vectors
const queryQuery = trpc.vector.query.useQuery({
  query: 'What is AI?',
  indexName: 'my-dataset',
  limit: 5
})

// Ingest markdown
const ingestMutation = trpc.vector.ingestMarkdown.useMutation()
const handleIngest = async (text: string) => {
  await ingestMutation.mutateAsync({
    text,
    metadata: { source: 'user-input' }
  })
}
```

### Server-Side Usage

```typescript
import { SupabaseVectorService } from './services/vector.service'

// Direct service usage
const results = await SupabaseVectorService.query({
  q: 'search query',
  indexName: 'dataset',
  limit: 10,
  userId: 'user-id'
})
```

## Performance Considerations

1. **Batch Processing**: CSV processing is done in batches of 50 records
2. **Embedding Generation**: Uses OpenAI API directly with parallel processing
3. **Vector Search**: Leverages pgvector's optimized similarity search with HNSW index
4. **File Storage**: Files are organized by user ID and dataset name
5. **Drizzle ORM**: Provides type safety and optimized queries
6. **Rate Limiting**: OpenAI API calls are batched to respect rate limits

## Security

- All endpoints require authentication via tRPC middleware
- Files are stored in user-specific paths
- Vector documents are filtered by user ID using Drizzle queries
- Service role key is used only for server-side operations
- Row-level security policies in Supabase
- OpenAI API key is secured in environment variables

## Error Handling

All operations include comprehensive error handling:
- Input validation using Zod schemas
- Graceful error responses with meaningful messages
- Proper cleanup of temporary files
- Logging for debugging and monitoring
- Type-safe database operations with Drizzle
- OpenAI API error handling and retries

## Database Operations

The system uses Drizzle ORM for all database operations:

```typescript
// Insert with conflict resolution
await db
  .insert(vectorDocuments)
  .values(insertData)
  .onConflictDoUpdate({
    target: vectorDocuments.id,
    set: {
      content: sql`EXCLUDED.content`,
      metadata: sql`EXCLUDED.metadata`,
      embedding: sql`EXCLUDED.embedding`,
      updatedAt: new Date(),
    },
  })

// Vector similarity search
const results = await db
  .select({
    id: vectorDocuments.id,
    content: vectorDocuments.content,
    score: sql<number>`1 - (${vectorDocuments.embedding} <=> ${embedding})`,
  })
  .from(vectorDocuments)
  .where(and(...conditions))
  .orderBy(sql`${vectorDocuments.embedding} <=> ${embedding}`)
  .limit(limit)
```

## Embedding Generation

Embeddings are generated using OpenAI's text-embedding-3-small model:

```typescript
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openaiClient.embeddings.create({
    input: text,
    model: 'text-embedding-3-small',
  })
  return response.data[0].embedding
}
```

This approach provides:
- **High Quality**: OpenAI's state-of-the-art embedding model
- **Consistency**: Same model used across all operations
- **Reliability**: Direct API integration with proper error handling
- **Performance**: 1536-dimensional embeddings optimized for similarity search 
