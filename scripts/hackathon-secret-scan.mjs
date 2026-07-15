export const MAX_SCAN_BYTES = 1_000_000;

const SECRET_RULES = [
  ['private_key', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['openai_token', /\bsk-[A-Za-z0-9_-]{24,}\b/g],
  ['github_token', /\bgh[pousr]_[A-Za-z0-9]{30,}\b/g],
  ['cloudflare_token', /\bcfut_[A-Za-z0-9_-]{30,}\b/g],
  ['aws_access_key', /\bAKIA[0-9A-Z]{16}\b/g],
  ['runway_token', /\bkey_[0-9a-fA-F]{128}\b/g],
  [
    'assigned_secret',
    /\b(?:B2_APP_KEY|B2_KEY_ID|RUNWAYML_API_SECRET|JINGCI_PREVIEW_BEARER_TOKEN|OPENAI_API_KEY|CLOUDFLARE_API_TOKEN)\s*=\s*["']?(?!<|\$\{)[A-Za-z0-9+/_=-]{20,}/g,
  ],
];

export function scanSecrets(files) {
  const findings = [];
  for (const file of [...files].sort((left, right) => left.path.localeCompare(right.path))) {
    const buffer = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content);
    if (buffer.length > MAX_SCAN_BYTES || buffer.includes(0)) continue;
    const content = buffer.toString('utf8');
    for (const [rule, expression] of SECRET_RULES) {
      expression.lastIndex = 0;
      for (const match of content.matchAll(expression)) {
        findings.push({
          path: file.path,
          line: content.slice(0, match.index).split('\n').length,
          rule,
        });
      }
    }
  }
  return findings.sort((left, right) =>
    left.path.localeCompare(right.path) || left.line - right.line || left.rule.localeCompare(right.rule),
  );
}
