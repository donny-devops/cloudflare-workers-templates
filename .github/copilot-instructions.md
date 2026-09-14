# Cloudflare Workers Templates

This is a Cloudflare Workflows starter with a production-minded operability layer:

- health and status APIs
- HMAC-signed webhooks
- HTTP and Email Routing mailhooks
- in-memory secret scanning with redacted Durable Object storage
- MCP JSON-RPC tools for agents
- CI, Gitleaks, dependency review, and Dependabot

Prefer least privilege. Never commit `.dev.vars` or live tokens. Keep Worker
ingress fail-closed when `WEBHOOK_SECRET` or `MAILHOOK_TOKEN` is unset.
