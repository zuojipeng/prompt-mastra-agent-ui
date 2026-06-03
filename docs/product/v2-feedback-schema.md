# Product Spec · V2 Feedback Schema

Date: 2026-06-03
Owner: Product Agent
Scope: Standardized feedback payload for DirectorKit and Phase 2 learning loop

## Goal

Make user feedback analyzable by creative type, platform, shot risk, generation mode, and failure reason.

## Event Types

- `legacy_prompt`: old prompt-level feedback.
- `director_kit`: feedback for the whole DirectorKit output.
- `shot_card`: feedback for a specific shot.
- `platform_advice`: feedback for platform execution guidance.

## Payload Fields

Required:
- `rating`: `like` or `dislike`

Recommended:
- `source`: `v1` or `v2`
- `input`
- `prompt`
- `comment`
- `eventType`
- `targetDuration`
- `targetType`
- `selectedVersionType`
- `platform`
- `generationMode`
- `riskLevel`
- `riskTags`
- `failureReasons`

## Learning Questions

The schema should support these questions:
- Which target types get the most dislikes?
- Which platforms have the most failure feedback?
- Which risk tags appear most often in failed shots?
- Are `text-to-video`, `image-to-video`, or `reference-image` recommendations working better?
- Which failure reasons should update the next prompt/template iteration?

## Out Of Scope

- User identity or account system.
- Public analytics dashboard.
- Automatic prompt retraining.
