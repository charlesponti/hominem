# Vector Search Implementation with Supabase pgvector

This document describes the implementation of vector search functionality using Supabase's pgvector extension for the chat application.

## Overview

The vector service enables semantic search capabilities by:
- Converting text content into vector embeddings using OpenAI's `text-embedding-ada-002` model
- Storing embeddings in PostgreSQL with pgvector extension
- Performing similarity searches using cosine distance
- Automatically indexing uploaded files with text content

## Architecture

### Database Schema

```sql
CREATE TABLE vector_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  metadata TEXT, -- JSON string for additional metadata
  embedding VECTOR(1536), -- OpenAI ada-002 embeddings (1536 dimensions)
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT, -- Source identifier (file ID, URL, etc.)
  source_type TEXT, -- Type of source (file, manual, chat, etc.)
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Indexes

- **HNSW Vector Index**: `vector_cosine_ops` for efficient similarity search
- **User Index**: Fast filtering by user ID
- **Source Indexes**: Quick lookup by source and source type

## Core Functions

### `searchDocuments(query, userId?, limit?, threshold?)`
Performs semantic search across indexed documents.

**Parameters:**
- `query`: Search text
- `userId`: Optional user filter
- `limit`: Max results (default: 10)
- `threshold`: Similarity threshold 0-1 (default: 0.7)

**Returns:** Array of documents with similarity scores

### `addDocument(content, userId, metadata?, options?)`
Adds a single document to the vector store.

**Parameters:**
- `content`: Text content to index
- `userId`: Owner user ID
- `metadata`: Additional metadata object
- `options`: Title, source, sourceType

### `addDocumentWithChunking(content, userId, metadata?, options?)`
Automatically chunks large documents for better search results.

**Parameters:**
- Same as `addDocument` plus:
- `maxChunkSize`: Chunk size limit (default: 1500)
- `overlap`: Overlap between chunks (default: 200)

### `updateDocument(id, content, userId, metadata?, options?)`
Updates existing document and regenerates embedding.

### `deleteDocument(id, userId)`
Removes document from vector store.

### `getUserDocuments(userId, limit?, offset?)`
Retrieves all documents for a user.

## Integration Points

### File Upload Integration

Files are automatically indexed when uploaded:

```typescript
// In upload route
const indexResult = await indexProcessedFile(processedFile, userId, storedFile.url)
```

The `indexProcessedFile` function:
- Extracts text content from processed files
- Uses chunking for large documents (>1000 chars)
- Stores file metadata for later reference
- Returns vector document IDs

### AI Tool Integration

Vector search is available as an AI tool:

```typescript
import { HominemVectorStore } from '~/lib/services/vector.server'

// Use in AI completions
const tools = [HominemVectorStore.searchDocumentsTool]
```

## API Endpoints

### GET `/api/vector-search`
Search documents by similarity.

**Query Parameters:**
- `query`: Search text (required)
- `userId`: User filter (optional)
- `limit`: Max results (optional, default: 10)
- `threshold`: Similarity threshold (optional, default: 0.7)

**Example:**
```
GET /api/vector-search?query=machine%20learning&userId=123&limit=5
```

### POST `/api/vector-search`
Add document to vector store.

**Body:**
```json
{
  "content": "Document text content",
  "userId": "user-id",
  "metadata": { "key": "value" },
  "title": "Document Title",
  "source": "source-identifier",
  "sourceType": "file"
}
```

## Setup Instructions

### 1. Database Setup

Run the SQL migration to enable pgvector and create tables:

```bash
psql -d your_database -f vector-setup.sql
```

### 2. Environment Variables

Ensure OpenAI API key is configured:

```bash
OPENAI_API_KEY=your_openai_api_key
```

### 3. Dependencies

The following packages are required:
- `drizzle-orm` - Database ORM
- `openai` - OpenAI API client
- `@supabase/supabase-js` - Supabase client

## Usage Examples

### Basic Search

```typescript
import { HominemVectorStore } from '~/lib/services/vector.server'

// Search user's documents
const results = await HominemVectorStore.searchDocuments(
  "machine learning algorithms",
  userId,
  10,
  0.8
)

console.log(`Found ${results.results.length} relevant documents`)
```

### Adding Documents

```typescript
// Add single document
const result = await HominemVectorStore.addDocument(
  "This is a document about machine learning...",
  userId,
  { category: "ai", importance: 5 },
  { 
    title: "ML Introduction",
    source: "manual-entry",
    sourceType: "note"
  }
)

// Add large document with chunking
const chunkResult = await HominemVectorStore.addDocumentWithChunking(
  largeDocumentText,
  userId,
  { documentType: "research-paper" },
  { 
    title: "Research Paper",
    maxChunkSize: 2000,
    overlap: 300
  }
)
```

### File Integration

```typescript
// Automatically index uploaded file
const indexResult = await indexProcessedFile(
  processedFile,
  userId,
  fileUrl
)

if (indexResult.success) {
  console.log(`Indexed file into ${indexResult.vectorIds.length} chunks`)
}
```

## Performance Considerations

### Indexing
- **Chunk Size**: Keep chunks 1000-2000 characters for optimal embedding quality
- **Batch Processing**: For bulk imports, process documents in batches
- **Rate Limits**: OpenAI embedding API has rate limits

### Searching
- **Index Usage**: HNSW index provides sub-linear search time
- **Filtering**: User-based filtering is efficient with proper indexes
- **Threshold Tuning**: Adjust similarity threshold based on use case

### Storage
- **Embedding Size**: Each document uses ~6KB for 1536-dimension vector
- **Metadata**: Store structured data as JSON for flexibility
- **Cleanup**: Remove orphaned vectors when files are deleted

## Best Practices

1. **Text Preprocessing**: Clean text before embedding (remove excess whitespace, normalize)
2. **Metadata Strategy**: Include relevant searchable metadata
3. **Chunk Overlap**: Use 200-300 character overlap for better context continuity
4. **User Isolation**: Always filter by user ID for privacy
5. **Error Handling**: Gracefully handle embedding API failures
6. **Monitoring**: Track search performance and relevance

## Troubleshooting

### Common Issues

1. **pgvector not enabled**: Ensure extension is installed in database
2. **Dimension mismatch**: Verify embedding model consistency (1536 for ada-002)
3. **Poor search results**: Adjust similarity threshold or chunk size
4. **Rate limiting**: Implement retry logic for OpenAI API calls

### Performance Issues

1. **Slow searches**: Check HNSW index creation and maintenance
2. **High memory usage**: Consider reducing max_parallel_workers for index builds
3. **Storage growth**: Implement cleanup for deleted documents

## Future Enhancements

- [ ] Support for other embedding models (e.g., sentence-transformers)
- [ ] Multi-language embedding support
- [ ] Automatic relevance feedback and learning
- [ ] Advanced metadata filtering and faceted search
- [ ] Real-time embedding updates for chat messages
- [ ] Hybrid search combining keyword and semantic search
