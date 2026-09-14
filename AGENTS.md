# Agents for Cloudflare Workers Templates

This repository is a Cloudflare Workflows starter plus an operability layer
for health checks, signed webhooks, mailhooks, secret scanning, and MCP tools.

## Guardrails

- Never commit `.dev.vars`, `.env`, or live credentials.
- Persist only redacted inbox metadata. Raw webhook/mail bodies that match
  credential patterns must not be stored.
- Keep `WEBHOOK_SECRET` and `MAILHOOK_TOKEN` as Wrangler secrets.
- Prefer HMAC verification (`X-Webhook-Signature` or `X-Hub-Signature-256`)
  over shared query tokens.
- Do not add exploit PoCs, payload generators, or bypass recipes.

## Local commands

```bash
npm ci
npm run dev
npm test
npm run lint
npm run check
```

## MCP

The Worker exposes JSON-RPC at `POST /mcp`:

- `status_check`
- `scan_secrets`
- `list_inbox`
- `start_workflow`

See `.cursor/mcp.json.example` for a local Cursor config.

## Subagents

- `ops-sentry` — health, status, and inbox regressions
- `secret-guardian` — scanner coverage and secret hygiene
- `webhook-triage` — signature checks and ingress rate limits
