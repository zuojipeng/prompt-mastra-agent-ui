# Backblaze GenMedia 2026 Postmortem

Date: 2026-08-13
Outcome: Submitted successfully; not selected for a prize
Submission: https://devpost.com/software/jingci-provenance-vault
Official results: https://backblaze-generative-media.devpost.com/project-gallery

## Executive Read

Jingci proved that the team can register, build, review, publish, and submit a credible hackathon entry under real credentials, spend, storage, legal, security, and claims gates. The entry did not win because the public judging surface demonstrated a deterministic Fixture while the strongest winners made live generation, storage, recovery, and review behavior directly inspectable.

The product thesis was directionally correct. Provenance, receipts, lineage, recovery, and governed media appear repeatedly across the winners. The execution gap was not “wrong idea”; it was that the strongest infrastructure claims remained private, split across two phases, or qualified out of the public runtime.

## Verified Result

- 1,314 participants and 243 submissions were shown on the official Devpost surfaces.
- Thirteen entries received winner badges: three cash placements and ten Feedback prizes.
- Jingci's public project page remains available and has no winner badge.
- Grand Prize: FirstFrame.
- Second Place: Beavous.
- Third Place: Takegraph.

## Winner Pattern Matrix

| Pattern | Winners demonstrate | Jingci demonstrated | Gap |
| --- | --- | --- | --- |
| Immediate utility | A concrete studio, campaign, or production task with a measurable outcome | A creator provenance and handoff problem | Good thesis, weaker immediate before/after metric |
| Live judge path | Anonymous, directly runnable workflows with real generation or observable production behavior | Anonymous zero-network Fixture demo | Critical |
| B2 as system behavior | Streaming, immutable masters, durable memory, recovery, or verifiable public receipts | Private scoped upload/read-back plus retained source; public demo did not reach B2 | Critical |
| Genblaze as orchestration | Multi-step or multi-provider pipeline behavior visible in the product | Official extension points and a guarded adapter, mainly evidenced offline/private | High |
| Failure handling | Self-healing, partial regeneration, backpressure, or human escalation visible to judges | Strong fail-closed contracts and recovery evidence, but not public end to end | High |
| Product story | One memorable job and one clear claim | DirectorKit plus Provenance Vault plus evidence governance | Too broad for a short judging pass |
| Claims credibility | Concrete runtime proofs and receipts | Exceptionally conservative, reviewed claims | Strength, but qualification dominated the story |

## What Worked

1. **Submission operations became real.** The team completed registration, terms, scoped spend, B2 least privilege, public deployment, bilingual video, claims review, final submission, and anonymous verification.
2. **The evidence standard prevented false claims.** Fixture, local, private live, retained, and public claims remained distinguishable.
3. **The provenance direction was validated by the market.** Several winners centered receipts, immutable lineage, verification, and governed media.
4. **Security was stronger than a typical hackathon build.** Keys were scoped and rotated, secrets remained private, and paid calls were bounded.
5. **The campaign produced reusable assets.** The provider harness, B2 contracts, demo workflow, submission packet, and human-gate mechanics can seed future entries.

## What Hurt The Score

1. **The public demo was truthful but strategically weak.** Judges could not exercise the strongest Runway-to-Genblaze-to-B2 evidence themselves.
2. **B2 was proven as a controlled integration, not experienced as a product primitive.** Winning entries made storage visibly responsible for streaming, memory, immutability, or public verification.
3. **The core story split attention.** Prompt workbench, DirectorKit, provenance, security, retry lineage, and evidence governance competed for the same short demo.
4. **The team optimized for avoiding overclaiming later than it optimized for a judgeable architecture.** The correct remedy is not weaker claims; it is designing the public runtime so the strongest truthful claim is easy to demonstrate.
5. **The campaign started late.** The hackathon-specific branch began July 13 for an August 3 deadline, leaving little room to turn private verification into a robust public path.

## Product Decisions

### Keep in Jingci product mainline

- explicit selected-attempt evidence
- provider/model/cost/duration lineage
- project-level creative ledger
- retry parent-child history
- platform calibration and feedback-to-next-iteration loop
- portable project handoff receipts

### Do not merge blindly

- campaign-only Cloudflare Access experiments
- one-off approval journals tied to this contest
- static Fixture labels and Devpost copy
- contest-specific B2 object prefixes and retained media

### Next product thesis

Jingci should become a **production ledger for AI video decisions**, not only a prompt optimizer. The smallest compelling loop is:

`brief -> shot plan -> generate one selected shot -> compare attempts -> approve -> durable receipt -> learn from feedback`

## Next Hackathon Go/No-Go Gate

Do not enter another infrastructure-heavy competition with Jingci unless all five conditions are true at least seven days before submission:

1. A judge can run one real end-to-end path anonymously or with organizer-provided credentials.
2. The sponsor technology is load-bearing in that path, not mentioned only in architecture or private evidence.
3. The demo has one primary job, one primary user, and one measurable outcome.
4. Failure and recovery can be triggered or inspected from the public product.
5. The exact submitted claim passes anonymously from a clean browser and is backed by E4/E5 evidence.

If any condition fails, either narrow the entry to a truthful executable slice or skip the competition.

## 30-Day Recovery Plan

### Week 1: preserve and classify

- freeze campaign artifacts and result evidence
- identify reusable product code versus contest-only infrastructure
- rotate or delete remaining campaign credentials and review retained B2 objects

### Week 2: productize one live loop

- expose one provider-neutral selected-shot execution boundary
- store an immutable public-safe receipt without exposing private media or credentials
- keep paid execution human-gated

### Week 3: make failure visible

- add retry lineage, failed-attempt retention, and recovery state to the real project workflow
- verify desktop/mobile and clean-browser behavior

### Week 4: produce a judge-grade benchmark

- record time-to-first-result, recovery success, and handoff completeness
- create a 90-second demo focused on one measurable job
- run a cold reviewer test with no project context

## Final Decision

Campaign delivery: PASS.
Competition outcome: NOT SELECTED.
Product thesis: CONTINUE, NARROW.
Immediate action: convert selected-shot provenance from campaign evidence into one real, judgeable product loop before entering another sponsor-infrastructure competition.
