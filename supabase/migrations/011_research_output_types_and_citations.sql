-- Migration 011: Research output types and citations
-- Task 47: Add output_type classification to research briefs
-- Task 48: Add structured citations with attribution metadata

-- Create research output type enum
CREATE TYPE research_output_type AS ENUM ('topic_candidate', 'source_document', 'competitive_signal', 'data_point');

-- Add output_type column to research_briefs
ALTER TABLE research_briefs ADD COLUMN output_type research_output_type NOT NULL DEFAULT 'source_document';

-- Add citations column to research_briefs for structured attribution
ALTER TABLE research_briefs ADD COLUMN citations jsonb NOT NULL DEFAULT '[]'::jsonb;
