# Architecture Note: Selected Attempt Export

Date: 2026-08-01
Status: Accepted
Task: JC-T006

## Context

Shot attempts preserve provider, model, asset, cost, and duration, but the existing checklist, project snapshot, and operator handoff only received the projected status and free-form result note. The selected result was visible in the workbench but lost at the delivery boundary.

## Decision

Extend `DirectorKitExportContext` with the optional attempt collection and selected-attempt IDs. Resolve the selected attempt in one internal pure helper and add its provider, model, status, asset reference, cost, and duration to the three handoff exports.

Selection remains explicit. If the selected ID is absent or no longer matches a retained attempt, exports omit attempt metadata instead of falling back to the latest attempt.

## Consequences

- old callers and saved projects remain compatible because the context fields are optional;
- all three handoff formats use the same selection semantics;
- unselected failures and superseded results cannot be mislabeled as final output;
- no workspace schema, API, provider SDK, billing, upload, or UI layout changes are introduced;
- platform feed packs remain unchanged because they describe pre-generation platform execution, not final-result handoff.
