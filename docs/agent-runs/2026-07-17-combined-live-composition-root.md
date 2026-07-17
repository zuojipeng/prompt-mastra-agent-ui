# Agent Run: Combined Live Composition Root

Date: 2026-07-17
Campaign: Backblaze GenAI Media Challenge
Task: C-026

Hermes selected the smallest slice that prevents wasting the newly funded Runway attempt: promote the already reviewed offline Runway-to-B2 composition into one guarded live root before requesting spend authorization.

Architecture and Engineering added a live dependency boundary around the existing no-retry provider, ffprobe gate, Genblaze content-addressed sink, B2 read-back, explicit-key cleanup, and private evidence contract. Security review moved approval validation and result-path collision checks ahead of network initialization, rejects unsafe approval files, and uses the durable journal at provider-create time. Post-consumption failures preserve conservative non-attestable recovery evidence and never trigger another create.

No external API was called and no credits were consumed. The next gate is a human authorization bound to the clean pushed commit, one five-second `gen4.5` attempt, and a maximum of 60 credits (`$0.60`).

## Live Attempt Follow-up

The renewed one-shot execution reached Runway: one create was accepted and 60 credits were deducted. The task remained active while the composition root exhausted an unintended 30-second offline-fixture deadline, after which the provider guard canceled it once. There was no retry, returned media, or B2 mutation.

Engineering separated live runtime policy from fixture policy: live execution now permits 600 seconds, downloads at most 100 MiB, and uses real five-second sleeps. Test Agent added a direct dependency-boundary regression, Claims Review kept all live claims false, and Hermes restored the one-attempt authorization blocker.
