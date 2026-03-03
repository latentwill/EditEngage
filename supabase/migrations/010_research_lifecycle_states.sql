-- Migration 010: Add lifecycle states to research_query_status enum
-- Enables: Queued -> Running -> Complete -> Consumed lifecycle tracking

ALTER TYPE research_query_status ADD VALUE IF NOT EXISTS 'queued';
ALTER TYPE research_query_status ADD VALUE IF NOT EXISTS 'complete';
ALTER TYPE research_query_status ADD VALUE IF NOT EXISTS 'consumed';
