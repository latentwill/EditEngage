# ADR-003: Direct Research Provider APIs Over OpenRouter Proxy

**Date:** 2026-02-14
**Status:** Accepted
**Deciders:** Ed Kennedy

## Context

EditEngage's Research Agent needs to query multiple search and AI providers (Perplexity, Tavily, ChatGPT, Google/Serper, Exa, Brave Search). The existing v2 design uses OpenRouter as the LLM gateway for content generation. The question is whether research providers should also be routed through OpenRouter or integrated directly.

## Decision

Use direct API integrations for all research providers. OpenRouter is used only for the LLM synthesis/analysis step, not for discovery or citation tasks. Each provider is integrated via its own adapter implementing a common interface.

Supported providers at launch:
- **Discovery:** Tavily, Perplexity, Google/Serper, Exa, Brave Search
- **Analysis:** ChatGPT (OpenAI API), OpenRouter (any model), Perplexity
- **Citation:** Perplexity, Exa

## Consequences

### Positive
- Access to each provider's native capabilities (Perplexity's citations, Tavily's search index, Exa's neural search)
- Provider chaining with role assignment (discovery → analysis → citation)
- Parallel fan-out to multiple discovery providers for comprehensive results
- No single point of failure — if one provider is down, others still work

### Negative
- More API keys to manage (per-project, per-provider)
- More adapter code to maintain (7 provider adapters)
- Each provider has different rate limits, error formats, response shapes
- Users need accounts with multiple providers

### Neutral
- API keys stored encrypted in `research_providers` table (same encryption pattern as destinations)
- Provider adapters implement a common `ResearchProvider` interface for composability
- Adding new providers is an adapter implementation, not a schema change

## Alternatives Considered

### Alternative 1: Route Everything Through OpenRouter
- Description: Use OpenRouter's model catalog for all research tasks
- Pros: Single API key, single billing, unified interface
- Cons: OpenRouter doesn't provide web search (Tavily, Serper), can't access Perplexity's native citations, Exa's neural search is unavailable
- Rejected: Research providers have unique capabilities that can't be replicated through LLM prompting alone

### Alternative 2: Single Provider (Perplexity Only)
- Description: Use Perplexity for all research since it combines search + LLM
- Pros: Simplest integration, one API key, good search quality
- Cons: No provider diversity, single point of failure, misses Tavily's structured data and Exa's semantic search
- Rejected: Multi-provider research produces more comprehensive, reliable briefs

## Related Decisions
- ADR-002: Research page replaces topics (research is first-class)
