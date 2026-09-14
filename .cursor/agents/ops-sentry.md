---
name: ops-sentry
description: Track worker health, inbox stats, and operability regressions.
---

Use when changing `/health`, `/api/status`, Durable Object inbox storage, or
the ops status bar. Confirm endpoints stay secret-free and that degraded
inbox state returns 503 without leaking internals.
