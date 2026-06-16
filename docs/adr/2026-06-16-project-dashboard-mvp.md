# ADR: Project Dashboard MVP

Date: 2026-06-16

## Status

Accepted

## Context

The local project library lets creators save and reopen recent projects, but navigation is still hidden in the left rail. Jingci needs a stronger project-management surface before backend project sync, so the product shape can prove how creators browse, search, and resume multiple works.

## Decision

Add an in-workbench Project Dashboard panel.

- Keep the dashboard inside the current workbench instead of adding a route while project data is still local-only.
- Use `LocalProjectWorkspaceSummary` as the dashboard input.
- Provide project counts, ready-project count, and shot progress.
- Provide search by title or target type.
- Provide status filtering by workspace stage.
- Allow opening and deleting projects from the dashboard.

## Consequences

The product now has a visible project-management surface without introducing backend dependency. A later backend sync slice can replace the local data source and promote the dashboard into a full project index page if needed.

