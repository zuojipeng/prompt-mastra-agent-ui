# Demo Video Script: Jingci Provenance Vault

Target runtime: **2:35**

Status: rehearsal draft. Record the final version only after live B2 evidence exists.

## 0:00–0:15 — Problem

Voiceover:

> AI video creators lose the connection between a shot plan, the exact model run, the generated asset, and the retry that finally worked. Jingci keeps that chain inspectable.

Screen: Open Jingci and show the compact DirectorKit workbench.

## 0:15–0:42 — Shape The Creative Idea

Voiceover:

> I start with one idea. Jingci diagnoses generation risks before spending model credits, then gives me safe, stylish, and cinematic directions.

Screen: Enter the wasteland robot idea, run diagnosis, and choose the cinematic version.

## 0:42–1:08 — Build The DirectorKit

Voiceover:

> The result is not one long prompt. It is an execution package with shot purpose, action, camera motion, consistency risks, stability checks, platform guidance, and recovery options.

Screen: Move quickly through story setting, shot card, risk tags, and platform feed package.

## 1:08–1:48 — Run And Verify One Shot

Voiceover for the final B2-backed recording:

> I run the selected shot through a Genblaze pipeline. Genblaze connects the provider step to object storage, while Backblaze B2 stores the generated media and a separate provenance manifest. The browser accepts success only when both records have valid hashes and the manifest is verified.

Screen: Select shot 1, run provenance, then show provider/model, B2 asset URI, SHA-256, manifest URI, canonical hash, and Verified state.

Rehearsal rule: while the UI says `Fixture` or `Local adapter`, say “local integration proof” and do not use the B2-backed voiceover.

Voiceover for the current local rehearsal:

> This is a local integration proof, not a live provider or Backblaze upload. The browser calls our Python Genblaze adapter, receives deterministic media from memory storage, and accepts the run only after the asset digest and provenance manifest verify.

## 1:48–2:10 — Failure And Retry Lineage

Voiceover:

> A failed generation stays recoverable. Retrying increments the attempt and preserves the parent run, so the useful result never loses its creative history.

Screen: Show failure recovery, retry, parent run, and attempt 2.

Rehearsal rule: this failure path uses the visibly labeled offline `Fixture`. State that it proves UI recovery and lineage semantics, not provider reliability.

## 2:10–2:28 — Production Path

Voiceover:

> This turns generated media from a disposable provider link into an auditable production asset. The same project keeps execution status, handoff evidence, and platform feedback together.

Local rehearsal replacement:

> The live design will turn temporary provider output into an auditable production asset. Today, the local proof verifies the contract and keeps its limitations visible.

Screen: Show project readiness and feedback calibration briefly.

## 2:28–2:35 — Close

Voiceover:

> Jingci Provenance Vault: direct the shot, generate it, prove it, and improve the next run.

Screen: End on the verified selected-shot panel and product name.

## Recording Gate

- Final runtime is below 2:55, leaving upload/transcode margin below the three-minute rule.
- English voiceover or accurate English subtitles are present.
- No third-party music, trademarks, private URLs, tokens, account IDs, or personal data appear.
- Final footage shows live B2 evidence, not Fixture or Local adapter labels.
- Video is publicly visible on YouTube, Vimeo, or Youku before the link is added to Devpost.
