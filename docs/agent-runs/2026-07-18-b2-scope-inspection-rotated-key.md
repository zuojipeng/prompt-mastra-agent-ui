# Agent Run: B2 Scope Inspection With Rotated Key

Date: 2026-07-18

Task: C-039 / JC-T005

Orchestrator: Hermes

## Authorization

The human owner authorized one read-only v4 `b2_authorize_account` request with the rotated B2 key. Only bucket, region, name prefix, capabilities, and Key ID SHA-256 could be retained. Secret/token output, object operations, deployment, and retry were prohibited.

## Result

- Rotated configuration was a regular owner-only mode-0600 file with one link.
- Authentication succeeded and returned an inspectable bucket scope.
- The canonical least-privilege parser rejected one or more returned capabilities as outside its allowed set.
- The no-retry constraint was honored.
- No passing attestation, token, response body, object operation, deployment, or temporary source file remained.

## Review Finding

The temporary checker validated before publishing and therefore discarded the exact non-secret capability list on policy rejection. This is a tooling evidence gap, not permission to broaden the policy by assumption. A future separately approved read-only inspection must write a private rejection report before policy evaluation, then Security and Architecture must classify each extra capability.

## Repair Loop

Security Agent assigned Engineering Agent to add rejection-safe evidence before any further request. Architecture and Code Review required one canonical record for exact capability names and stable policy errors, separate from the passing attestation. Test Agent proved mode-0600 immutable publication, extra-capability retention, and rejection of widened authority. The repair passed 24 focused tests and the 172-test Python regression without reading credentials or making another network request.
