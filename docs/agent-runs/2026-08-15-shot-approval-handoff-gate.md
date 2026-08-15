# Agent Run: Shot Approval Handoff Gate

Date: 2026-08-15
Task: JC-T009
Owner: Product Agent + Architecture Agent + Engineering Agent
Reviewer: Code Review Agent + Test Agent + Operator Agent
Gate: Product / Architecture / Engineering / Review / Test / Ops

## Goal

Prevent a shot marked `usable` from being reported as ready for operator handoff until the currently selected generation attempt has a matching human delivery approval receipt.

## Product Decision

- `usable` means the output passed creative inspection.
- `handoff ready` additionally requires a matching human approval receipt for the selected usable attempt.
- The receipt remains a normal application record: it is not identity proof, legal authorization, or cryptographic evidence.
- Generated and failed attempts continue to use the existing evidence-note rules; this slice does not require approval for failed evidence retained for diagnosis.

## Architecture Decision

Handoff policy now lives in `lib/handoff-readiness.ts`. Project summaries and DirectorKit operator acceptance consume the same pure derivation, avoiding separate readiness rules in dashboard and export paths.

Inputs are existing persisted facts only:

- shot status and result note;
- selected attempt ID;
- approval receipt attempt ID.

No new persisted readiness state or schema version was added.

## Delivery

- Added `unapprovedUsableShotIds` to the derived acceptance result.
- Added `镜头 N 缺交付审批` to project summary blockers.
- Added the matching blocker to the execution panel.
- Added an operator next action for unapproved usable shots.
- Added unit and desktop/mobile browser coverage for blocked-before-approval and ready-after-approval behavior.

## Hermes Decision

Decision: SHIP after full validation.

Next smallest action: carry approval-aware handoff summary fields through the backend Projects API and production smoke under a separate deployment approval.
