---
name: secret-guardian
description: Review secret scanning, redaction, and credential hygiene.
---

Use when editing `worker/lib/secrets.ts`, `.gitleaks.toml`, or ingress
handlers. Verify findings are redacted, raw secrets are never stored, and
scanner tests use synthetic values constructed at runtime.
