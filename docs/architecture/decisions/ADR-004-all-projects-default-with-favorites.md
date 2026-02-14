# ADR-004: "All Projects" Default with Favorites

**Date:** 2026-02-14
**Status:** Accepted
**Deciders:** Ed Kennedy

## Context

EditEngage targets agency-scale users managing 10+ properties (projects). The v2 design included a project switcher dropdown in the navigation, but it was designed for 2-3 projects. At 10+ projects, users need:
1. A way to see aggregated data across all properties
2. Quick access to frequently used projects
3. Search to find specific projects

The question is what the default view should be on login.

## Decision

"All Projects" is the default selection on login. It aggregates metrics, feed content, and research queries across all projects the user has access to. Each item (feed card, research query, activity event) shows a color-coded project badge for identification.

Users can favorite (star) projects, which pin them to a "Favorites" section at the top of the selector. The selector includes type-to-search filtering by project name or domain. Selected project persists in the URL query parameter for bookmarking.

## Consequences

### Positive
- Agency managers get cross-property overview immediately on login
- Favorites reduce the dropdown list to a manageable size
- URL persistence enables bookmarking specific project views
- Color-coded badges provide visual project identification without extra clicks

### Negative
- "All Projects" queries span multiple project scopes (more complex Supabase queries)
- Dashboard metrics need aggregation logic (sum across projects, not just one)
- Feed in "All Projects" mode shows higher content volume, may feel overwhelming
- Favorite state requires a new `user_preferences` table

### Neutral
- RLS still enforces data isolation — "All Projects" only shows projects in the user's org(s)
- Selecting a specific project filters everything to that scope (existing behavior)
- `default_project` column in user_preferences allows users to override the default later

## Alternatives Considered

### Alternative 1: Last Used Project as Default
- Description: Remember and restore the last selected project on login
- Pros: Contextual, user picks up where they left off
- Cons: Doesn't serve the "cross-property overview" use case; new sessions start in a narrow scope
- Rejected: Agency managers want the big picture first, then drill down

### Alternative 2: No Default, Force Selection
- Description: Project selector is empty on login; user must pick a project
- Pros: Explicit, no assumptions
- Cons: Extra click on every session; annoying at 2-3 projects, painful at 10+
- Rejected: Friction on every login is unacceptable

### Alternative 3: Simple Dropdown Without Search/Favorites
- Description: Basic dropdown with all projects listed alphabetically
- Pros: Simple to implement
- Cons: Doesn't scale past 10 projects; scrolling through 20+ projects is unusable
- Rejected: Must support agency scale from day one
