import { sql } from "drizzle-orm";
import { pgTable, text, uuid, customType, index } from "drizzle-orm/pg-core";
import { communications } from "./schema-communications";

// Custom vector type for pgvector
const vector = customType<{ data: number[]; driverData: string }>({
  dataType() {
    return 'vector(1536)';
  },
  toDriver(value: number[]): string {
    return '[' + value.join(',') + ']';
  },
  fromDriver(value: string): number[] {
    return value.slice(1, -1).split(',').map(parseFloat);
  },
});

// Extension for vector operations in PostgreSQL
export const vectorExtension = sql`CREATE EXTENSION IF NOT EXISTS vector`;

// Add vector column to existing communications table
// Note: This is for type safety - actual migration handled by SQL
export const communicationsVectorFields = {
  sentimentVector: vector('sentimentVector'),
};

// Helper functions for vector search
export const vectorSimilaritySearch = sql`
  CREATE OR REPLACE FUNCTION search_similar_sentiments(
    query_vector vector(1536),
    match_threshold float DEFAULT 0.8,
    match_count int DEFAULT 10
  )
  RETURNS TABLE (
    id uuid,
    content text,
    sentimentScore real,
    similarity float
  )
  LANGUAGE plpgsql
  AS $$
  BEGIN
    RETURN QUERY
    SELECT 
      c.id,
      c.content,
      c."sentimentScore",
      1 - (c."sentimentVector" <=> query_vector) as similarity
    FROM communications c
    WHERE c."sentimentVector" IS NOT NULL
    AND 1 - (c."sentimentVector" <=> query_vector) > match_threshold
    ORDER BY c."sentimentVector" <=> query_vector
    LIMIT match_count;
  END;
  $$;
`;

// Vector index for performance
export const vectorIndex = sql`
  CREATE INDEX IF NOT EXISTS idx_sentiment_vector 
  ON communications 
  USING ivfflat ("sentimentVector" vector_cosine_ops)
  WITH (lists = 100);
`;