# Agent Run: Preview Runtime No-Retry Transport

Date: 2026-07-19

Task: C-046 / JC-T005

Orchestrator: Hermes

## Goal

Convert the retained-source operation's process-local no-retry safeguard into a tracked, reusable preview-runtime policy without contacting B2 or duplicating Genblaze storage behavior.

## Execution

- Added `NoRetryS3StorageBackend`, a thin Genblaze subclass that merges only Botocore's retry configuration to `total_max_attempts=1` and standard mode.
- Changed the default live B2 factory to the subclass. Offline and caller-injected factories are unchanged.
- Added a focused unit test that proves Genblaze's existing connect timeout survives the merge while the three-attempt adaptive policy becomes one total attempt.
- Extended runtime validation and mutation tests to reject removal, default-factory drift, or retry widening.

## Result

The preview runtime now has a code-frozen single-attempt B2 policy. No credential, private evidence, network, storage object, cloud resource, deployment, publication, or submission was touched.
