# Agent Review Rubric

Purpose: a shared review checklist for every Agent before handing work back to Hermes.

This rubric applies to product specs, UE specs, code, tests, release plans, and review reports.

## 1. Universal Review

Every Agent must answer:
- What user or system problem did this solve?
- What changed?
- What did not change?
- What evidence proves it works?
- What risk remains?
- Which Agent owns any follow-up?

If evidence is missing, the output is not ready.

## 2. Product Agent Rubric

PASS requires:
- User job is concrete.
- Target user is specific.
- Success metric is observable.
- MVP scope and non-goals are explicit.
- Acceptance criteria can become tests.
- The feature belongs to the current workflow stage.

FAIL when:
- Requirements are broad slogans.
- The feature is mostly internal convenience.
- Success cannot be measured.
- It expands scope without removing anything.

## 3. UEAgent Rubric

PASS requires:
- Primary path is clear.
- Information hierarchy is justified.
- Loading, empty, error, success, and partial states exist.
- Desktop and mobile behavior are defined.
- The design matches product shape.
- Controls match user intent.

FAIL when:
- It is only a visual style proposal.
- It relies on instruction text to explain basic use.
- Important states are missing.
- It adds decoration without workflow value.

## 4. Architecture Agent Rubric

PASS requires:
- The design is the smallest sufficient architecture.
- Domain boundaries are named.
- Data contracts are explicit.
- Complexity risks are identified.
- Abstractions are justified by real pressure.
- Migration and rollback concerns are called out when relevant.

FAIL when:
- It introduces framework-like structure without need.
- It ignores existing code patterns.
- It hides complexity behind vague modules.
- It cannot explain why simpler options were rejected.

## 5. Engineering Agent Rubric

PASS requires:
- Implementation is scoped.
- Existing patterns are respected.
- Type checks pass.
- Critical behavior has tests.
- Error paths are recoverable.
- No unrelated cleanup is mixed in.

FAIL when:
- The implementation changes behavior outside scope.
- Types are weakened to satisfy the compiler.
- Tests are skipped without an explicit blocker.
- The code duplicates domain rules in multiple places.

## 6. Code Review Agent Rubric

PASS requires:
- Findings lead with bugs, regressions, security, and test gaps.
- Every issue references files and lines.
- Severity is clear.
- No P0/P1 issue remains.

FAIL when:
- Review focuses on style while missing behavior risk.
- Findings are vague.
- It approves untested critical behavior.

## 7. Test Agent Rubric

PASS requires:
- Test plan maps to acceptance criteria.
- Automation covers the core path.
- E2E or equivalent manual evidence exists for user-facing workflows.
- Failures include reproduction and owner.
- Residual risk is stated.

FAIL when:
- Only happy paths are tested for risky changes.
- Browser behavior is assumed but not verified.
- Reports omit command outputs or environment.

## 8. DevOps Agent Rubric

PASS requires:
- Build and deployment steps are explicit.
- Required secrets/config are listed.
- Health checks are executable.
- Rollback path exists.
- Monitoring or smoke verification is defined.

FAIL when:
- Deployment relies on hidden local state.
- Rollback is vague.
- Production verification is missing.

## 9. Hermes Final Gate

Hermes may ship only when:
- Product intent is preserved.
- UE quality is acceptable for the product shape.
- Architecture is not overbuilt.
- Tests match risk.
- Release or rollback impact is understood.

When in doubt, choose the smaller reversible slice.
