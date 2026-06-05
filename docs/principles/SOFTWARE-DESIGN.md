# Software Design Principles

Purpose: give Architecture Agent, Engineering Agent, Code Review Agent, and Hermes a shared standard for code quality.

This is not a demand for heavy architecture. It is a guardrail against both messy code and premature abstraction.

## 1. Complexity Is The Enemy

Good design reduces the amount a maintainer must hold in their head.

Watch for:
- Long functions mixing data, UI, effects, and formatting
- Boolean state explosions
- Duplicated business rules
- Weakly typed external data
- Hidden coupling through global state
- Abstractions that hide only one line of code
- Generic frameworks created before multiple real use cases exist

## 2. Prefer Deep Modules

Following John Ousterhout's framing, prefer modules with simple interfaces and meaningful internal behavior.

Good module:
- Small public API
- Clear ownership
- Hides real complexity
- Has tests around behavior

Bad module:
- Many knobs
- Shallow wrapper around a library or DOM call
- Spreads domain rules across callers
- Exists only to sound architectural

## 3. Design Around Domain Language

Use names from the product domain.

For Jingci:
- DirectorKit
- ShotCard
- PlatformFeedPack
- FeedbackAnalytics
- ProjectSnapshot
- ShotResultNote

Avoid vague names:
- data
- item
- helper
- manager
- service
- util

Generic names are allowed only at boundaries where the domain is truly generic.

## 4. Choose The Smallest Sufficient Architecture

Default order:

```text
Inline implementation
  -> Extract pure function
  -> Extract component
  -> Extract domain module
  -> Extract service
  -> Introduce framework or external dependency
```

Only move right when complexity, duplication, testing, or ownership demands it.

## 5. Use Abstractions For Pressure, Not Aesthetics

Create an abstraction when at least one is true:
- Three or more real call sites share behavior
- A domain rule must be tested independently
- A boundary protects against external API drift
- A component is too large to reason about
- A side effect needs isolation

Do not abstract because:
- The function "might be reused"
- The name sounds cleaner
- A pattern exists in another codebase
- It makes a diff look more sophisticated

## 6. Keep Data Boundaries Typed And Validated

For external data:
- Define explicit types
- Validate at boundaries
- Normalize optional fields
- Keep frontend/backend contracts aligned
- Fail with recoverable errors

For AI products:
- Treat model output as untrusted data.
- Prefer schemas and safe defaults.
- Never let malformed model output crash the primary UI.

## 7. Design For Change Without Predicting Everything

Good code accepts likely change:
- API responses evolve
- UI states multiply
- Product terminology sharpens
- Tests need deterministic fixtures

Bad code predicts imaginary futures:
- Plugin systems before plugins
- Generic workflow engines before repeated workflows
- Config-driven UI before the UI is stable
- Persistence layers before persistence is required

## 8. Testing Is A Design Tool

Test the behavior users and maintainers depend on:
- Domain formatting and normalization
- API contracts
- Critical UI journeys
- Error and recovery states
- Regression bugs

Do not test implementation details unless they are the contract.

## 9. Code Review Rubric

Before merge:
- Is the behavior scoped to the task?
- Is there unrelated refactor churn?
- Are names domain-specific?
- Are data boundaries typed and validated?
- Are side effects isolated enough?
- Is the simplest sufficient design used?
- Are tests proportional to risk?
- Can this code be deleted or changed without surprising other areas?

## 10. Reference Base

Use these as stable foundations:
- John Ousterhout: A Philosophy of Software Design
- Martin Fowler: Refactoring and code smells
- Kent Beck: simple design and test-first thinking
- Eric Evans: domain language and bounded context
- Robert C. Martin: dependency direction, applied pragmatically
- Google SRE: reliability, rollback, observability
- Architecture Decision Records: explicit durable decisions
