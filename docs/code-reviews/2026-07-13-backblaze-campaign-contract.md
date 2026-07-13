# Code Review: Backblaze Campaign Contract

Reviewer: Code Review Agent + Test Agent
Producer reviewed: Product Agent + Architecture Agent + Engineering Agent
Decision: PASS FOR CONTRACT SLICE

## Strongest Rejection Reason

The parser could make a malformed provider payload look trustworthy by normalizing invalid result fields to `null`, especially in queued, running, or failed states.

## Findings

1. P1, closed: lifecycle checks initially inspected normalized values, allowing malformed non-terminal evidence to be treated as absent. The implementation now requires raw `result` and `error` fields to be explicitly `null` where the state contract demands absence.
2. P2, accepted: `Date.parse` proves parseability but not one canonical wire timestamp format. ISO serialization can be tightened when the transport is implemented.
3. P2, accepted: URLs are non-empty strings, not yet restricted to approved B2 origins. The live service must validate storage ownership and remote-byte integrity before release claims.
4. P2, accepted: this slice parses responses only. Submission request, polling/cancellation, fixture transport, persistence, and UI remain separate reviewed work.

## Evidence Checked

- Product acceptance criteria and non-goals.
- Architecture boundaries and rejected alternatives.
- Terminal-state invariants and negative tests.
- Full frontend regression, Python spike regression, TypeScript, scoped lint, and production build.

## Residual Risk

No live provider, B2 upload, browser lifecycle, authentication, deployment, or remote integrity behavior is proven.
