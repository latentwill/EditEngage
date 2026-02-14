# ADR-002: Research Page Replaces Topics Page

**Date:** 2026-02-14
**Status:** Accepted
**Deciders:** Ed Kennedy

## Context

The v2 design included a Topics page (`/dashboard/topics`) for managing a queue of content topics per project, and Research Agents as pipeline components that produce ResearchBriefs. These two concepts are tightly coupled — research produces findings, findings generate topics, topics feed content pipelines — but were treated as separate pages.

Users think about "research" as a first-class activity, not just "managing a topic queue." The topic queue is an implementation detail of the research process.

## Decision

Replace the Topics page with a Research page (`/dashboard/research`). The primary view is a list of research queries — configured, optionally scheduled research tasks using multiple providers. Topics become a byproduct of research (auto-generated from briefs), not a standalone management concept.

## Consequences

### Positive
- Research agents elevated to first-class citizens with their own management surface
- Research queries show their full lifecycle: query → providers → brief → topics → content
- Pipeline connections are explicit ("Feeds into: SEO Blog Pipeline")
- Users think in terms of research goals, not topic queues

### Negative
- Users who only want manual topic management lose a dedicated simple page
- Research queries add complexity (provider configuration, chaining, scheduling)
- The topic queue is now a secondary/nested view, less prominent

### Neutral
- Topics still exist in the data model; they're just accessed through the research query detail view
- Manual topic addition can still be supported within the research page

## Alternatives Considered

### Alternative 1: Keep Topics, Add Research as Separate Page
- Description: Topics and Research as two separate nav items
- Pros: Each concern gets its own space
- Cons: Fragments the research-to-content workflow; users navigate between two pages
- Rejected: Topics and research are the same workflow; separating them creates unnecessary navigation

### Alternative 2: Topics as Primary, Research as Tab
- Description: Keep Topics page, add a "Research" tab within it
- Pros: Topics stays familiar, research is additive
- Cons: Doesn't reflect the actual importance of research agents; topics-first thinking is backwards
- Rejected: Research is the driver; topics are the output. The hierarchy should reflect this.
