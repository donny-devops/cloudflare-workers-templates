# Cloudflare Workflows Starter Template

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/donny-devops/cloudflare-workers-templates)

<!-- dash-content-start -->

A real-time, interactive demonstration of [Cloudflare Workflows](https://developers.cloudflare.com/workflows) with live updates via WebSockets and Durable Objects. This template showcases durable multi-step workflows with time-based delays, event-driven pauses, and real-time status visualization.

<!-- dash-content-end -->

![Cloudflare Workflows Starter Template](https://imagedelivery.net/wSMYJvS3Xw-n339CbDyDIA/4380d39a-b907-437c-e784-500fcc10cb00/preview)

## Getting Started

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
```

### Deployment

```bash
npm run deploy
```

## Demo notes

This starter is a learning demo, not a production control plane:

- Workflow start, status, event, and WebSocket routes are unauthenticated.
- Treat instance IDs as capabilities; do not expose the Worker publicly without auth.
- Approval timeouts and other workflow failures now surface as an error state in the UI so you can start again.

## Learn More

- [Cloudflare Workflows Documentation](https://developers.cloudflare.com/workflows)
- [Durable Objects Documentation](https://developers.cloudflare.com/durable-objects)
- [Workers Documentation](https://developers.cloudflare.com/workers)
