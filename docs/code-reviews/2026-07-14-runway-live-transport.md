# Code Review: Guarded Runway Live Transport

Reviewer: Architecture Agent + Claims Review Agent + Code Review Agent + Test Agent
Decision: PASS FOR OFFLINE HARNESS ONLY

## Findings

1. P1, closed: current REST reference uses `/v1/text_to_video`; the older guide conflict is recorded.
2. P1, closed: task IDs are UUID-shaped before entering paths.
3. P1, closed: provider preserves typed client errors and never automatically resubmits a paid create.
4. P1, closed: active polling failures cancel once, while post-success download failures preserve the completed output.
5. P1, closed: redirects are manual, limited to three, validated before fetch, and stripped of API headers.
6. P1, closed: JSON/media reads enforce declared and actual byte ceilings and reject mismatches.
7. P1, closed: plan mode is environment-free and denied live mode reads only its confirmation key.
8. P1, closed: `ffprobe` checks one 1280x720 video stream, approved codec, and duration tolerance.
9. P2, closed: successful DELETE 204 and documented repeat 404 are both handled.
10. P2, closed: system proxies and implicit urllib redirects are disabled.
11. P1, closed after independent review: `ffprobe` receives only `LC_ALL=C`, closed stdin, and no live process environment.
12. P1, closed after independent review: each stream read gets the remaining monotonic deadline and timeout errors stay typed.
13. P1, closed after independent review: malformed terminal-success output is preserved and never DELETEd.
14. P2, closed after independent review: probe stdout/stderr use file-size-limited temporary files rather than unbounded pipes.
15. P2, closed after independent review: normal, HTTP-error, oversize, and read-failure responses close deterministically.
16. P1, closed after second review: socket read timeouts become sanitized `ProviderErrorCode.TIMEOUT` failures.
17. P1, closed after second review: DNS resolution has its own future deadline and transport receives a freshly calculated remaining budget.
18. P2, closed after second review: a real child-process overflow exercises the ffprobe file-size limit.
19. P1, closed after final review: live DNS resolution runs in an isolated process that is killed and reaped on timeout; no blocked resolver thread can extend command lifetime.

## Residual Risk

No live request has run. The stdlib client checks DNS answers before urllib opens the request, but does not pin that checked address to the TLS connection. Public deployment therefore still requires egress enforcement or a reviewed connector that pins the validated address while retaining hostname verification. Exact output hosts are also unverified until a separately approved generation. These limitations remain explicit blockers, not implied evidence.
