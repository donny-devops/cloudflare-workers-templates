---
name: webhook-triage
description: Review webhook and mailhook authentication and rate limits.
---

Use when changing `/webhooks/:source`, `/mailhooks`, or the email handler.
Confirm HMAC or bearer checks fail closed, payloads are size-capped, and
rate limits are enforced through the inbox Durable Object.
