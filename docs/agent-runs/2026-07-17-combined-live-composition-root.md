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

## Successful Task Recovery

The next approved attempt completed at Runway and consumed exactly 60 credits. Download was blocked only because the local transparent proxy maps the exact reviewed CloudFront host to `198.18.0.0/15`, which the original SSRF guard treated as an ordinary non-public address. Request history proved one create, successful polling, and no cancellation.

Engineering limited the exception to exact trusted output hosts resolving solely into the benchmark fake-IP range while retaining HTTPS, certificate, redirect, byte, and hostname validation. The existing succeeded output was downloaded without another create, passed ffprobe, and was passed through a dedicated recovery provider with `provider_create_count=0`. Genblaze asset and manifest read-back succeeded against B2, exact-key cleanup completed, and the local MP4 remains private for demo review.
