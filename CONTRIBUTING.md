# Contributing to Cloudflare Workers Templates

Thank you for your interest in contributing! This document provides guidelines and steps for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Making Changes](#making-changes)
- [Submitting a Pull Request](#submitting-a-pull-request)
- [Style Guide](#style-guide)
- [Reporting Issues](#reporting-issues)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior via the channels listed in the Code of Conduct.

## Getting Started

1. **Fork** the repository
2. **Clone** your fork locally
3. **Create a branch** for your changes (`git checkout -b feature/my-feature`)
4. **Make your changes** and test locally
5. **Submit a Pull Request**

## Development Setup

### Prerequisites

- [Node.js](https://nodejs.org/) >= 20.19.0
- A [Cloudflare account](https://dash.cloudflare.com/sign-up) (for deployment testing)

### Installation

```bash
git clone https://github.com/<your-username>/cloudflare-workers-templates.git
cd cloudflare-workers-templates
npm install
```

### Local Development

```bash
npm run dev          # Start Vite dev server with Cloudflare plugin
```

Visit `http://localhost:5173` to see the app. Worker routes (including `GET /health`) are served by the same Vite + Wrangler plugin stack.

### Running Tests

```bash
npm test             # Run Vitest suite
npm run lint         # Run ESLint
npx tsc --noEmit     # Type check without emitting
```

## Making Changes

### Project Structure

```
├── src/                  # React frontend (Vite + Tailwind)
│   ├── components/       # React components
│   └── hooks/            # Custom React hooks
├── worker/               # Cloudflare Worker backend
│   ├── index.ts          # fetch routes (/health, /api/workflow/*, /ws) + scheduled()
│   ├── workflow.ts       # Workflow definition
│   ├── durable-object.ts # Durable Object for WebSocket state
│   └── validation.ts     # Input validation
├── test/                 # Vitest test files
├── wrangler.jsonc        # Wrangler configuration (workflows, DOs, daily cron)
└── vite.config.ts        # Vite configuration
```

### Key Guidelines

- **TypeScript** — All code must be written in TypeScript with strict type checking.
- **Testing** — Add or update tests for any logic changes. Run `npm test` before submitting.
- **No secrets** — Never commit API keys, tokens, or credentials. Use `.dev.vars` for local secrets (it's in `.gitignore`).
- **Security** — Review the [Security Policy](SECURITY.md) before making changes to request handling, authentication, or headers.
- **Cron** — `scheduled()` currently starts a workflow on `0 0 * * *`. Changes to that handler or `wrangler.jsonc` `triggers.crons` should be documented in the README.
- **Releases** — Use [Conventional Commits](https://www.conventionalcommits.org/); release-please on `main` cuts versions from `0.1.0`.

## Submitting a Pull Request

1. Ensure your branch is up to date with `main`:
   ```bash
   git fetch origin
   git rebase origin/main
   ```
2. Verify all checks pass:
   ```bash
   npm test && npm run lint && npx tsc --noEmit
   ```
3. Push your branch and open a PR against `main`.
4. Fill out the PR template completely.
5. Wait for CI checks and a maintainer review.

### Commit Messages

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add workflow retry logic
fix: handle WebSocket disconnect gracefully
docs: update deployment instructions
chore: bump wrangler to 4.128.0
```

## Style Guide

- **ESLint** — Follow the project's ESLint config (`eslint.config.js`). Run `npm run lint` to check.
- **Formatting** — Use tabs for indentation (matching the project's existing style).
- **Imports** — Use ES module syntax (`import`/`export`).
- **Naming** — Use `camelCase` for variables/functions, `PascalCase` for components/classes.

## Reporting Issues

- **Bugs** — Use the [Bug Report](https://github.com/donny-devops/cloudflare-workers-templates/issues/new?template=bug_report.yml) template.
- **Features** — Use the [Feature Request](https://github.com/donny-devops/cloudflare-workers-templates/issues/new?template=feature_request.yml) template.
- **Security** — See [SECURITY.md](SECURITY.md). **Do not** file public issues for vulnerabilities.
