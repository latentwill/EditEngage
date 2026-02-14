# ADR-001: Newsfeed Approval Flow Over Content List

**Date:** 2026-02-14
**Status:** Accepted
**Deciders:** Ed Kennedy

## Context

EditEngage needs a primary interface for reviewing AI-generated content across multiple pipelines and projects. The v2 design originally specified a Content page (`/dashboard/content`) with a filterable list and separate detail/editor views. At agency scale (10+ properties with continuous pipeline output), this page-based approach requires too many clicks — users must filter, select an item, navigate to it, review, navigate back, select the next item.

Three distinct usage patterns need to coexist on the same surface:
1. **Monitoring** — passively watching content flow through
2. **Speed reviewing** — quickly approving/rejecting without deep reading
3. **Deep editing** — carefully editing title, body, meta before approving

## Decision

Replace the Content page with an infinite-scroll newsfeed (`/dashboard/feed`) as the primary content interaction surface. Content cards appear in reverse-chronological order with inline approve/reject buttons. Clicking "Edit" opens a full-screen editor with sequential next/prev navigation through filtered items.

## Consequences

### Positive
- Single surface serves all three usage modes (monitor, speed review, deep edit)
- Reduced click count for reviewing content (inline actions, no navigation)
- Real-time content arrival via Supabase subscriptions creates a "live" feel
- Sequential editor navigation enables "review session" workflow

### Negative
- Virtual scrolling adds complexity (must handle 100k+ items performantly)
- Feed scroll position must be preserved when returning from the editor
- "All Projects" mode means cards need project badges, adding visual density
- Cursor-based pagination is more complex than offset-based

### Neutral
- The Content detail page is removed; all content editing happens in the full-screen editor
- Feed becomes the most-visited page, taking over from the dashboard as the "working" surface

## Alternatives Considered

### Alternative 1: Enhanced Content List (Table View)
- Description: Keep the filterable list but add inline actions and a side panel editor
- Pros: Familiar pattern, dense information display
- Cons: Side panel limits editing space; table doesn't support monitoring mode well
- Rejected: Doesn't serve the monitoring use case; inline editing in tables is cramped

### Alternative 2: Kanban Board (Status Columns)
- Description: Columns for Draft, In Review, Approved, Published, Rejected with drag-and-drop
- Pros: Visual status overview, satisfying drag interactions
- Cons: Poor for high-volume content (columns overflow), no sequential review flow
- Rejected: Doesn't scale to agency volume; drag-and-drop is slow for batch review

### Alternative 3: Inline-Expand Cards (No Full-Screen Editor)
- Description: Newsfeed with cards that expand in-place to reveal a full editor
- Pros: No context switch, stays in feed
- Cons: Limited editing space, other cards push down awkwardly, no sequential navigation
- Rejected: Thoughtful editing needs full screen; expanded cards disrupt feed layout

## Related Decisions
- ADR-002: Full-screen editor with sequential navigation
