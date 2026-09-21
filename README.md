# Cloudflare Workflows Starter Template

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/donny-devops/cloudflare-workers-templates)

<!-- dash-content-start -->

A real-time, interactive demonstration of [Cloudflare Workflows](https://developers.cloudflare.com/workflows) with live updates via WebSockets and Durable Objects. This template showcases durable multi-step workflows with time-based delays, event-driven pauses, and real-time status visualization.

<!-- dash-content-end -->

![Cloudflare Workflows Starter Template](https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/4380d39a-b907-437c-e784-500fcc10cb00/preview)

## Getting Started

### Prerequisites

- Node.js `>=20.19.0` (see `package.json` `engines`)
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) for deploy

### Installation

```bash
npm install
```

### Development

```bash
npm run dev
```

Visit `http://localhost:5173` to see the interactive demo.

### Test and lint

```bash
npm test
npm run lint
npx tsc --noEmit
```

### Deployment

```bash
npm run deploy
```

That runs `npm run build` (`tsc -b && vite build`) then `wrangler deploy`. `npm run check` is `tsc && wrangler deploy --dry-run`.

## Worker HTTP routes

Handled in `worker/index.ts`. These routes are **unauthenticated**:

| Method | Path | Behavior |
| --- | --- | --- |
| `POST` | `/api/workflow/start` | `env.MY_WORKFLOW.create({ params: { timestamp } })` |
| `GET` | `/api/workflow/status/:id` | `instance.status()`; `404` if the instance is missing |
| `POST` | `/api/workflow/event/:id` | JSON approval payload → `sendEvent({ type: "user-approval" })` |
| `GET` | `/ws?instanceId=` | WebSocket upgrade via Durable Object `WORKFLOW_STATUS` |
| `GET` | `/health` | `{ status: "healthy", service: "cloudflare-workers-templates", timestamp }` |

Unknown paths return `{ error: "Not Found" }` with status `404`. Wrong methods return `405` with `Allow`.

## Scheduled trigger

`wrangler.jsonc` sets `triggers.crons` to `0 0 * * *` (daily 00:00 UTC). The Worker `scheduled()` handler starts a new workflow instance with `{ timestamp: Date.now() }`. That is an example stub; once deployed it will create a workflow every day.

## Docker (GHCR)

- Multi-stage `Dockerfile` uses **`node:20-slim`** (Debian/glibc). Alpine/musl breaks `workerd` and `sharp`.
- Build stage installs `python3`, `make`, and `g++` for native modules; production copies `node_modules` from the build stage (no second `npm ci`).
- The image listens on **8787** via `npx wrangler dev --port 8787` as `appuser`.
- `.github/workflows/docker-publish.yml` builds on `main`, `v*` tags, published GitHub releases, and `workflow_dispatch`, then pushes to `ghcr.io/<owner>/cloudflare-workers-templates` with SLSA provenance.

## Releases

Pushing to `main` runs [release-please](https://github.com/googleapis/release-please) (`release-type: node`). The starting version is `0.1.0` in `package.json` and `.release-please-manifest.json`. Conventional Commits drive the changelog and GitHub releases.

## Demo notes

This starter is a learning demo, not a production control plane:

- Workflow start, status, event, WebSocket, and health routes are unauthenticated.
- Treat instance IDs as capabilities; do not expose the Worker publicly without auth.
- Approval timeouts and other workflow failures now surface as an error state in the UI so you can start again.
- The daily cron creates workflow instances with no extra auth or rate limit.

## Learn More

- [Cloudflare Workflows Documentation](https://developers.cloudflare.com/workflows)
- [Durable Objects Documentation](https://developers.cloudflare.com/durable-objects)
- [Workers Documentation](https://developers.cloudflare.com/workers)
