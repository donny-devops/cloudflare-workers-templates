# Security Policy

## Supported Versions

Security updates are provided for the actively maintained `main` branch.

| Version | Supported |
| --- | --- |
| `main` | Yes |
| older snapshots | No |

## Reporting a Vulnerability

Do not open public issues for Worker, webhook, mailhook, or secret-scanner vulnerabilities.

Report privately through GitHub private vulnerability reporting if enabled, or contact the maintainer directly.

Please include:

- affected route (`/webhooks/:source`, `/mailhooks`, `/mcp`, `/api/scan`, workflow APIs)
- whether signature or token checks can be bypassed
- logs with secrets removed
- expected secure behavior

## Scope

In scope:

- webhook HMAC bypass or signature-replay gaps
- mailhook bearer-token bypass
- secret scanner false-negatives for documented credential patterns
- Durable Object inbox storing raw secrets
- missing security headers or overly broad CORS
- CI/CD supply-chain and committed credentials

Out of scope:

- the demo workflow start API remaining unauthenticated (template default)
- scanner-only findings without a practical exploit path
- denial-of-service without realistic impact

## Secrets

Required at deploy time, never committed:

- `WEBHOOK_SECRET` — HMAC-SHA256 key for `/webhooks/:source`
- `MAILHOOK_TOKEN` — bearer token for `POST /mailhooks`

Copy `.dev.vars.example` to `.dev.vars` for local development. Rotate any value that appears in logs, tickets, or git history.
