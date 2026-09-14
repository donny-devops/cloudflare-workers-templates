export type SecretKind =
	| "aws-access-key"
	| "github-token"
	| "private-key"
	| "slack-token"
	| "generic-api-key";

export interface SecretFinding {
	kind: SecretKind;
	redacted: string;
	label: string;
}

interface SecretRule {
	kind: SecretKind;
	label: string;
	pattern: RegExp;
}

const RULES: SecretRule[] = [
	{
		kind: "aws-access-key",
		label: "AWS access key id",
		pattern: /\bAKIA[0-9A-Z]{16}\b/g,
	},
	{
		kind: "github-token",
		label: "GitHub token",
		pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9_]{20,}\b/g,
	},
	{
		kind: "github-token",
		label: "GitHub fine-grained token",
		pattern: /\bgithub_pat_[A-Za-z0-9_]{20,}\b/g,
	},
	{
		kind: "private-key",
		label: "Private key block",
		pattern: /-----BEGIN (?:RSA |OPENSSH |EC |DSA )?PRIVATE KEY-----/g,
	},
	{
		kind: "slack-token",
		label: "Slack token",
		pattern: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g,
	},
	{
		kind: "generic-api-key",
		label: "High-risk credential prefix",
		pattern: /\b(?:sk|rk)-[A-Za-z0-9]{20,}\b/g,
	},
];

export function scanForSecrets(text: string): SecretFinding[] {
	if (!text) {
		return [];
	}

	const findings: SecretFinding[] = [];
	const seen = new Set<string>();

	for (const rule of RULES) {
		rule.pattern.lastIndex = 0;
		for (const match of text.matchAll(rule.pattern)) {
			const value = match[0];
			const key = `${rule.kind}:${value}`;
			if (seen.has(key)) {
				continue;
			}
			seen.add(key);
			findings.push({
				kind: rule.kind,
				label: rule.label,
				redacted: redact(value),
			});
		}
	}

	return findings;
}

export function redact(value: string): string {
	if (value.length <= 8) {
		return "*".repeat(value.length);
	}
	return `${value.slice(0, 4)}…${value.slice(-2)}`;
}

export function summarizeFindings(findings: SecretFinding[]): {
	count: number;
	kinds: SecretKind[];
} {
	return {
		count: findings.length,
		kinds: [...new Set(findings.map((finding) => finding.kind))],
	};
}
