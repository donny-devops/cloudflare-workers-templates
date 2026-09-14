---
name: webhook-triage
description: Review webhook and mailhook authentication and rate limits.
---

Use when changing `/webhooks/:source` or `/mailhooks`.
Confirm HMAC or bearer checks fail closed, payloads are size-capped, and
rate limits are enforced through the inbox storage on WorkflowStatusDO.
