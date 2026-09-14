# Cloudflare Workflows Starter Template

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/cloudflare/templates/tree/main/workflows-starter-template)

<!-- dash-content-start -->

A real-time, interactive demonstration of [Cloudflare Workflows](https://developers.cloudflare.com/workflows) with live updates via WebSockets and Durable Objects. This template also includes an operability layer: health checks, HMAC-signed webhooks, mailhooks, secret scanning, and MCP tools for agents.

<!-- dash-content-end -->

![Cloudflare Workflows Starter Template](assets/template-screenshot.png)

## Getting Started

### Installation

```bash
npm install
cp .dev.vars.example .dev.vars
```

### Development

```bash
npm run dev
```

Visit `http://localhost:5173` to see the interactive demo. The header pill reports `/health` and `/api/status`.

### Quality gates

```bash
npm run lint
npm test
npm run build
```

### Deployment

```bash
npx wrangler secret put WEBHOOK_SECRET
npx wrangler secret put MAILHOOK_TOKEN
npm run deploy
```

## Operability APIs

| Route | Auth | Purpose |
| --- | --- | --- |
| `GET /health` | none | Liveness and binding checks |
| `GET /api/status` | none | Version, binding presence, redacted inbox stats |
| `GET /api/events` | none | Recent webhook/mailhook metadata (redacted) |
| `POST /api/scan` | none | Scan text for credential patterns; raw input is not stored |
| `POST /webhooks/:source` | HMAC-SHA256 | Signed webhook ingest |
| `POST /mailhooks` | Bearer `MAILHOOK_TOKEN` | HTTP mailhook ingest |
| `POST /mcp` | none | MCP JSON-RPC for agents |
| `GET /.well-known/mcp.json` | none | MCP discovery document |

Webhook signatures may be sent as `X-Webhook-Signature` or GitHub's `X-Hub-Signature-256`:

```bash
BODY='{"ok":true}'
SIG=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$WEBHOOK_SECRET" | awk '{print $2}')
curl -sS -X POST "http://localhost:5173/webhooks/github" \
  -H "content-type: application/json" \
  -H "X-Webhook-Signature: sha256=${SIG}" \
  --data "$BODY"
```

Inbound HTTP mailhooks are accepted at `POST /mailhooks` with a bearer token. Email Routing is an optional follow-up and is not part of this production worker.

The inbox reuses the existing `WorkflowStatusDO` sqlite class (`idFromName("global")`) as the event database. It stores metadata and redacted previews only. Matching credential patterns are counted, never persisted in raw form.

## MCP tools

`POST /mcp` implements JSON-RPC 2.0:

- `status_check`
- `scan_secrets`
- `list_inbox`
- `start_workflow`

Copy `.cursor/mcp.json.example` to `.cursor/mcp.json` for local Cursor, or see [`AGENTS.md`](AGENTS.md) for subagent roles.

## Security

See [`SECURITY.md`](SECURITY.md). CI runs lint/tests, Gitleaks, npm audit, and dependency review on pull requests.

## Learn More

- [Cloudflare Workflows Documentation](https://developers.cloudflare.com/workflows)
- [Durable Objects Documentation](https://developers.cloudflare.com/durable-objects)
- [Workers Documentation](https://developers.cloudflare.com/workers)
