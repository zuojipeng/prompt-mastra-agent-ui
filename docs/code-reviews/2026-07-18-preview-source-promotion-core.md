# Code Review: Preview Source Promotion Core

Status: PASS OFFLINE; LIVE ENTRYPOINT ABSENT
Producer: Architecture Agent + Engineering Agent
Reviewer: Security Agent + Code Review Agent

## Findings Closed

1. **BLOCKER - approval scope mismatch.** Existing durable approval authorizes one paid Runway attempt and temporary B2 verification, not retained source promotion. No live composition was added.
2. **BLOCKER - accidental overwrite.** The core checks exact-key absence before put and never deletes an existing object.
3. **BLOCKER - unverified persistence.** Success requires exact-key observability, byte equality, and SHA-256 read-back before backend close.
4. **BLOCKER - failed new upload residue.** After ownership begins, any failure deletes only the approved source key before closing.
5. **BLOCKER - accidental execution surface.** The CLI parser requires `--plan`; there is no `--live` branch, credential read, source path, or backend factory call.

## Residual Risks

- A future composition root needs canonical mode-0600 approval and result files, commit/source/bucket binding, immutable at-most-once consumption, crash recovery, and secret scanning.
- Real B2 overwrite races require bucket/key policy plus a post-put ownership decision; the current pre-check alone is not a distributed compare-and-set.

## Verdict

The primitive is appropriately small and testable. It must not be exposed to live credentials until the dedicated approval and recovery contract exists.
