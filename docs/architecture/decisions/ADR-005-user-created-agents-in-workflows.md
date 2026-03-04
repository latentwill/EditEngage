# ADR-005: User-Created Agents Replace Hardcoded Workflow Steps

**Date:** 2026-03-03
**Status:** Accepted
**Deciders:** Ed Kennedy

## Context

The workflow wizard (WorkflowWizard.svelte) uses hardcoded agent types (topic_queue, variety_engine, seo_writer, ghost_publisher, etc.) for step selection. These generic agents don't map to anything the user has configured. The app already has user-created writing agents and research agents with their own configurations.

The wizard should use the user's own objects as building blocks, not abstract generic types.

## Research

| Option | Pros | Cons | Fit |
|--------|------|------|-----|
| User-created agents only | Intuitive, uses existing objects, per-agent config | Requires agents to exist first | Best |
| Hybrid (user + generic) | Works without agents created | Confusing mix, generic agents have no real backing | Poor |
| Template workflows with agent slots | Guided experience | Over-engineered, constrains flexibility | Poor |

## Decision

Remove all hardcoded agent types. The workflow agent selection step fetches the user's writing agents and research agents from Supabase and presents them as selectable cards grouped by type. Each selected agent gets inline configuration for topics and destination.

Wizard steps become: Name → Agents → Configure (per-agent) → Schedule → Review.

## Consequences

### Positive
- Workflows use real, configured agents — no abstraction gap
- Per-agent config (topics, destination) is contextual and clear
- Simpler mental model: "pick your agents, configure each one"

### Negative
- Users must create at least one agent before building a workflow
- Need empty state UX when no agents exist

### Neutral
- Style is baked into writing agent config, not selected in workflow wizard
- Research agents treated as first-class workflow steps alongside writing agents
