# Code Review: Release Evidence Collector

Reviewer: Code Review Agent + Test Agent + Claims Review Agent
Producer reviewed: DevOps Agent + Engineering Agent
Decision: PASS FOR LOCAL RELEASE EVIDENCE

## Strongest Rejection Reason

An evidence collector can become a confidence generator that labels skipped files as scanned, leaks the secret it detects, or turns a draft with an empty blocker array into a release candidate.

## Findings

1. P1, closed: the collector reads only repository files and Git metadata; it never reads process environment variables.
2. P1, closed: secret findings expose rule, path, and line only; tests prove the matched token is absent.
3. P1, closed after review: totals now separate scanned text from binary, oversized, and symlink exclusions. Non-binary exclusions block strict release.
4. P1, closed after review: shared strict helpers require `ready/submitted` and `preview-ready/deployed`; blocker-free draft/design states remain red.
5. P1, closed: artifact paths must remain inside the repository, be regular files, and not be symlinks before hashing.
6. P2, closed: output is stable for the same repository state, mode `0600`, Git-ignored, and excluded from its own hash set.
7. P2, accepted: pattern scanning is defense in depth, not proof that a repository contains no secret. Provider-side secret scanning remains desirable before publication.

## Residual Risk

The scanner does not inspect binary contents, Git history, ignored files, remote CI variables, platform secret stores, or provider revocation state. A zero-finding snapshot cannot replace GitHub/provider secret scanning or human release review.
