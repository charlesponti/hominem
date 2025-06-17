-- Enable the pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create the vector_documents table
CREATE TABLE IF NOT EXISTS vector_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content TEXT NOT NULL,
  metadata TEXT,
  embedding VECTOR(1536), -- OpenAI ada-002 embeddings are 1536 dimensions
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  source TEXT,
  source_type TEXT,
  title TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS vector_documents_embedding_idx ON vector_documents USING hnsw (embedding vector_cosine_ops);
CREATE INDEX IF NOT EXISTS vector_documents_user_id_idx ON vector_documents(user_id);
CREATE INDEX IF NOT EXISTS vector_documents_source_idx ON vector_documents(source);
CREATE INDEX IF NOT EXISTS vector_documents_source_type_idx ON vector_documents(source_type);

-- Create a function to update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_vector_documents_updated_at ON vector_documents;
CREATE TRIGGER update_vector_documents_updated_at
  BEFORE UPDATE ON vector_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
