# Product Taste Principles

Purpose: give Product Agent, UEAgent, Engineering Agent, and Hermes a shared bar for deciding what deserves to exist.

This document is intentionally cross-project. Apply it before writing PRDs, UI specs, or implementation plans.

## 1. Product Taste Is Judgment, Not Decoration

Good product taste means choosing what should be made, what should be hidden, and what should be refused.

For every feature, answer:
- What user job does this serve?
- What does it replace in the user's current workflow?
- What decision does it help the user make faster or better?
- What can be removed because this exists?
- What observable behavior will prove it worked?

If these cannot be answered, the feature is not ready for design or code.

## 2. Start From The Job

Use Jobs To Be Done as the default product lens:

```text
When [situation],
I want to [make progress],
so I can [desired outcome].
```

Do not define the job as "use our feature". Define the job as the user's real progress outside the app.

For Jingci:

```text
When I have an AI video idea but do not know if it will generate well,
I want to turn it into a stable director execution package,
so I can produce usable shots with less platform trial-and-error.
```

## 3. Prefer Workflows Over Feature Lists

A product becomes professional when features reinforce one workflow.

Default workflow standard:

```text
Input
  -> Diagnosis
  -> Decision
  -> Execution
  -> Evidence
  -> Feedback
  -> Next iteration
```

Features outside this chain must justify why they belong now.

## 4. Define The Product Shape

Before design or engineering, classify the product:

| Shape | Design bias |
| --- | --- |
| Professional workbench | Dense, stable, decision-oriented, low decoration |
| Consumer creation app | Expressive, fast, emotionally clear |
| Operational SaaS | Scan-friendly, predictable, status-heavy |
| Game / entertainment | Interactive, playful, feedback-rich |
| Documentation / knowledge tool | Readable, structured, searchable |

Jingci's current shape is a professional AI video director workbench. It should feel like a production cockpit, not a marketing landing page.

## 5. Success Metrics Must Be Behavioral

Avoid vanity metrics as primary success criteria.

Prefer:
- Completion rate of the core workflow
- Time from input to usable output
- Copy/export rate
- Shot usable rate
- Feedback submission rate
- Repeat creation rate
- Error recovery rate

For AI products, add:
- Structured output validity
- Regeneration rate
- User correction rate
- Sample size before drawing conclusions

## 6. Use Product Constraints As Quality

Professional products are opinionated.

Good constraints:
- Prevent invalid input
- Make risky choices visible
- Recommend the next action
- Explain why a path is unsuitable
- Reduce the need for prompt-craft memory

Bad constraints:
- Hide essential controls
- Force a single workflow when users need comparison
- Add friction only to protect implementation shortcuts

## 7. Avoid Feature Inflation

Reject or delay features when:
- They do not improve the core workflow
- They require a data model the product cannot yet support
- They create UI surface area without changing user behavior
- They duplicate an external tool without a strong reason
- They make onboarding look impressive but daily use slower

## 8. Product Review Checklist

Before a slice enters design:
- The user job is explicit.
- The target user and scenario are specific.
- Non-goals are written down.
- The core workflow step is identified.
- Success is observable.
- Failure and fallback behavior are described.
- The slice can be validated in one small release.

## 9. Reference Base

Use these as stable foundations, not slogans:
- Clayton Christensen: Jobs To Be Done
- Teresa Torres: continuous discovery and opportunity solution trees
- Marty Cagan: empowered product teams and product risk
- Shape Up: appetite, shaping, and scope control
- Don Norman: discoverability, feedback, constraints, mapping
