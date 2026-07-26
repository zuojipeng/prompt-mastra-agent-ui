import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { evaluateDeploymentPacket } from '../scripts/check-hackathon-deployment-packet.mjs';

const campaign = 'docs/campaigns/backblaze-genmedia-2026';
const packet = JSON.parse(readFileSync(`${campaign}/preview-deployment-packet.json`, 'utf8'));
const runtimePlan = JSON.parse(readFileSync(`${campaign}/preview-runtime-plan.json`, 'utf8'));
describe('hackathon preview deployment packet', () => {
  it('accepts the blocked redacted packet', () => {
    expect(evaluateDeploymentPacket(packet, runtimePlan)).toEqual([]);
  });

  it('rejects secret population, source drift, packet snapshot drift, and authority widening', () => {
    const changed = structuredClone(packet);
    changed.cloudflare_pages.bindings.B2_APP_KEY = 'must-not-appear';
    changed.cloudflare_pages.bindings.JINGCI_PREVIEW_SOURCE_SHA256 = '0'.repeat(64);
    changed.blockers = [];
    changed.authorization.deploy = true;
    const errors = evaluateDeploymentPacket(changed, runtimePlan);
    expect(errors).toContain('secret field must remain null: cloudflare_pages.bindings.B2_APP_KEY');
    expect(errors).toContain('retained source binding drift: JINGCI_PREVIEW_SOURCE_SHA256');
    expect(errors).toContain('packet blocker snapshot drift');
    expect(errors).toContain('authorization deploy must remain false');
  });
});
